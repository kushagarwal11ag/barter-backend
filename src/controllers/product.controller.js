import mongoose, { isValidObjectId } from "mongoose";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";
import Notification from "../models/notification.model.js";
import { validateProduct } from "../utils/validators.js";
import {
	uploadOnCloudinary,
	deleteFromCloudinary,
} from "../utils/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllProducts = asyncHandler(async (req, res) => {
	const products = await Product.aggregate([
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "user",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							name: 1,
							avatar: 1,
						},
					},
				],
			},
		},
		{
			$addFields: {
				user: {
					$first: "$user",
				},
				image: "$image.url",
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$project: {
				title: 1,
				image: 1,
				category: 1,
				user: 1,
				createdAt: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				products,
				"All products retrieved successfully"
			)
		);
});

const getUserProducts = asyncHandler(async (req, res) => {
	const products = await Product.aggregate([
		{
			$match: {
				owner: new mongoose.Types.ObjectId(req.user?._id),
			},
		},
		{
			$addFields: {
				image: "$image.url",
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$project: {
				title: 1,
				description: 1,
				image: 1,
				condition: 1,
				category: 1,
				createdAt: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				products,
				"All user products retrieved successfully"
			)
		);
});

const getProductById = asyncHandler(async (req, res) => {
	const { productId } = req.params;
	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	const product = await Product.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(productId),
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "owner",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							name: 1,
							avatar: 1,
						},
					},
				],
			},
		},
		{
			$addFields: {
				owner: {
					$first: "$owner",
				},
				image: "$image.url",
			},
		},
		{
			$project: {
				title: 1,
				description: 1,
				image: 1,
				condition: 1,
				category: 1,
				owner: 1,
			},
		},
	]);

	if (product.length === 0) {
		throw new ApiError(404, "Product not found");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, product, "Product retrieved successfully"));
});

const createProduct = asyncHandler(async (req, res) => {
	const {
		title,
		description,
		condition,
		category,
		isBarter,
		barterCategory,
		barterDescription,
		price,
		meetingSpot,
		isAvailable,
	} = req.body;
	const files = req.files;

	const { error } = validateProduct({
		title,
		description,
		condition,
		category,
		meetingSpot,
		isAvailable,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	if (isBarter) {
		const { error } = validateProduct({
			isBarter,
			barterCategory,
			barterDescription,
		});
		if (error) {
			throw new ApiError(
				400,
				`Validation error: ${error.details[0].message}`
			);
		}
	}

	if (price) {
		const { error } = validateProduct({
			price,
		});
		if (error) {
			throw new ApiError(
				400,
				`Validation error: ${error.details[0].message}`
			);
		}
	}

	if (!files || !files.length) {
		throw new ApiError(400, "Product image is required");
	}

	const images = [];
	for (const file of files) {
		try {
			const image = await uploadOnCloudinary(file.path);
			if (!image.url) {
				throw new Error("Failed to upload image");
			}
			images.push({
				id: image.public_id,
				url: image.url,
			});
		} catch (error) {
			throw new ApiError(
				500,
				`An error occurred while uploading images: ${error.message}`
			);
		}
	}

	const product = await Product.create({
		title,
		description,
		images,
		condition,
		category,
		isBarter,
		barterCategory,
		barterDescription,
		price,
		meetingSpot,
		isAvailable,
		owner: req.user._id,
	});

	return res
		.status(200)
		.json(new ApiResponse(200, product, "Product created successfully"));
});

const updateProduct = asyncHandler(async (req, res) => {
	const { title, description, condition, category } = req.body;
	const imageLocalPath = req.file?.path;
	const { productId } = req.params;

	let image;
	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	if (
		!(
			title?.trim() ||
			description?.trim() ||
			condition?.trim() ||
			category?.trim() ||
			imageLocalPath
		)
	) {
		throw new ApiError(400, "No field requested for update");
	}

	if (
		condition &&
		!(condition === "new" || condition === "fair" || condition === "good")
	) {
		throw new ApiError(400, "Condition does not meet the requirements");
	}

	const product = await Product.findById(productId);
	if (!product) {
		throw new ApiError(404, "Product not found");
	}

	if (product.owner.toString() !== req.user?._id.toString()) {
		throw new ApiError(403, "Access forbidden.");
	}

	if (imageLocalPath) {
		image = await uploadOnCloudinary(imageLocalPath);
		if (!image?.url) {
			throw new ApiError(
				500,
				"An unexpected error occurred while uploading image"
			);
		}

		if (product.image.id) {
			await deleteFromCloudinary(product.image?.id);
		}
	}

	const updatedProduct = await Product.findByIdAndUpdate(
		productId,
		{
			$set: {
				title,
				description,
				condition,
				category,
				image: {
					id: image ? image.public_id : product.image.id,
					url: image ? image.url : product.image.url,
				},
			},
		},
		{ new: true }
	);

	return res
		.status(200)
		.json(
			new ApiResponse(200, updatedProduct, "Product updated successfully")
		);
});

const deleteProduct = asyncHandler(async (req, res) => {
	const { productId } = req.params;
	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	const product = await Product.findById(productId);
	if (!product) {
		throw new ApiError(404, "Product not found");
	}
	if (product.owner.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "Access forbidden.");
	}

	if (product.image?.id) {
		await deleteFromCloudinary(product.image?.id);
	}

	await Product.findByIdAndDelete(productId);
	await User.updateMany({
		$pull: {
			wishlist: productId,
		},
	});
	await Transaction.deleteMany({
		$or: [
			{
				productOffered: productId,
			},
			{
				productRequested: productId,
			},
		],
	});
	await Notification.deleteMany({ productId });

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Product deleted successfully"));
});

export {
	getAllProducts,
	getUserProducts,
	getProductById,
	createProduct,
	updateProduct,
	deleteProduct,
};

/*
get all products
get all user products
get particular product (id) (update views)
create product ✔️
update product [id]
update likes (add/remove) [id]
delete product [id] ✔️

// update interested users [id]
// update interested products in user model [id]
// send notification: liked user, interested user, received feedback
*/
