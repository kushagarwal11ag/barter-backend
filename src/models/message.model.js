/*
import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
	{
		from: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		to: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		message: {
			type: String,
			required: true,
			trim: true,
		},
		isRead: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

export const Message = mongoose.model("Message", messageSchema);
*/