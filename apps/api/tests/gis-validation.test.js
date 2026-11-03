import { describe, expect, it } from "vitest";
import { validateGeoJsonGeometry } from "../src/modules/villages/village.service.js";

const polygon = {
  type: "Polygon",
  coordinates: [[[79, 21], [80, 21], [80, 22], [79, 22], [79, 21]]],
};

describe("GIS GeoJSON structural validation", () => {
  it("accepts a closed WGS84 polygon with longitude then latitude", () => {
    expect(validateGeoJsonGeometry(polygon)).toBeNull();
  });

  it("rejects out-of-range, non-finite, and malformed positions", () => {
    expect(validateGeoJsonGeometry({
      type: "Point",
      coordinates: [181, 21],
    }, ["Point"])).toMatch(/valid, bounded/);
    expect(validateGeoJsonGeometry({
      type: "Point",
      coordinates: [79, Number.POSITIVE_INFINITY],
    }, ["Point"])).toMatch(/valid, bounded/);
    expect(validateGeoJsonGeometry({
      type: "LineString",
      coordinates: [[79, 21], [80]],
    }, ["LineString"])).toMatch(/valid, bounded/);
  });

  it("rejects unclosed or undersized polygon rings", () => {
    expect(validateGeoJsonGeometry({
      type: "Polygon",
      coordinates: [[[79, 21], [80, 21], [80, 22], [79, 22]]],
    })).toMatch(/valid, bounded/);
    expect(validateGeoJsonGeometry({
      type: "Polygon",
      coordinates: [[[79, 21], [80, 21], [79, 21]]],
    })).toMatch(/valid, bounded/);
  });

  it("rejects geometry types outside the operation allowlist", () => {
    expect(validateGeoJsonGeometry({
      type: "GeometryCollection",
      geometries: [],
    })).toMatch(/valid, bounded/);
  });
});
