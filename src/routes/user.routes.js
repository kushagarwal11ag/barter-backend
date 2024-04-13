import { Router } from "express";
import {
	registerUser,
	loginUser,
	getCurrentUser,
    getUserById,
	logoutUser,
	refreshAccessToken,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// secured routes
router.route("/user").get(verifyJWT, getCurrentUser);
router.route("/user/:userId").get(verifyJWT, getUserById);
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
