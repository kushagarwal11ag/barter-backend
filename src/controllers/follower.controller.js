import mongoose, { isValidObjectId } from "mongoose";
import Follower from "../models/follower.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const followUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	if (userId === req.user._id.toString()) {
		throw new ApiError(400, "Cannot follow oneself");
	}

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

	if (user.blockedUsers.includes(req.user._id)) {
		throw new ApiError(403, "Access denied. You are blocked by this user.");
	}

	const follow = await Follower.create({
		following: userId,
		follower: req.user._id,
	});

	await Notification.create({
		followedById: req.user._id,
		notificationType: "follow",
		content: "You have gained a follower",
		user: userId,
	});
    //implement transactions concept
	return res
		.status(200)
		.json(new ApiResponse(200, follow, "User followed successfully"));
});

const unFollowUser = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	if (userId === req.user._id.toString()) {
		throw new ApiError(400, "Cannot un-follow oneself");
	}
	const user = await User.findById(userId);
	if (!user) {
		throw new ApiError(404, "User not found");
	}

	const result = await Follower.deleteOne({
		following: userId,
		follower: req.user._id,
	});
    if (!result.deletedCount) {
        throw new ApiError(404, "Follow relationship not found");
    }

	await Notification.deleteOne({
		followedById: req.user._id,
        notificationType: "follow",
        user: userId,
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "User un-followed successfully"));
});

export { followUser, unFollowUser };
/*
get all user followers
get all following
follow user - send notification
un-follow user
*/
