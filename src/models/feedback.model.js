import mongoose, { Schema } from "mongoose";

const feedbackSchema = new Schema(
	{
		content: {
			type: String,
			required: true,
			trim: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
			validate: {
				validator: Number.isInteger,
				message: "Please use integer for rating",
			},
		},
		feedbackFor: {
			type: Schema.Types.ObjectId,
			ref: "User",
			index: true,
		},
		feedbackBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			index: true,
		},
	},
	{ timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
