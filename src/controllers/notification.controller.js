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
				from: "users",
				localField: "feedbackId",
				foreignField: "_id",
				as: "feedbackUser",
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
							initiatorDetails: {
								$arrayElemAt: ["$initiatorDetails", 0],
							},
							recipientDetails: {
								$arrayElemAt: ["$recipientDetails", 0],
							},
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
			$project: {
				feedbackId: 1,
				followedById: 1,
				transactionId: 1,
				notificationType: 1,
				content: 1,
				isRead: 1,
				createdAt: 1,
				feedbackUser: 1,
				followedByUser: 1,
				transactionUser: "$transactionDetails.userDetails",
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

/*
get all user notifications ✔️
toggle notification status ✔️
delete notification ✔️
*/
