import mongoose, { isValidObjectId } from "mongoose";
import Product from "../models/product.model.js";
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
				"All products retrieved successfully"
			)
		);
});

const getUserProducts = asyncHandler(async (res, res) => {
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
				"All products retrieved successfully"
			)
		);
});

const getProductById = asyncHandler(async (res, res) => {
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
	const { title, description, condition, category } = req.body;
	const imageLocalPath = req.file?.path;

	if (
		!title.trim() ||
		!description.trim() ||
		!condition.trim() ||
		!category.trim()
	) {
		throw new ApiError(400, "Fields required");
	}

	if (!imageLocalPath) {
		throw new ApiError(400, "Product image required");
	}

	if (
		!(condition === "new" || condition === "fair" || condition === "good")
	) {
		throw new ApiError(400, "Condition does not meet the requirements");
	}

	const image = await uploadOnCloudinary(imageLocalPath);
	if (!image?.url) {
		throw new ApiError(
			500,
			"An unexpected error occurred while uploading image"
		);
	}

	const product = await Product.create({
		title,
		description,
		image: {
			id: image?.public_id,
			url: image?.url,
		},
		condition,
		category,
		owner: req.user?._id,
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
			await deleteFromCloudinary(crop.image?.id);
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
	if (product.owner.toString() !== req.user?.toString()) {
		throw new ApiError(403, "Access forbidden.");
	}

	if (product.image?.id) {
		await deleteFromCloudinary(product.image?.id);
	}

	await Product.findByIdAndDelete(productId);

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
get particular product (id) ✔️
get all products ✔️
create product ✔️
update product [id] ✔️
delete product [id] ✔️

// get user products (userID)
// update likes (add/remove) [id]
// update views count [id]
// update interested users [id]
// update interested products in user model [id]
// send notification: liked user, interested user, received feedback
*/
