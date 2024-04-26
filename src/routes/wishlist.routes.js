import { Router } from "express";
import {
	getUserWishlist,
	addToWishlist,
	removeFromWishlist,
} from "../controllers/wishlist.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

// secured routes
router.route("/").get(verifyJWT, checkVerificationAndBan, getUserWishlist);
router
	.route("/:productId")
	.patch(verifyJWT, checkVerificationAndBan, addToWishlist)
	.delete(verifyJWT, checkVerificationAndBan, removeFromWishlist);

export default router;
