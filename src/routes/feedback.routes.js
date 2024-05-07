import { Router } from "express";
import {
	getAllUserFeedbacks,
	getAllMyFeedbacks,
	createFeedback,
	updateFeedback,
	deleteFeedback,
} from "../controllers/feedback.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

// secured routes
router
	.route("/user/:userId")
	.get(verifyJWT, checkVerificationAndBan, getAllUserFeedbacks)
	.post(verifyJWT, checkVerificationAndBan, createFeedback);
router.route("/my").get(verifyJWT, checkVerificationAndBan, getAllMyFeedbacks);
router
	.route("/:feedbackId")
	.patch(verifyJWT, checkVerificationAndBan, updateFeedback)
	.delete(verifyJWT, checkVerificationAndBan, deleteFeedback);

export default router;
