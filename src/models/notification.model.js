import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
	{
		type: { // feedback, interested in bartering, etc
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

export const Notification = mongoose.model("Notification", notificationSchema);
