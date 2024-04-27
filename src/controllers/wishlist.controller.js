import mongoose, { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getUserWishlist = asyncHandler(async (req, res) => {
	const userId = req.user?._id;
	const wishlist = await User.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$lookup: {
				from: "products",
				localField: "wishlist",
				foreignField: "_id",
				as: "products",
				pipeline: [
					{
						$match: {
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
										blockedUsers: {
											$ne: new mongoose.Types.ObjectId(
												userId
											),
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
						$unwind: {
							path: "$ownerDetails",
							preserveNullAndEmptyArrays: false,
						},
					},
					{
						$project: {
							title: 1,
							images: 1,
							category: 1,
							owner: { $arrayElemAt: ["$ownerDetails", 0] },
						},
					},
				],
			},
		},
		{
			$project: {
				products: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				wishlist,
				"User wishlist retrieved successfully"
			)
		);
});

const addToWishlist = asyncHandler(async (req, res) => {
	const { productId } = req.params;

	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	const product = await Product.findById(productId).populate(
		"owner",
		"blockedUsers"
	);
	if (!product) {
		throw new ApiError(404, "Product not found");
	}

	if (product.owner.blockedUsers?.includes(req.user._id.toString())) {
		throw new ApiError(403, "Access Forbidden. Blocked by user");
	}

	await User.findByIdAndUpdate(req.user?._id, {
		$addToSet: {
			wishlist: productId,
		},
	});

	return res
		.status(200)
		.json(
			new ApiResponse(200, {}, "Added product to wishlist successfully")
		);
});

const removeFromWishlist = asyncHandler(async (req, res) => {
	const { productId } = req.params;

	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	await User.findByIdAndUpdate(req.user?._id, {
		$pull: {
			wishlist: productId,
		},
	});

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{},
				"Product removed from wishlist successfully"
			)
		);
});

export { getUserWishlist, addToWishlist, removeFromWishlist };

/*
get user wishlist ✔️
add to user wishlist ✔️
remove from user wishlist ✔️
*/
