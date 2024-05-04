import { Router } from "express";
import {
	getAllUserNotifications,
	toggleNotificationStatus,
	deleteNotification,
} from "../controllers/notification.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

// secured routes
router
	.route("/")
	.get(verifyJWT, checkVerificationAndBan, getAllUserNotifications);
router
	.route("/:notificationId")
	.patch(verifyJWT, checkVerificationAndBan, toggleNotificationStatus)
	.delete(verifyJWT, checkVerificationAndBan, deleteNotification);

export default router;
