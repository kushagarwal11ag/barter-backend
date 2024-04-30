import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
	{
		feedbackId: {
			type: Schema.Types.ObjectId,
			ref: "Feedback",
		},
		followedById: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		transactionId: {
			type: Schema.Types.ObjectId,
			ref: "Transaction",
		},
		notificationType: {
			type: String,
			enum: ["feedback", "follow", "transaction"],
			required: true,
		},
		content: {
			type: String,
			required: true,
		},
		isRead: {
			type: Boolean,
			default: false,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
