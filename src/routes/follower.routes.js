import { Router } from "express";
import {
	getAllUserFollowers,
	getAllUserFollowing,
	followUser,
	unFollowUser,
} from "../controllers/follower.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

// secured routes
router
	.route("/:userId")
	.get(verifyJWT, checkVerificationAndBan, getAllUserFollowers)
	.post(verifyJWT, checkVerificationAndBan, followUser)
	.delete(verifyJWT, checkVerificationAndBan, unFollowUser);
router
	.route("/following/:userId")
	.get(verifyJWT, checkVerificationAndBan, getAllUserFollowing);

export default router;
