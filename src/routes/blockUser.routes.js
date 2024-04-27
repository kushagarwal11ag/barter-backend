import { Router } from "express";
import {
	viewAllBlockedUsers,
	blockUser,
	unblockUser,
} from "../controllers/blockUser.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

// secured routes
router.route("/").get(verifyJWT, checkVerificationAndBan, viewAllBlockedUsers);
router
	.route("/:userId")
	.patch(verifyJWT, checkVerificationAndBan, blockUser)
	.delete(verifyJWT, checkVerificationAndBan, unblockUser);

export default router;
