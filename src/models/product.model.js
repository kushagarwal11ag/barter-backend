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
			enum: ["new", "good", "fair", "poor"],
			required: true,
		},
		category: {
			type: String,
			required: true,
		},
		isBarter: {
			type: Boolean,
			default: true,
		},
		barterCategory: {
			type: String,
			trim: true,
		},
		barterDescription: {
			type: String,
			trim: true,
		},
		price: {
			type: Number,
			default: 0,
		},
		views: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		meetingSpot: {
			type: String,
			required: true,
		},
		isAvailable: {
			type: Boolean,
			default: true,
			index: true
		},
		owner: {
			type: Schema.Types.ObjectId,
			ref: "User",
			index: true,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

const Product = mongoose.model("Product", productSchema);
export default Product;
