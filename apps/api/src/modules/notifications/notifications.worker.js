import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { createNotificationsForUsers, processDeliveryBatch } from "./notifications.service.js";

let timer;
let running = false;
function log(level, message, details = {}) { console[level](JSON.stringify({ level, message, ...details })); }

async function createDeadlineReminders() {
  const intervals = env.NOTIFICATION_DEADLINE_REMINDER_DAYS.split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0 && value <= 30);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (const days of intervals) {
    const dueDate = new Date(today); dueDate.setUTCDate(dueDate.getUTCDate() + days);
    let skip = 0;
    while (true) {
      const assignments = await prisma.assignment.findMany({ where: { status: "PUBLISHED", dueDate }, select: { id: true, organizationId: true, name: true, employees: { select: { employeeId: true, employee: { select: { status: true } } } } }, take: env.NOTIFICATION_BATCH_SIZE, skip, orderBy: { id: "asc" } });
      for (const assignment of assignments) {
      await prisma.$transaction(async (tx) => createNotificationsForUsers(tx, {
        organizationId: assignment.organizationId,
        eventType: "ASSIGNMENT_DEADLINE_APPROACHING",
        title: "Assignment deadline approaching",
        body: `${assignment.name} is due in ${days} day${days === 1 ? "" : "s"}.`,
        resourceType: "ASSIGNMENT",
        resourceId: assignment.id,
        actionUrl: `/assignments/${assignment.id}`,
        metadata: { reminderDays: days },
        dedupeKey: `assignment:${assignment.id}:deadline:${days}d`,
      }, assignment.employees.filter((member) => member.employee.status === "ACTIVE").map((member) => member.employeeId)));
      }
      if (assignments.length < env.NOTIFICATION_BATCH_SIZE) break;
      skip += assignments.length;
    }
  }
}

async function runCycle() {
  if (running) return;
  running = true;
  try {
    await createDeadlineReminders();
    const result = await processDeliveryBatch({ pushEnabled: env.NOTIFICATION_PUSH_ENABLED, expoApiUrl: env.EXPO_PUSH_API_URL, expoAccessToken: env.EXPO_ACCESS_TOKEN, batchSize: env.NOTIFICATION_BATCH_SIZE, maxAttempts: env.NOTIFICATION_MAX_ATTEMPTS, retryBaseDelayMs: env.NOTIFICATION_RETRY_BASE_DELAY_MS });
    if (result.claimed) log("info", "Notification delivery batch processed", result);
  } catch (error) {
    log("error", "Notification worker cycle failed", { error: error.message });
  } finally { running = false; }
}

export function startNotificationWorker() {
  if (timer) return stopNotificationWorker;
  timer = setInterval(runCycle, env.NOTIFICATION_WORKER_INTERVAL_MS);
  timer.unref?.();
  void runCycle();
  log("info", "Notification worker started", { intervalMs: env.NOTIFICATION_WORKER_INTERVAL_MS, pushEnabled: env.NOTIFICATION_PUSH_ENABLED });
  return stopNotificationWorker;
}
export function stopNotificationWorker() { if (timer) clearInterval(timer); timer = undefined; }
