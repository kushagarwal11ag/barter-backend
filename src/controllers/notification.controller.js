import mongoose, { isValidObjectId } from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { validateNotification } from "../utils/validators.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllUserNotifications = asyncHandler(async (req, res) => {
	const notifications = await Notification.aggregate([
		{
			$match: {
				user: new mongoose.Types.ObjectId(req.user._id),
			},
		},
		{
			$project: {
				notificationType: 1,
				content: 1,
				isRead: 1,
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

const markNotificationAsRead = asyncHandler(async (req, res) => {
	const { notificationId } = req.params;
	if (!notificationId || !isValidObjectId(notificationId)) {
		throw new ApiError(400, "Invalid or missing notification ID");
	}

	const notification = await Notification.findById(notificationId);
	if (!notification) {
		throw new ApiError(404, "Notification not found");
	}

	await Notification.findByIdAndUpdate(
		notificationId,
		{ $set: { isRead: !notification.isRead } },
		{ new: true }
	);

	return res
		.status(200)
		.json(
			new ApiResponse(200, {}, "Notification marked as read successfully")
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

export { getAllUserNotifications, markNotificationAsRead, deleteNotification };

/*
get all user notifications
mark notification as read ✔️
delete notification ✔️
*/
