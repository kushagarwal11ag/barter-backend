import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
	{
		productId: {
			type: Schema.Types.ObjectId,
			ref: "Product",
		},
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
			// feedback, follow, transaction (initiated/status change/counter)
			type: String,
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
