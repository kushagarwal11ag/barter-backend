import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
	{
		productOffered: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},
		productRequested: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
			index: true,
		},
		orderStatus: {
			type: String,
			enum: ["pending", "accepted", "completed", "cancelled"],
			default: "pending",
		},
		remarks: {
			type: String,
		},
		initiatedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		recipient: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
	},
	{ timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
