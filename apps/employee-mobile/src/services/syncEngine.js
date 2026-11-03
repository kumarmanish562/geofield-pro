import { syncOfflineSurvey } from "./apiClient.js";
import {
  addSyncHistory,
  getPendingQueue,
  markDraftStatus,
  updateQueueItem,
} from "./offlineStore";

let running = false;

export async function synchronizeOfflineData() {
  if (running) return { synchronized: 0, skipped: true };
  running = true;
  let synchronized = 0;
  try {
    for (const item of getPendingQueue()) {
      const attempt = item.retry_count + 1;
      try {
        updateQueueItem(item.id, "SYNCING", null, attempt);
        const response = await syncOfflineSurvey(item.payload);
        const result = response.data;
        const status = result.status === "CONFLICT" ? "CONFLICT" : "SYNCED";
        markDraftStatus(
          item.entity_id,
          status,
          result.serverVersion ?? 1,
          result.surveyId ?? null,
        );
        updateQueueItem(
          item.id,
          status === "SYNCED" ? "SYNCED" : "FAILED",
          status === "SYNCED" ? null : "Server conflict",
          attempt,
        );
        addSyncHistory({
          entityId: item.entity_id,
          entityType: item.entity_type,
          operation: item.operation,
          attemptNumber: attempt,
          result: status,
          serverResponse: result,
        });
        if (status === "SYNCED") synchronized += 1;
      } catch (error) {
        const permanent = [
          "SYNC_VALIDATION_FAILED",
          "UNAUTHORIZED_ASSIGNMENT",
          "UNAUTHORIZED_VILLAGE",
          "SYNC_CONFLICT",
        ].includes(error.code);
        updateQueueItem(
          item.id,
          permanent ? "FAILED" : "FAILED",
          error.message,
          attempt,
        );
        markDraftStatus(item.entity_id, permanent ? "FAILED" : "PENDING_SYNC");
        addSyncHistory({
          entityId: item.entity_id,
          entityType: item.entity_type,
          operation: item.operation,
          attemptNumber: attempt,
          result: "FAILED",
          errorMessage: error.message,
        });
      }
    }
    return { synchronized };
  } finally {
    running = false;
  }
}
