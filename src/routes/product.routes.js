import { Router } from "express";
import {
	getAllProducts,
	getUserProducts,
	getProductById,
	createProduct,
	updateProduct,
	deleteProduct,
} from "../controllers/product.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

// secured routes
router
	.route("/")
	.get(verifyJWT, checkVerificationAndBan, getAllProducts)
	.post(
		verifyJWT,
		checkVerificationAndBan,
		upload.single("image"),
		createProduct
	);
router
	.route("/user/:userId")
	.get(verifyJWT, checkVerificationAndBan, getUserProducts);
router
	.route("/:productId")
	.get(verifyJWT, checkVerificationAndBan, getProductById)
	.patch(
		verifyJWT,
		checkVerificationAndBan,
		upload.single("image"),
		updateProduct
	)
	.delete(verifyJWT, checkVerificationAndBan, deleteProduct);

export default router;
