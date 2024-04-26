import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
	{
		from: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		to: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		content: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			enum: ["sent", "delivered", "read"],
			default: "sent",
		},
	},
	{
		timestamps: true,
	}
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
