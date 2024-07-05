import mongoose, { isValidObjectId } from "mongoose";
import Notification from "../models/notification.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllUserNotifications = asyncHandler(async (req, res) => {
	const userId = req.user._id;
	const notifications = await Notification.aggregate([
		{
			$match: {
				user: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$lookup: {
				from: "feedbacks",
				localField: "feedbackId",
				foreignField: "_id",
				as: "feedbackDetails",
				pipeline: [
					{
						$lookup: {
							from: "users",
							localField: "feedbackBy",
							foreignField: "_id",
							as: "feedbackByUser",
							pipeline: [
								{
									$project: {
										_id: 1,
										avatar: "$avatar.url",
									},
								},
							],
						},
					},
					{
						$unwind: {
							path: "$feedbackByUser",
							preserveNullAndEmptyArrays: true,
						},
					},
				],
			},
		},
		{
			$unwind: {
				path: "$feedbackDetails",
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "followedById",
				foreignField: "_id",
				as: "followedByUser",
				pipeline: [
					{
						$project: {
							_id: 1,
							avatar: "$avatar.url",
						},
					},
				],
			},
		},
		{
			$unwind: {
				path: "$followedByUser",
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: "transactions",
				localField: "transactionId",
				foreignField: "_id",
				as: "transactionDetails",
				pipeline: [
					{
						$lookup: {
							from: "users",
							localField: "initiator",
							foreignField: "_id",
							as: "initiatorDetails",
							pipeline: [
								{
									$project: {
										_id: 1,
										avatar: "$avatar.url",
									},
								},
							],
						},
					},
					{
						$lookup: {
							from: "users",
							localField: "recipient",
							foreignField: "_id",
							as: "recipientDetails",
							pipeline: [
								{
									$project: {
										_id: 1,
										avatar: "$avatar.url",
									},
								},
							],
						},
					},
					{
						$addFields: {
							userDetails: {
								$cond: {
									if: {
										$eq: [
											"$initiator",
											new mongoose.Types.ObjectId(userId),
										],
									},
									then: "$recipientDetails",
									else: "$initiatorDetails",
								},
							},
						},
					},
				],
			},
		},
		{
			$unwind: {
				path: "$transactionDetails",
				preserveNullAndEmptyArrays: true,
			},
		},
		{
            $addFields: {
                transactionUser: { $arrayElemAt: ["$transactionDetails.userDetails", 0] },
            },
        },
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$project: {
				transactionId: 1,
				notificationType: 1,
				content: 1,
				isRead: 1,
				createdAt: 1,
				feedbackByUser: "$feedbackDetails.feedbackByUser",
				followedByUser: 1,
				transactionUser: {
					$cond: {
						if: "$transactionUser",
						then: "$transactionUser",
						else: "$$REMOVE",
					},
				},
				user: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				notifications,
				"User notifications retrieved successfully"
			)
		);
});

const toggleNotificationStatus = asyncHandler(async (req, res) => {
	const { notificationId } = req.params;
	if (!notificationId || !isValidObjectId(notificationId)) {
		throw new ApiError(400, "Invalid or missing notification ID");
	}

	const notification = await Notification.findById(notificationId);
	if (!notification) {
		throw new ApiError(404, "Notification not found");
	}
	if (notification.user.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "Access forbidden.");
	}

	await Notification.findByIdAndUpdate(
		notificationId,
		{ $set: { isRead: !notification.isRead } },
		{ new: true }
	);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				{},
				"Notification read status changed successfully"
			)
		);
});

const deleteNotification = asyncHandler(async (req, res) => {
	const { notificationId } = req.params;
	if (!notificationId || !isValidObjectId(notificationId)) {
		throw new ApiError(400, "Invalid or missing notification ID");
	}

	const notification = await Notification.findById(notificationId);
	if (!notification) {
		throw new ApiError(404, "Notification not found");
	}
	if (notification.user.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "Access forbidden.");
	}

	await Notification.findByIdAndDelete(notificationId);

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Notification deleted successfully"));
});

export {
	getAllUserNotifications,
	toggleNotificationStatus,
	deleteNotification,
};
