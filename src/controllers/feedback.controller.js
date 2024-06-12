import mongoose, { isValidObjectId } from "mongoose";
import Feedback from "../models/feedback.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { validateFeedback } from "../utils/validators.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllUserFeedbacks = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	const user = await User.findById(userId);
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

	const feedbacks = await Feedback.aggregate([
		{
			$match: {
				feedbackFor: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "feedbackBy",
				foreignField: "_id",
				as: "feedbackBy",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							avatar: 1,
							blockedUsers: 1,
						},
					},
				],
			},
		},
		{
			$unwind: "$feedbackBy",
		},
		{
			$match: {
				$nor: [
					{
						"feedbackBy.blockedUsers": new mongoose.Types.ObjectId(
							req.user._id
						),
					},
					{
						"feedbackBy._id": {
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
				content: 1,
				rating: 1,
				feedbackBy: {
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
				feedbacks,
				"User feedbacks retrieved successfully"
			)
		);
});

const getAllMyFeedbacks = asyncHandler(async (req, res) => {
	const feedbacks = await Feedback.aggregate([
		{
			$match: {
				feedbackBy: new mongoose.Types.ObjectId(req.user._id),
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "feedbackFor",
				foreignField: "_id",
				as: "feedbackFor",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							avatar: 1,
							blockedUsers: 1,
						},
					},
				],
			},
		},
		{
			$unwind: "$feedbackFor",
		},
		{
			$match: {
				$nor: [
					{
						"feedbackFor.blockedUsers": new mongoose.Types.ObjectId(
							req.user._id
						),
					},
					{
						"feedbackFor._id": {
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
				content: 1,
				rating: 1,
				feedbackFor: {
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
				feedbacks,
				"Feedbacks posted by user retrieved successfully"
			)
		);
});

const createFeedback = asyncHandler(async (req, res) => {
	const { content, rating } = req.body;
	const { userId } = req.params;

	const { error } = validateFeedback({ content, rating });
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}
	if (userId === req.user._id.toString()) {
		throw new ApiError(400, "Cannot post feedback on your own profile");
	}

	const user = await User.findById(userId);
	if (!user) {
		throw new ApiError(404, "Cannot post feedback as user not found");
	}

	if (
		user.isBanned ||
		user.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(userId)
	) {
		throw new ApiError(403, "Access denied.");
	}

	const feedbackExists = await Feedback.findOne({
		feedbackFor: userId,
		feedbackBy: req.user._id,
	});
	if (feedbackExists) {
		throw new ApiError(
			403,
			"Access denied. Cannot post multiple feedbacks."
		);
	}

	const feedback = await Feedback.create({
		content,
		rating,
		feedbackFor: userId,
		feedbackBy: req.user._id,
	});

	await Notification.create({
		feedbackId: feedback._id,
		notificationType: "feedback",
		content: "You received a feedback",
		user: userId,
	});

	return res
		.status(201)
		.json(new ApiResponse(201, feedback, "Feedback posted successfully"));
});

const updateFeedback = asyncHandler(async (req, res) => {
	const { content, rating } = req.body;
	const { feedbackId } = req.params;

	const { error } = validateFeedback({ content, rating });
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	if (!feedbackId || !isValidObjectId(feedbackId)) {
		throw new ApiError(400, "Invalid or missing feedback ID");
	}

	const feedback = await Feedback.findById(feedbackId).populate({
		path: "feedbackFor",
		select: "_id, isBanned, blockedUsers",
	});
	if (!feedback) {
		throw new ApiError(404, "Feedback not found");
	}
	if (
		feedback.feedbackBy.toString() !== req.user._id.toString() ||
		feedback.feedbackFor.isBanned ||
		feedback.feedbackFor.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(feedback.feedbackFor._id)
	) {
		throw new ApiError(403, "Access forbidden.");
	}

	await Feedback.findByIdAndUpdate(feedbackId, {
		$set: { content, rating },
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Feedback updated successfully"));
});

const deleteFeedback = asyncHandler(async (req, res) => {
	const { feedbackId } = req.params;
	if (!feedbackId || !isValidObjectId(feedbackId)) {
		throw new ApiError(400, "Invalid or missing feedback ID");
	}

	const feedback = await Feedback.findById(feedbackId);
	if (!feedback) {
		throw new ApiError(404, "Feedback not found");
	}
	if (
		!(
			feedback.feedbackBy.toString() === req.user._id.toString() ||
			feedback.feedbackFor.toString() === req.user._id.toString()
		)
	) {
		throw new ApiError(403, "Access forbidden.");
	}

	await Feedback.findByIdAndDelete(feedbackId);
	await Notification.deleteOne({feedbackId: feedbackId})

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Feedback deleted successfully"));
});

export {
	getAllUserFeedbacks,
	getAllMyFeedbacks,
	createFeedback,
	updateFeedback,
	deleteFeedback,
};

/*
get all user feedbacks ✔️
get all my feedbacks ✔️
create feedback - send notification ✔️
update feedback ✔️
delete feedback ✔️
*/
