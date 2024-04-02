import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
	{
		content: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
