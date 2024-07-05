import mongoose, { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getUserWishlist = asyncHandler(async (req, res) => {
	const blocked = req.user.blockedUsers;
	const userId = req.user._id;
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
							owner: { $nin: blocked },
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
											$nin: [
												new mongoose.Types.ObjectId(
													userId
												),
											],
										},
										isBanned: {
											$ne: true,
										},
									},
								},
								{
									$project: {
										_id: 0,
										name: 1,
										avatar: "$avatar.url",
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
							image: "$image.url",
							category: 1,
							owner: "$ownerDetails",
						},
					},
				],
			},
		},
		{
			$project: {
				_id: 0,
				products: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				wishlist?.[0]?.products,
				"User wishlist retrieved successfully"
			)
		);
});

const addToWishlist = asyncHandler(async (req, res) => {
	const { productId } = req.params;

	if (!productId || !isValidObjectId(productId)) {
		throw new ApiError(400, "Invalid or missing product ID");
	}

	const product = await Product.findById(productId).populate({
		path: "owner",
		select: "_id, blockedUsers, isBanned",
	});
	if (!product) {
		throw new ApiError(404, "Product not found");
	}

	if (product.owner._id.toString() === req.user._id.toString()) {
		throw new ApiError(
			403,
			"Access denied. Cannot wishlist your own product"
		);
	}

	if (
		product.owner.blockedUsers?.includes(req.user._id.toString()) ||
		req.user.blockedUsers?.includes(product.owner._id.toString()) ||
		product.owner.isBanned
	) {
		throw new ApiError(403, "Access Forbidden.");
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
