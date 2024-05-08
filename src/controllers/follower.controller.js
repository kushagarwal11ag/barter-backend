import mongoose, { isValidObjectId } from "mongoose";
import Follower from "../models/follower.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllUserFollowers = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	let user = req.user;
	if (req.user._id.toString() !== userId) {
		user = await User.findById(userId);
		if (!user) {
			throw new ApiError(404, "User not found");
		}
		if (
			user.isBanned ||
			req.user.blockedUsers?.includes(userId) ||
			user.blockedUsers?.includes(req.user._id)
		) {
			throw new ApiError(403, "Access denied");
		}
	}

	const followers = await Follower.aggregate([
		{
			$match: {
				following: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "follower",
				foreignField: "_id",
				as: "follower",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							_id: 1,
							avatar: 1,
							name: 1,
							isBanned: 1,
							blockedUsers: 1,
						},
					},
				],
			},
		},
		{
			$unwind: "$follower",
		},
		{
			$match: {
				$nor: [
					{
						"follower.blockedUsers": new mongoose.Types.ObjectId(
							req.user._id
						),
					},
					{
						"follower._id": {
							$in: req.user.blockedUsers?.map(
								(id) => new mongoose.Types.ObjectId(id)
							),
						},
					},
				],
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$project: {
				follower: {
					_id: 1,
					name: 1,
					avatar: 1,
				},
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				followers,
				"Follower list retrieved successfully"
			)
		);
});

const getAllUserFollowing = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	let user = req.user;
	if (req.user._id.toString() !== userId) {
		user = await User.findById(userId);
		if (!user) {
			throw new ApiError(404, "User not found");
		}
		if (
			user.isBanned ||
			req.user.blockedUsers?.includes(userId) ||
			user.blockedUsers?.includes(req.user._id)
		) {
			throw new ApiError(403, "Access denied");
		}
	}

	const following = await Follower.aggregate([
		{
			$match: {
				follower: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "following",
				foreignField: "_id",
				as: "following",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							_id: 1,
							avatar: 1,
							name: 1,
							isBanned: 1,
							blockedUsers: 1,
						},
					},
				],
			},
		},
		{
			$unwind: "$following",
		},
		{
			$match: {
				$nor: [
					{
						"following.blockedUsers": new mongoose.Types.ObjectId(
							req.user._id
						),
					},
					{
						"following._id": {
							$in: req.user.blockedUsers?.map(
								(id) => new mongoose.Types.ObjectId(id)
							),
						},
					},
				],
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$project: {
				following: {
					_id: 1,
					name: 1,
					avatar: 1,
				},
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				following,
				"Following list retrieved successfully"
			)
		);
});

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
	if (
		user.isBanned ||
		user.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(userId)
	) {
		throw new ApiError(403, "Access denied.");
	}

	const checkFollow = await Follower.findOne({
		following: userId,
		follower: req.user._id,
	});
	if (checkFollow) {
		throw new ApiError(403, "User already followed");
	}

	const follow = await Follower.create({
		following: userId,
		follower: req.user._id,
	});

	const notification = await Notification.findOne({
		followedById: req.user._id,
		notificationType: "follow",
		user: userId,
	});
	if (!notification) {
		await Notification.create({
			followedById: req.user._id,
			notificationType: "follow",
			content: "You have gained a follower",
			user: userId,
		});
	}

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
	if (
		user.isBanned ||
		user.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(userId)
	) {
		throw new ApiError(403, "Access denied.");
	}

	const result = await Follower.deleteOne({
		following: userId,
		follower: req.user._id,
	});
	if (!result.deletedCount) {
		throw new ApiError(404, "Follow relationship not found");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "User un-followed successfully"));
});

export { getAllUserFollowers, getAllUserFollowing, followUser, unFollowUser };
/*
get all user followers ✔️
get all following ✔️
follow user - send notification ✔️
un-follow user ✔️
*/
