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
	const blocked = req.user.blockedUsers;
	const products = await Product.aggregate([
		{
			$match: {
				isAvailable: true,
				owner: { $nin: blocked }, // Exclude products if product owner is blocked
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "owner",
				foreignField: "_id",
				as: "ownerDetails",
			},
		},
		{
			$unwind: "$ownerDetails",
		},
		{
			$match: {
				"ownerDetails.isBanned": { $ne: true }, // Exclude products where the owner is banned
				"ownerDetails.blockedUsers": {
					$ne: new mongoose.Types.ObjectId(req.user._id),
				}, // Exclude products where the owner has blocked the logged-in user
			},
		},
		{
			$addFields: {
				owner: "$ownerDetails",
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
				isBarter: 1,
				owner: {
					name: 1,
					avatar: "$owner.avatar.url",
				},
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
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	let products;

	if (userId.toString() === req.user._id.toString()) {
		products = await Product.aggregate([
			{
				$match: {
					owner: new mongoose.Types.ObjectId(userId),
				},
			},
			{
				$group: {
					_id: "$owner",
					productCount: {
						$sum: 1,
					},
					products: {
						$push: {
							_id: "$_id",
							title: "$title",
							image: "$image.url",
							category: "$category",
							isAvailable: "$isAvailable",
						},
					},
				},
			},
			{
				$sort: {
					"products.createdAt": -1,
				},
			},
		]);
	} else {
		products = await Product.aggregate([
			{
				$match: {
					owner: new mongoose.Types.ObjectId(userId),
					isAvailable: true,
				},
			},
			{
				$group: {
					_id: "$owner",
					productCount: {
						$sum: 1,
					},
					products: {
						$push: {
							_id: "$_id",
							title: "$title",
							image: "$image.url",
							category: "$category",
							isAvailable: "$isAvailable",
						},
					},
				},
			},
			{
				$sort: {
					"products.createdAt": -1,
				},
			},
		]);
	}

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				products?.[0],
				"All user products retrieved successfully"
			)
		);
});

const getProductById = asyncHandler(async (req, res) => {
	const { productId } = req.params;
	const userId = req.user._id;
	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	await Product.findByIdAndUpdate(productId, {
		$addToSet: {
			views: userId,
		},
	});

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
							blockedUsers: 1,
							isBanned: 1,
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
				viewCount: {
					$size: "$views",
				},
			},
		},
		{
			$project: {
				_id: 0,
				isAvailable: 0,
				views: 0,
				updatedAt: 0,
				__v: 0,
			},
		},
	]);

	if (!product.length) {
		throw new ApiError(404, "Product not found");
	}

	if (
		product[0].owner.isBanned ||
		(userId.toString() !== product[0].owner._id.toString() &&
			product[0].isAvailable === false)
	)
		throw new ApiError(403, "Access forbidden.");

	const blocked = product[0].owner.blockedUsers?.map((id) => id.toString());
	blocked.map((blockedUser) => {
		if (userId.toString() === blockedUser)
			throw new ApiError(403, "Access forbidden.");
	});

	const blockedUser = req.user.blockedUsers?.map((id) => id.toString());
	blockedUser.map((blockedUser) => {
		if (product[0].owner._id.toString() === blockedUser)
			throw new ApiError(
				403,
				"You have blocked this user. Unblock to continue"
			);
	});

	const getProduct = {
		...product[0],
		owner: {
			_id: product[0].owner._id,
			name: product[0].owner.name,
			avatar: product[0].owner.avatar,
		},
	};

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

	const isBarterBool = JSON.parse(isBarter);
	const isAvailableBool = JSON.parse(isAvailable);

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
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	if (isBarterBool) {
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
		isBarter: isBarterBool,
		barterCategory,
		barterDescription,
		price,
		meetingSpot,
		isAvailable: isAvailableBool,
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

	const isAvailableBool = JSON.parse(isAvailable);

	const imageLocalPath = req.file?.path;
	const { productId } = req.params;

	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	const { error } = validateProduct({
		description,
		meetingSpot,
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

	if (product.isBarter && (barterCategory || barterDescription)) {
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

		if (product.image?.id) {
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
				price,
				meetingSpot,
				isAvailable: isAvailableBool,
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
