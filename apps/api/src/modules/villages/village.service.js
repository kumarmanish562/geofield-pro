import { randomUUID } from "node:crypto";
import { prisma } from "../../database/prisma.js";
import { AuthError } from "../auth/auth.service.js";

const managerRoles = ["ADMIN", "GIS_ANALYST"];
const employeeRoles = ["ADMIN", "SUPERVISOR", "GIS_ANALYST", "EMPLOYEE"];
const MAX_FEATURES = 1000;

function fail(message, status, code) { throw new AuthError(message, status, code); }
function ensureManager(actor) {
  if (!managerRoles.includes(actor.role)) fail("You cannot manage village boundaries.", 403, "VILLAGE_FORBIDDEN");
}
function ensureViewer(actor) {
  if (!employeeRoles.includes(actor.role)) fail("You cannot view villages.", 403, "VILLAGE_FORBIDDEN");
}
function geometryFeatures(input) {
  if (!input || typeof input !== "object") fail("A GeoJSON object is required.", 400, "INVALID_GEOJSON");
  if (input.type === "FeatureCollection") return input.features;
  if (input.type === "Feature") return [input];
  fail("Only FeatureCollection and Feature GeoJSON are supported.", 400, "INVALID_GEOJSON");
}
function validateGeometry(feature) {
  const geometry = feature?.geometry;
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
    return "Geometry must be Polygon or MultiPolygon.";
  }
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) return "Geometry coordinates are empty.";
  const coordinates = JSON.stringify(geometry.coordinates);
  const values = coordinates.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  for (let index = 0; index < values.length; index += 2) {
    if (values[index] < -180 || values[index] > 180 || values[index + 1] < -90 || values[index + 1] > 90) return "Coordinates must use [longitude, latitude] within WGS84 bounds.";
  }
  return null;
}
function props(feature) {
  return feature.properties ?? {};
}
function featureData(feature, index) {
  const error = validateGeometry(feature);
  const properties = props(feature);
  const name = properties.name ?? properties.villageName ?? properties.village_name;
  const code = properties.code ?? properties.villageCode ?? properties.village_code;
  if (error) return { error: { feature: index + 1, message: error } };
  if (typeof name !== "string" || !name.trim() || typeof code !== "string" || !code.trim()) return { error: { feature: index + 1, message: "Village name and code properties are required." } };
  return { name: name.trim(), code: code.trim(), state: properties.state ?? null, district: properties.district ?? null, taluka: properties.taluka ?? properties.block ?? null, geometry: feature.geometry, metadata: properties };
}
async function boundary(id, organizationId) {
  const rows = await prisma.$queryRaw`SELECT ST_AsGeoJSON(boundary)::json AS geometry, ST_GeometryType(boundary) AS geometry_type, ST_IsValid(boundary) AS valid, ST_SRID(boundary) AS srid, ST_IsEmpty(boundary) AS empty FROM villages WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid`;
  return rows[0] ?? null;
}
function publicVillage(village, shape) {
  return { ...village, boundary: shape ? { type: "Feature", geometry: shape.geometry, properties: { id: village.id, name: village.name, code: village.code } } : null, geometryType: shape?.geometry_type ?? null, geometryValid: shape?.valid ?? false, srid: shape?.srid ?? 4326 };
}

export async function listVillages(actor, filters) {
  ensureViewer(actor);
  const where = { organizationId: actor.organizationId, ...(filters.status ? { status: filters.status } : {}), ...(filters.district ? { district: filters.district } : {}), ...(filters.taluka ? { taluka: filters.taluka } : {}), ...(filters.search ? { OR: [{ name: { contains: filters.search, mode: "insensitive" } }, { code: { contains: filters.search, mode: "insensitive" } }] } : {}) };
  if (actor.role === "EMPLOYEE") {
    const assignments = await prisma.assignmentEmployee.findMany({ where: { employeeId: actor.userId, assignment: { organizationId: actor.organizationId } }, select: { assignment: { select: { workArea: true } } } });
    const areas = assignments.map((item) => item.assignment.workArea).filter(Boolean);
    if (!areas.length) return { items: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0, totalPages: 0 } };
    where.OR = [{ code: { in: areas } }, { name: { in: areas } }];
  }
  const skip = (filters.page - 1) * filters.pageSize;
  const [items, total] = await prisma.$transaction([prisma.village.findMany({ where, orderBy: { name: "asc" }, skip, take: filters.pageSize }), prisma.village.count({ where })]);
  return { items, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}
export async function getVillage(actor, id) {
  ensureViewer(actor);
  const listed = await listVillages(actor, { page: 1, pageSize: 100, search: undefined });
  const allowed = listed.items.find((item) => item.id === id);
  if (!allowed) fail("Village not found.", 404, "VILLAGE_NOT_FOUND");
  return publicVillage(allowed, await boundary(id, actor.organizationId));
}
export async function createVillage(actor, data, geometry = null, req) {
  ensureManager(actor);
  const village = await prisma.village.create({ data: { organizationId: actor.organizationId, name: data.name, code: data.code, state: data.state ?? null, district: data.district ?? null, taluka: data.taluka ?? null, status: data.status ?? "ACTIVE", metadata: data.metadata ?? {}, createdById: actor.userId, updatedById: actor.userId } });
  if (geometry) await saveGeometry(village.id, actor.organizationId, geometry);
  await audit(actor, "VILLAGE_CREATED", village.id, req);
  return getVillage(actor, village.id);
}
export async function updateVillage(actor, id, data, req) {
  ensureManager(actor);
  const existing = await prisma.village.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!existing) fail("Village not found.", 404, "VILLAGE_NOT_FOUND");
  const village = await prisma.village.update({ where: { id }, data: { ...data, updatedById: actor.userId } });
  await audit(actor, "VILLAGE_UPDATED", id, req);
  return publicVillage(village, await boundary(id, actor.organizationId));
}
export async function saveGeometry(id, organizationId, geometry, db = prisma) {
  const result = await db.$queryRaw`SELECT ST_IsValid(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326))) AS valid, ST_IsEmpty(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326))) AS empty`;
  if (!result[0]?.valid || result[0]?.empty) fail("The boundary geometry is invalid or empty.", 400, "INVALID_GEOMETRY");
  await db.$executeRaw`UPDATE villages SET boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometry)}), 4326)), updated_at = CURRENT_TIMESTAMP WHERE id = ${id}::uuid AND organization_id = ${organizationId}::uuid`;
}
async function audit(actor, event, targetId, req) {
  await prisma.auditLog.create({ data: { organizationId: actor.organizationId, actorUserId: actor.userId, event, targetType: "VILLAGE", targetId, ipAddress: req?.ip?.slice(0, 45) ?? null } });
}
export async function importGeoJson(actor, input, req) {
  ensureManager(actor);
  const features = geometryFeatures(input.geojson);
  if (features.length === 0 || features.length > MAX_FEATURES) fail(`The import must contain between 1 and ${MAX_FEATURES} features.`, 400, "IMPORT_LIMIT_EXCEEDED");
  const parsed = features.map(featureData);
  const errors = parsed.filter((item) => item.error).map((item) => item.error);
  const valid = parsed.filter((item) => !item.error);
  const codes = new Set();
  for (const item of valid) {
    if (codes.has(item.code)) errors.push({ feature: item.code, message: "Duplicate village code in import." });
    codes.add(item.code);
  }
  const importRecord = await prisma.villageImport.create({ data: { organizationId: actor.organizationId, initiatedById: actor.userId, filename: input.filename, format: "GEOJSON", totalFeatures: features.length, rejectedFeatures: errors.length, errorSummary: errors } });
  if (errors.length || valid.length === 0) {
    return prisma.villageImport.update({ where: { id: importRecord.id }, data: { status: "FAILED", completedAt: new Date() } });
  }
  const createdIds = [];
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of valid) {
        const village = await tx.village.upsert({ where: { organizationId_code: { organizationId: actor.organizationId, code: item.code } }, update: { name: item.name, state: item.state, district: item.district, taluka: item.taluka, metadata: item.metadata, updatedById: actor.userId }, create: { organizationId: actor.organizationId, name: item.name, code: item.code, state: item.state, district: item.district, taluka: item.taluka, metadata: item.metadata, createdById: actor.userId, updatedById: actor.userId } });
        await saveGeometry(village.id, actor.organizationId, item.geometry, tx);
        createdIds.push(village.id);
      }
    });
    return prisma.villageImport.update({ where: { id: importRecord.id }, data: { status: "COMPLETED", acceptedFeatures: valid.length, completedAt: new Date(), errorSummary: [], } }).then((result) => ({ ...result, villageIds: createdIds }));
  } catch (error) {
    await prisma.villageImport.update({ where: { id: importRecord.id }, data: { status: "FAILED", errorSummary: [{ message: error.message }], completedAt: new Date() } });
    throw error;
  }
}
export async function exportVillage(actor, id) {
  const item = await getVillage(actor, id);
  if (!item.boundary) fail("This village has no boundary.", 404, "BOUNDARY_NOT_FOUND");
  return item.boundary;
}
export async function exportVillages(actor, filters) {
  const result = await listVillages(actor, { ...filters, page: 1, pageSize: 100 });
  const features = [];
  for (const item of result.items) {
    const shape = await boundary(item.id, actor.organizationId);
    if (shape?.geometry) features.push({ type: "Feature", geometry: shape.geometry, properties: { name: item.name, code: item.code, district: item.district, taluka: item.taluka } });
  }
  return { type: "FeatureCollection", features };
}
export async function findVillageAtPoint(actor, coordinates) {
  ensureViewer(actor);
  const rows = await prisma.$queryRaw`SELECT id, name, code, state, district, taluka FROM villages WHERE organization_id = ${actor.organizationId}::uuid AND status = 'ACTIVE' AND boundary IS NOT NULL AND ST_Covers(boundary, ST_SetSRID(ST_MakePoint(${coordinates.longitude}, ${coordinates.latitude}), 4326)) LIMIT 10`;
  return rows;
}
export async function findIntersectingVillages(actor, geojson) {
  ensureViewer(actor);
  if (!geojson || !["Polygon", "MultiPolygon", "LineString", "MultiLineString", "Point"].includes(geojson.type)) fail("Only supported GeoJSON spatial geometries may be queried.", 400, "INVALID_SPATIAL_GEOMETRY");
  const rows = await prisma.$queryRaw`SELECT id, name, code, state, district, taluka FROM villages WHERE organization_id = ${actor.organizationId}::uuid AND status = 'ACTIVE' AND boundary IS NOT NULL AND ST_Intersects(boundary, ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geojson)}), 4326)) LIMIT 100`;
  return rows;
}
export async function listImports(actor) {
  ensureManager(actor);
  return prisma.villageImport.findMany({ where: { organizationId: actor.organizationId }, orderBy: { startedAt: "desc" }, take: 100 });
}
