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
			type: String,
			enum: ["new", "good", "fair"],
			required: true,
		},
		category: {
			type: String,
			required: true,
		},
		tags: [
			{
				type: String,
				trim: true,
			},
		],
		status: {
			type: String, // available, traded
			required: true,
		},
		desiredProduct: {
			type: String,
			trim: true,
		},
		likes: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		views: {
			type: Number,
			default: 0,
		},
		location: {
			type: String,
			required: true,
		},
		archive: {
			type: Boolean,
			default: true,
		},
		interestedUsers: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
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
