import mongoose, { isValidObjectId } from "mongoose";
import Transaction from "../models/transaction.model.js";
import Product from "../models/product.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const initiateTransaction = asyncHandler(async (req, res) => {
	const { productOfferedId, remarks } = req.body;
	const { productRequestedId } = req.params;

	if (
		!productOfferedId ||
		!productRequestedId ||
		!isValidObjectId(productOfferedId) ||
		!isValidObjectId(productRequestedId)
	) {
		throw new ApiError(400, "Invalid or missing product(s) ID");
	}

	const productOffered = await Product.findById(productOfferedId);
	if (!productOffered) {
		throw new ApiError(404, "Product ID of offered product not found");
	}

	const productRequested = await Product.findById(productRequestedId);
	if (!productRequested) {
		throw new ApiError(404, "Product ID of requested product not found");
	}

	if (productOffered.owner.toString() !== req.user?._id.toString()) {
		throw new ApiError(403, "Access Forbidden.");
	}

	const transaction = await Transaction.create({
		productOffered: productOfferedId,
		productRequested: productRequestedId,
		remarks,
		initiatedBy: req.user?._id,
	});

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				transaction,
				"Transaction initiated successfully"
			)
		);
});

const updateTransaction = asyncHandler(async (res, res) => {
	const { orderStatus, remarks } = req.body;
	const { transactionId } = req.params;

	if (!transactionId || !isValidObjectId(transactionId)) {
		throw new ApiError(400, "Invalid or missing transaction ID");
	}

	const transaction = await Transaction.findById(transactionId);
	if (!transaction) {
		throw new ApiError(404, "Transaction not found");
	}

	// const updateTransaction = await Transaction.findByIdAndUpdate(
	// 	transactionId,
	// 	{
	// 		$set: {},
	// 	}
	// );
});

export { initiateTransaction, updateTransaction };

/*
initiate transaction (2 product ids)
update transaction status [id] (add id, if one party involved cancels)
*/
