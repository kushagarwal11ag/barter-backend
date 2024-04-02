import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
	{
		productOffered: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},
		productRequested: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "accepted", "declined", "cancelled", "completed"],
			default: "pending",
		},
		terms: {
			type: String,
		},
		initiatedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		agreedBy: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
