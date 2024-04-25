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
		feedBackTo: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		feedBackBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);
