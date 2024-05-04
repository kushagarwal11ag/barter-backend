import { Router } from "express";
import {
	registerUser,
	loginUser,
	changeCurrentPassword,
	getCurrentUser,
	getUserById,
	updateUserDetails,
	updateUserFiles,
	logoutUser,
	deleteAccount,
	refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh").post(refreshAccessToken);

// secured routes
router
	.route("/password")
	.patch(verifyJWT, checkVerificationAndBan, changeCurrentPassword);
router
	.route("/")
	.get(verifyJWT, checkVerificationAndBan, getCurrentUser)
	.put(verifyJWT, checkVerificationAndBan, updateUserDetails)
	.patch(
		verifyJWT,
		checkVerificationAndBan,
		upload.fields([
			{ name: "avatar", maxCount: 1 },
			{ name: "banner", maxCount: 1 },
		]),
		updateUserFiles
	)
	.delete(verifyJWT, checkVerificationAndBan, deleteAccount);
router.route("/:userId").get(verifyJWT, checkVerificationAndBan, getUserById);
router.route("/logout").post(verifyJWT, checkVerificationAndBan, logoutUser);

export default router;
