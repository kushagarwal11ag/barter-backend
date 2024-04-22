import mongoose, { isValidObjectId } from "mongoose";
import Transaction from "../models/transaction.model.js";
import Product from "../models/product.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllUserAsInitiatorTransactions = asyncHandler(async (req, res) => {
	const transactions = await Transaction.aggregate([
		{
			$match: {
				initiatedBy: new mongoose.Types.ObjectId(req.user?._id),
			},
		},
		{
			$lookup: {
				from: "products",
				localField: "productRequested",
				foreignField: "_id",
				as: "product",
				pipeline: [
					{
						$addFields: {
							image: "$image.url",
						},
					},
					{
						$project: {
							_id: 0,
							title: 1,
							image: 1,
						},
					},
				],
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$addFields: {
				product: {
					$first: "$product",
				},
			},
		},
		{
			$project: {
				product: 1,
				orderStatus: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				transactions,
				"Transactions retrieved successfully"
			)
		);
});

const getAllUserAsRecipientTransactions = asyncHandler(async (req, res) => {
	const transactions = await Transaction.aggregate([
		{
			$match: {
				recipient: new mongoose.Types.ObjectId(req.user?._id),
			},
		},
		{
			$lookup: {
				from: "products",
				localField: "productOffered",
				foreignField: "_id",
				as: "product",
				pipeline: [
					{
						$addFields: {
							image: "$image.url",
						},
					},
					{
						$project: {
							_id: 0,
							title: 1,
							image: 1,
						},
					},
				],
			},
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$addFields: {
				product: {
					$first: "$product",
				},
			},
		},
		{
			$project: {
				product: 1,
				orderStatus: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				transactions,
				"Transactions retrieved successfully"
			)
		);
});

const getTransactionDetails = asyncHandler(async (req, res) => {
	const { transactionId } = req.params;

	if (!transactionId || !isValidObjectId(transactionId)) {
		throw new ApiError(400, "Invalid or missing transaction ID");
	}

	const transaction = await Transaction.findById(transactionId);
	if (!transaction) {
		throw new ApiError(404, "Transaction not found");
	}

	const isInitiator =
		transaction.initiatedBy?.toString() === req.user?._id?.toString();

	const getTransaction = await Transaction.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(transactionId),
			},
		},
		{
			$lookup: {
				from: "products",
				localField: "productOffered",
				foreignField: "_id",
				as: "productOffer",
				pipeline: [
					{
						$addFields: {
							image: "$image.url",
						},
					},
					{
						$project: {
							title: 1,
							description: 1,
							image: 1,
							condition: 1,
							category: 1,
							createdAt: 1,
						},
					},
				],
			},
		},
		{
			$lookup: {
				from: "products",
				localField: "productRequested",
				foreignField: "_id",
				as: "productRequest",
				pipeline: [
					{
						$addFields: {
							image: "$image.url",
						},
					},
					{
						$project: {
							title: 1,
							description: 1,
							image: 1,
							condition: 1,
							category: 1,
							createdAt: 1,
						},
					},
				],
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "initiatedBy",
				foreignField: "_id",
				as: "initiatedUser",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							avatar: 1,
							name: 1,
						},
					},
				],
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "recipient",
				foreignField: "_id",
				as: "recipientUser",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							avatar: 1,
							name: 1,
						},
					},
				],
			},
		},
		{
			$addFields: {
				productOffer: {
					$first: "$productOffer",
				},
				productRequest: {
					$first: "$productRequest",
				},
				initiatedUser: {
					$first: "$initiatedUser",
				},
				recipientUser: {
					$first: "$recipientUser",
				},
			},
		},
		{
			$project: {
				productOffer: 1,
				productRequest: 1,
				orderStatus: 1,
				remarks: 1,
				initiatedUser: 1,
				recipientUser: 1,
			},
		},
	]);

	if (getTransaction.length > 0) {
		getTransaction[0].isInitiator = isInitiator;
	}

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				getTransaction,
				"Transaction retrieved successfully"
			)
		);
});

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
		throw new ApiError(404, "ID of product put up for bartering not found");
	}

	const productRequested = await Product.findById(productRequestedId);
	if (!productRequested) {
		throw new ApiError(
			404,
			"ID of product requested for bartering not found"
		);
	}

	if (productOffered.owner.toString() !== req.user?._id.toString()) {
		throw new ApiError(403, "Access Forbidden.");
	}
	if (productRequested.owner.toString() === req.user?._id.toString()) {
		throw new ApiError(403, "Access Forbidden.");
	}

	const existingTransaction = await Transaction.findOne({
		$or: [
			{
				productOffered: productOfferedId,
				productRequested: productRequestedId,
			},
			{
				productOffered: productRequestedId,
				productRequested: productOfferedId,
			},
		],
	});

	if (existingTransaction) {
		throw new ApiError(
			409,
			"A transaction with these products already exists."
		);
	}

	const transaction = await Transaction.create({
		productOffered: productOfferedId,
		productRequested: productRequestedId,
		remarks,
		initiatedBy: req.user?._id,
		recipient: productRequested.owner,
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

const updateTransaction = asyncHandler(async (req, res) => {
	const { orderStatus } = req.body;
	const { transactionId } = req.params;

	if (!transactionId || !isValidObjectId(transactionId)) {
		throw new ApiError(400, "Invalid or missing transaction ID");
	}

	if (!(orderStatus === "accepted" || orderStatus === "cancelled")) {
		throw new ApiError(400, "Entered an incorrect order status value");
	}

	const transaction = await Transaction.findById(transactionId);
	if (!transaction) {
		throw new ApiError(404, "Transaction not found");
	}

	await Transaction.findByIdAndUpdate(transactionId, {
		$set: {
			orderStatus,
		},
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Transaction updated successfully"));
});

export {
	getAllUserAsInitiatorTransactions,
	getAllUserAsRecipientTransactions,
	getTransactionDetails,
	initiateTransaction,
	updateTransaction,
};

/*
get all user as initiator transactions ✔️
get all user as recipient transactions ✔️
get transaction details initiated by user (id) ✔️
get transaction details initiated for user (id) ✔️
initiate transaction (2 product ids) ✔️
update transaction status [id] ✔️
*/
