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

const router = Router();

// secured routes
router.route("/all-products").get(verifyJWT, getAllProducts);
router.route("/my-products").get(verifyJWT, getUserProducts);
router.route("/product").post(verifyJWT, upload.single("image"), createProduct);
router
	.route("/:productId")
	.get(verifyJWT, getProductById)
	.patch(verifyJWT, upload.single("image"), updateProduct)
	.delete(verifyJWT, deleteProduct);

export default router;
