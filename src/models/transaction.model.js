import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
	{
		transactionType: {
			type: String,
			enum: ["barter", "sale", "hybrid"],
			default: "barter",
		},
		productOffered: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			index: true,
		},
		productRequested: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},
		priceOffered: {
			type: Number,
			default: 0,
		},
		priceRequested: {
			type: Number,
			default: 0,
		},
		orderStatus: {
			type: String,
			enum: ["pending", "cancel", "accept", "complete"],
			default: "pending",
		},
		initiator: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		recipient: {
			type: Schema.Types.ObjectId,
			ref: "User",
			index: true,
		},
	},
	{ timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
