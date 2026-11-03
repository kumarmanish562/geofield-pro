import { describe, expect, it } from "vitest";
import { reportFilterSchema } from "../src/modules/reports/reports.schemas.js";
import { toCsv, toExcelXml } from "../src/modules/reports/reports.service.js";
import { requiredCommentSchema } from "../src/modules/survey-reviews/survey-reviews.schemas.js";

describe("Phase 13 validation and exports", () => {
  it("rejects inverted report date ranges", () => {
    const result = reportFilterSchema.safeParse({ startDate: "2026-11-03", endDate: "2026-11-02" });
    expect(result.success).toBe(false);
  });

  it("requires correction and rejection comments", () => {
    expect(requiredCommentSchema.safeParse({ comments: "" }).success).toBe(false);
    expect(requiredCommentSchema.safeParse({ comments: "Please update GPS accuracy." }).success).toBe(true);
  });

  it("neutralizes spreadsheet formulas in CSV and Excel output", () => {
    const rows = [{ surveyId: "=HYPERLINK(\"https://example.com\")", employee: "+employee", employeeId: "E-1", village: "Village", villageCode: "V", assignment: "A", gatNumber: "1", plotNumber: "", status: "APPROVED", submissionDate: "", reviewer: "@reviewer", reviewDate: "" }];
    const csv = toCsv(rows);
    const excel = toExcelXml(rows, { total: 1, approved: 1, pending: 0, rejected: 0, correctionRequired: 0, villageWise: [], employeeWise: [] });
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+employee");
    expect(excel).toContain("'@reviewer");
  });
});
