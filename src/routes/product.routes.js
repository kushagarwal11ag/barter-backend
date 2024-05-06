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
router.route("/all").get(verifyJWT, checkVerificationAndBan, getAllProducts);
router.route("/my").get(verifyJWT, checkVerificationAndBan, getUserProducts);
router
	.route("/")
	.post(
		verifyJWT,
		checkVerificationAndBan,
		upload.single("image"),
		createProduct
	);
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
