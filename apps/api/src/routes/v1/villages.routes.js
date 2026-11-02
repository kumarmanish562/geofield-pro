import { Router } from "express";
import { authenticate, authorize } from "../../modules/auth/auth.middleware.js";
import { coordinateSchema, importSchema, intersectionSchema, villageCreateSchema, villageListSchema, villageUpdateSchema } from "../../modules/villages/village.schemas.js";
import { createVillage, exportVillage, exportVillages, findIntersectingVillages, findVillageAtPoint, getVillage, importGeoJson, listImports, listVillages, updateVillage } from "../../modules/villages/village.service.js";

const router = Router();
function handle(handler) { return async (req, res, next) => { try { return await handler(req, res); } catch (error) { return next(error); } }; }
function invalid(res, req, parsed, message) { return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues }, requestId: req.id }); }
router.use(authenticate);
router.get("/", handle(async (req, res) => { const parsed = villageListSchema.safeParse(req.query); if (!parsed.success) return invalid(res, req, parsed, "Village filters are invalid."); return res.json({ success: true, data: await listVillages(req.auth, parsed.data), requestId: req.id }); }));
router.post("/", authorize("ADMIN", "GIS_ANALYST"), handle(async (req, res) => { const parsed = villageCreateSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Village details are invalid."); const { geometry, ...data } = parsed.data; return res.status(201).json({ success: true, data: await createVillage(req.auth, data, geometry, req), requestId: req.id }); }));
router.get("/imports", authorize("ADMIN", "GIS_ANALYST"), handle(async (req, res) => res.json({ success: true, data: await listImports(req.auth), requestId: req.id })));
router.post("/imports/geojson", authorize("ADMIN", "GIS_ANALYST"), handle(async (req, res) => { const parsed = importSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "GeoJSON import payload is invalid."); return res.status(201).json({ success: true, data: await importGeoJson(req.auth, parsed.data, req), requestId: req.id }); }));
router.get("/spatial/point", handle(async (req, res) => { const parsed = coordinateSchema.safeParse(req.query); if (!parsed.success) return invalid(res, req, parsed, "Coordinates are invalid."); return res.json({ success: true, data: await findVillageAtPoint(req.auth, parsed.data), requestId: req.id }); }));
router.post("/spatial/intersections", handle(async (req, res) => { const parsed = intersectionSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Spatial geometry is invalid."); return res.json({ success: true, data: await findIntersectingVillages(req.auth, parsed.data.geojson), requestId: req.id }); }));
router.get("/export", handle(async (req, res) => { const parsed = villageListSchema.safeParse(req.query); if (!parsed.success) return invalid(res, req, parsed, "Village filters are invalid."); return res.type("application/geo+json").json(await exportVillages(req.auth, parsed.data)); }));
router.get("/:id/export", handle(async (req, res) => res.type("application/geo+json").json(await exportVillage(req.auth, req.params.id))));
router.get("/:id", handle(async (req, res) => res.json({ success: true, data: await getVillage(req.auth, req.params.id), requestId: req.id })));
router.patch("/:id", authorize("ADMIN", "GIS_ANALYST"), handle(async (req, res) => { const parsed = villageUpdateSchema.safeParse(req.body); if (!parsed.success) return invalid(res, req, parsed, "Village update is invalid."); return res.json({ success: true, data: await updateVillage(req.auth, req.params.id, parsed.data, req), requestId: req.id }); }));
export default router;
