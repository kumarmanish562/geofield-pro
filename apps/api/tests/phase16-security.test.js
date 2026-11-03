import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    assignment: { findFirst: vi.fn() },
    village: { findFirst: vi.fn() },
    syncEvent: { findUnique: vi.fn() },
    survey: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    surveyAttachment: { findUnique: vi.fn() },
    syncHistory: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../src/database/prisma.js", () => ({ prisma: prismaMock }));

import { syncAttachment, syncSurvey } from "../src/modules/sync/sync.service.js";
import { errorHandler } from "../src/middleware/error-handler.js";

const actor = {
  userId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  role: "EMPLOYEE",
};
const surveyInput = {
  clientSurveyId: "33333333-3333-4333-8333-333333333333",
  clientEventId: "44444444-4444-4444-8444-444444444444",
  version: 1,
  surveyData: {
    assignmentId: "55555555-5555-4555-8555-555555555555",
    villageId: "66666666-6666-4666-8666-666666666666",
    gatNumber: "G-1",
  },
};

describe("Phase 16 security regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.assignment.findFirst.mockResolvedValue({ id: surveyInput.surveyData.assignmentId });
    prismaMock.village.findFirst.mockResolvedValue({ id: surveyInput.surveyData.villageId });
  });

  it("rejects a foreign employee's duplicate event without looking up their survey", async () => {
    prismaMock.syncEvent.findUnique.mockResolvedValue({
      employeeId: "77777777-7777-4777-8777-777777777777",
      entityId: surveyInput.clientSurveyId,
      payloadHash: "foreign-hash",
      status: "PROCESSED",
    });

    await expect(syncSurvey(actor, surveyInput)).rejects.toMatchObject({
      statusCode: 409,
      code: "SYNC_EVENT_REUSED",
    });
    expect(prismaMock.survey.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.survey.update).not.toHaveBeenCalled();
  });

  it("rejects a foreign employee's survey identifier before updating it", async () => {
    prismaMock.syncEvent.findUnique.mockResolvedValue(null);
    prismaMock.survey.findUnique.mockResolvedValue({
      id: "88888888-8888-4888-8888-888888888888",
      employeeId: "77777777-7777-4777-8777-777777777777",
      organizationId: "99999999-9999-4999-8999-999999999999",
      serverVersion: 1,
    });

    await expect(syncSurvey(actor, surveyInput)).rejects.toMatchObject({
      statusCode: 409,
      code: "SURVEY_ID_REUSED",
    });
    expect(prismaMock.survey.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate event IDs reused with different payloads", async () => {
    prismaMock.syncEvent.findUnique.mockResolvedValue({
      employeeId: actor.userId,
      entityId: surveyInput.clientSurveyId,
      payloadHash: "different-payload-hash",
      status: "PROCESSED",
    });

    await expect(syncSurvey(actor, surveyInput)).rejects.toMatchObject({
      statusCode: 409,
      code: "SYNC_EVENT_REUSED",
    });
    expect(prismaMock.survey.findFirst).not.toHaveBeenCalled();
  });

  it("does not reveal an attachment bound to another survey or employee", async () => {
    const otherSurveyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    prismaMock.survey.findFirst.mockResolvedValue({ id: surveyInput.surveyData.assignmentId });
    prismaMock.surveyAttachment.findUnique.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      surveyId: otherSurveyId,
      uploadedBy: "77777777-7777-4777-8777-777777777777",
    });

    await expect(syncAttachment(actor, {
      clientAttachmentId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      surveyId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      clientEventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      originalFileName: "photo.jpg",
      mimeType: "image/jpeg",
      fileSize: 10,
    })).rejects.toMatchObject({ statusCode: 409, code: "ATTACHMENT_ID_REUSED" });
  });

  it("logs safe error metadata without serializing malformed body contents", () => {
    const log = { error: vi.fn() };
    const response = {
      headersSent: false,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    const secretBody = "password=synthetic-secret";
    const error = new SyntaxError(secretBody);
    error.status = 400;
    error.body = secretBody;

    errorHandler(error, { id: "request-id", log }, response, vi.fn());

    expect(JSON.stringify(log.error.mock.calls)).not.toContain(secretBody);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "MALFORMED_JSON", statusCode: 400 }),
      "Request failed",
    );
    expect(response.body.error.code).toBe("MALFORMED_JSON");
  });
});
