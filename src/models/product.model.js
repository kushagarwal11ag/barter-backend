import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		image: {
			type: String,
			required: true,
		},
		condition: {
			type: String, // new, good, fair
			required: true,
		},
		category: {
			type: String,
			required: true,
		},
		status: {
			type: String, // available, traded
			required: true,
		},
		location: {
			type: String,
			required: true,
		},
		isPublished: {
			type: Boolean,
			default: true,
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

export const Product = mongoose.model("Product", productSchema);
