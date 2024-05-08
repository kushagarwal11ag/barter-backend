import mongoose, { isValidObjectId } from "mongoose";
import Notification from "../models/notification.model.js";
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
				user: 0,
				createdAt: 0,
				updatedAt: 0,
				__v: 0,
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
			new ApiResponse(200, {}, "Notification read status changed successfully")
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
