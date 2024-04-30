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
	const blockedUsers =
		req.user.blockedUsers?.map((id) => id.toString()) || [];

	const products = await Product.aggregate([
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "ownerDetails",
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $not: [{ $in: ["$_id", blockedUsers] }] }, // Ensure the owner is not in the blockedUsers list
									{ $eq: ["$isBanned", false] }, // Ensure the owner is not banned
								],
							},
						},
					},
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
			$match: {
				isAvailable: true,
				"ownerDetails.0": { $exists: true }, // Ensure there is at least one non-blocked, non-banned owner
			},
		},
		{
			$addFields: {
				owner: { $arrayElemAt: ["$ownerDetails", 0] }, // Flatten the owner details
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
				owner: 1,
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
				owner: new mongoose.Types.ObjectId(req.user._id),
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
				image: 1,
				category: 1,
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

	const product = await Product.findByIdAndUpdate(productId, {
		$addToSet: {
			view: req.user._id,
		},
	});
	if (!product) {
		throw new ApiError(404, "Product not found");
	}

	const blockedUsers =
		req.user.blockedUsers?.map((id) => id.toString()) || [];

	const getProduct = await Product.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(productId),
				isAvailable: true,
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "ownerDetails",
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{ $not: [{ $in: ["$_id", blockedUsers] }] },
									{ $eq: ["$isBanned", false] },
								],
							},
						},
					},
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
			$match: {
				"ownerDetails.0": { $exists: true },
			},
		},
		{
			$addFields: {
				owner: { $arrayElemAt: ["$ownerDetails", 0] },
				image: "$image.url",
				viewCount: {
					$size: "$views",
				},
			},
		},
		{
			$project: {
				title: 1,
				description: 1,
				image: 1,
				condition: 1,
				category: 1,
				isBarter: 1,
				barterCategory: 1,
				barterDescription: 1,
				price: 1,
				viewCount: 1,
				meetingSpot: 1,
				owner: 1,
			},
		},
	]);

	if (!product.length) {
		throw new ApiError(404, "Product not found or Access denied");
	}

	return res
		.status(200)
		.json(
			new ApiResponse(200, getProduct, "Product retrieved successfully")
		);
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

	const imageLocalPath = req.file?.path;
	if (!imageLocalPath) {
		throw new ApiError(400, "Image file required");
	}

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
			id: image.public_id,
			url: image.url,
		},
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
		.status(201)
		.json(new ApiResponse(201, product, "Product created successfully"));
});

const updateProduct = asyncHandler(async (req, res) => {
	const {
		description,
		barterCategory,
		barterDescription,
		price,
		meetingSpot,
		isAvailable,
	} = req.body;
	const imageLocalPath = req.file?.path;
	const { productId } = req.params;

	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	const { error } = validateProduct({
		description,
		meetingSpot,
		isAvailable,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	const product = await Product.findById(productId);
	if (!product) {
		throw new ApiError(404, "Product not found");
	}

	if (product.owner.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "Access forbidden.");
	}

	if (product.isBarter) {
		const { error } = validateProduct({
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

	let image;
	if (imageLocalPath) {
		image = await uploadOnCloudinary(imageLocalPath);
		if (!image?.url) {
			throw new ApiError(
				500,
				"An unexpected error occurred while uploading image"
			);
		}

		if (product.image.id) {
			await deleteFromCloudinary(product.image.id);
		}
	}

	const updatedProduct = await Product.findByIdAndUpdate(
		productId,
		{
			$set: {
				description,
				barterCategory: product.isBarter ? barterCategory : null,
				barterDescription: product.isBarter ? barterDescription : null,
				price: price >= 0 ? price : product.price,
				meetingSpot,
				isAvailable,
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

	const transactions = await Transaction.aggregate([
		{
			$match: {
				productOffered: productId,
				orderStatus: {
					$ne: "cancelled",
				},
			},
		},
	]);
	if (transactions.length) {
		throw new ApiError(
			403,
			"Access forbidden. Product active in transaction"
		);
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
		productOffered: productId,
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
get all products ✔️
get all user products ✔️
get particular product (update views) ✔️
create product ✔️
update product ✔️ - do not update if in transaction
delete product ✔️
*/
