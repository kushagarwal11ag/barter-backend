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
	refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh").post(refreshAccessToken);

// secured routes
router.route("/me/password").patch(verifyJWT, changeCurrentPassword);
router
	.route("/me")
	.get(verifyJWT, getCurrentUser)
	.put(verifyJWT, updateUserDetails)
	.patch(
		verifyJWT,
		upload.fields([
			{ name: "avatar", maxCount: 1 },
			{ name: "banner", maxCount: 1 },
		]),
		updateUserFiles
	);
router.route("/:userId").get(verifyJWT, getUserById);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
