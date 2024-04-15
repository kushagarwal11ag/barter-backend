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
			id: {
				type: String,
				required: true,
			},
			url: {
				type: String,
				required: true,
			},
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
		location: {
			type: String,
			required: true,
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		/*
		desiredProduct: {
			type: String,
			trim: true,
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
		isEnabled: {
			type: Boolean,
			default: false,
		},
		interestedUsers: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		*/
	},
	{
		timestamps: true,
	}
);

const Product = mongoose.model("Product", productSchema);
export default Product;
