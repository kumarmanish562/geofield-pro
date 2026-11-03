import { beforeEach, describe, expect, it } from "vitest";
import {
  getDrafts,
  getPendingQueue,
  setOfflineOwner,
  enqueueSurvey,
} from "./offlineStore.web.js";

describe("offline account isolation", () => {
  beforeEach(() => setOfflineOwner(null));

  it("requires an authenticated owner before reading local drafts", () => {
    expect(() => getDrafts()).toThrow("authenticated account");
  });

  it("keeps offline survey drafts and sync queue scoped to each account", () => {
    setOfflineOwner("employee-a");
    enqueueSurvey({ answer: "A" });
    setOfflineOwner("employee-b");
    enqueueSurvey({ answer: "B" });
    expect(getDrafts().map((draft) => draft.payload.answer)).toEqual(["B"]);
    expect(getPendingQueue()).toHaveLength(1);
    setOfflineOwner("employee-a");
    expect(getDrafts().map((draft) => draft.payload.answer)).toEqual(["A"]);
    expect(getPendingQueue()).toHaveLength(1);
  });
});
