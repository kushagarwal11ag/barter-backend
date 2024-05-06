import mongoose, { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const viewAllBlockedUsers = asyncHandler(async (req, res) => {
	const blockedUsers = await User.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(req.user?._id),
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "blockedUsers",
				foreignField: "_id",
				as: "blockedUsersDetails",
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
			$project: {
				_id: 0,
				blockedUsersDetails: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				blockedUsers?.[0],
				"Blocked users retrieved successfully"
			)
		);
});

const blockUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(
			400,
			"Invalid or missing user ID of the user to block"
		);
	}

	if (req.user._id.toString() === userId) {
		throw new ApiError(400, "Cannot block oneself");
	}

	const blockUser = await User.findById(userId);
	if (!blockUser) {
		throw new ApiError(404, "User to block not found");
	}

	await User.findByIdAndUpdate(req.user._id, {
		$addToSet: {
			blockedUsers: userId,
		},
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "User blocked successfully"));
});

const unblockUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(
			400,
			"Invalid or missing user ID of the blocked user"
		);
	}

	if (req.user._id.toString() === userId) {
		throw new ApiError(400, "Cannot unblock oneself.");
	}

	await User.findByIdAndUpdate(req.user._id, {
		$pull: {
			blockedUsers: userId,
		},
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "User unblocked successfully"));
});

export { viewAllBlockedUsers, blockUser, unblockUser };

/*
view all blocked users ✔️
block user ✔️
unblock user ✔️
*/
