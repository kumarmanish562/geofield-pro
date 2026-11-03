import { Router } from "express";
import { authenticate, authorize } from "../auth/auth.middleware.js";
import { notificationListSchema, preferenceSchema, preferenceBatchSchema, pushDeviceSchema, uuidParamSchema } from "./notifications.schemas.js";
import { adminOverview, deleteNotification, getNotification, getPreferences, listNotifications, markAllNotificationsRead, markNotificationRead, markNotificationUnread, registerPushDevice, listPushDevices, removePushDevice, unreadCount, updatePreference, updatePreferences } from "./notifications.service.js";

const router = Router();
const handle = (fn) => async (req, res, next) => { try { return await fn(req, res); } catch (error) { return next(error); } };
const respond = (req, res, data, status = 200) => res.status(status).json({ success: true, data, requestId: req.id });
const invalid = (req, res, parsed, message = "Notification request is invalid.") => res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message, details: parsed.error.issues }, requestId: req.id });
const validId = (req, res, next) => { const parsed = uuidParamSchema.safeParse(req.params.id); if (!parsed.success) return invalid(req, res, parsed, "Notification id is invalid."); return next(); };

router.use(authenticate);
router.get("/", handle(async (req, res) => { const parsed = notificationListSchema.safeParse(req.query); if (!parsed.success) return invalid(req, res, parsed); return respond(req, res, await listNotifications(req.auth, parsed.data)); }));
router.get("/unread-count", handle(async (req, res) => respond(req, res, { unreadCount: await unreadCount(req.auth) })));
router.post("/read-all", handle(async (req, res) => respond(req, res, await markAllNotificationsRead(req.auth))));
router.patch("/read-all", handle(async (req, res) => respond(req, res, await markAllNotificationsRead(req.auth))));
router.get("/:id", validId, handle(async (req, res) => respond(req, res, await getNotification(req.auth, req.params.id))));
router.patch("/:id/read", validId, handle(async (req, res) => respond(req, res, await markNotificationRead(req.auth, req.params.id))));
router.patch("/:id/unread", validId, handle(async (req, res) => respond(req, res, await markNotificationUnread(req.auth, req.params.id))));
router.delete("/:id", validId, handle(async (req, res) => respond(req, res, await deleteNotification(req.auth, req.params.id))));

export const preferencesRouter = Router();
preferencesRouter.use(authenticate);
preferencesRouter.get("/", handle(async (req, res) => respond(req, res, await getPreferences(req.auth))));
preferencesRouter.put("/", handle(async (req, res) => { const parsed = preferenceBatchSchema.safeParse(req.body); if (!parsed.success) return invalid(req, res, parsed, "Notification preferences are invalid."); return respond(req, res, await updatePreferences(req.auth, parsed.data)); }));
preferencesRouter.get("/:type", handle(async (req, res) => { const result = await getPreferences(req.auth); const item = result.find((preference) => preference.eventType === req.params.type); return item ? respond(req, res, item) : res.status(404).json({ success: false, error: { code: "PREFERENCE_NOT_FOUND", message: "Notification preference not found." }, requestId: req.id }); }));
preferencesRouter.put("/:type", handle(async (req, res) => { const parsed = preferenceSchema.safeParse(req.body); if (!parsed.success) return invalid(req, res, parsed, "Notification preference is invalid."); return respond(req, res, await updatePreference(req.auth, req.params.type, parsed.data)); }));

export const pushDevicesRouter = Router();
pushDevicesRouter.use(authenticate);
pushDevicesRouter.get("/", handle(async (req, res) => respond(req, res, await listPushDevices(req.auth))));
pushDevicesRouter.post("/register", handle(async (req, res) => { const parsed = pushDeviceSchema.safeParse(req.body); if (!parsed.success) return invalid(req, res, parsed, "Push device details are invalid."); return respond(req, res, await registerPushDevice(req.auth, parsed.data), 201); }));
pushDevicesRouter.delete("/:id", validId, handle(async (req, res) => respond(req, res, await removePushDevice(req.auth, req.params.id))));

export const adminNotificationsRouter = Router();
adminNotificationsRouter.use(authenticate, authorize("ADMIN", "SUPERVISOR"));
adminNotificationsRouter.get("/overview", handle(async (req, res) => respond(req, res, await adminOverview(req.auth))));
export default router;
