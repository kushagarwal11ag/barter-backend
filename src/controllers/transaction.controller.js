import mongoose, { isValidObjectId } from "mongoose";
import Transaction from "../models/transaction.model.js";
import Product from "../models/product.model.js";
import Notification from "../models/notification.model.js";
import { validateTransaction } from "../utils/validators.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const getAllUserAsInitiatorTransactions = asyncHandler(async (req, res) => {
	const transactions = await Transaction.aggregate([
		{
			$match: {
				initiator: new mongoose.Types.ObjectId(req.user?._id),
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
			$lookup: {
				from: "users",
				localField: "recipient",
				foreignField: "_id",
				as: "recipient",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							_id: 0,
							name: 1,
							avatar: 1,
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
				recipient: {
					$first: "$recipient",
				},
			},
		},
		{
			$project: {
				transactionType: 1,
				product: 1,
				priceOffered: 1,
				priceRequested: 1,
				orderStatus: 1,
				recipient: 1,
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
			$lookup: {
				from: "users",
				localField: "initiator",
				foreignField: "_id",
				as: "initiator",
				pipeline: [
					{
						$addFields: {
							avatar: "$avatar.url",
						},
					},
					{
						$project: {
							_id: 0,
							name: 1,
							avatar: 1,
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
				initiator: {
					$first: "$initiator",
				},
			},
		},
		{
			$project: {
				transactionType: 1,
				product: 1,
				priceOffered: 1,
				priceRequested: 1,
				orderStatus: 1,
				initiator: 1,
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

	const transaction = await Transaction.aggregate([
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
							isBarter: 1,
							price: 1,
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
							isBarter: 1,
							price: 1,
							createdAt: 1,
						},
					},
				],
			},
		},
		{
			$lookup: {
				from: "users",
				localField: "initiator",
				foreignField: "_id",
				as: "initiator",
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
				as: "recipient",
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
				initiator: {
					$first: "$initiator",
				},
				recipient: {
					$first: "$recipient",
				},
			},
		},
		{
			$project: {
				transactionType: 1,
				productOffer: 1,
				productRequest: 1,
				priceOffered: 1,
				priceRequested: 1,
				orderStatus: 1,
				initiator: 1,
				recipient: 1,
			},
		},
	]);

	if (!transaction.length) {
		throw new ApiError(404, "Transaction not found");
	}

	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				transaction,
				"Transaction retrieved successfully"
			)
		);
});

const initiateTransaction = asyncHandler(async (req, res) => {
	const {
		transactionType,
		productOfferedId,
		productRequestedId,
		priceOffered,
		priceRequested,
	} = req.body;

	if (!productOfferedId || !isValidObjectId(productOfferedId)) {
		throw new ApiError(400, "Invalid or missing product offered ID");
	}

	const { error } = validateTransaction({
		transactionType,
		priceOffered,
		priceRequested,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	if (
		(transactionType === "barter" || transactionType === "hybrid") &&
		(!productRequestedId || !isValidObjectId(productRequestedId))
	) {
		throw new ApiError(400, "Invalid or missing product requested ID");
	}

	const productOffered = await Product.findById(productOfferedId);
	if (!productOffered) {
		throw new ApiError(404, "Offered product not found");
	}

	let productRequested;
	if (productRequestedId) {
		productRequested = await Product.findById(productRequestedId);
		if (!productRequested) {
			throw new ApiError(404, "Requested product not found");
		}
		if (productRequested.owner.toString() === req.user._id.toString()) {
			throw new ApiError(
				403,
				"Cannot initiate transaction with own product."
			);
		}
	}

	if (productOffered.owner.toString() !== req.user._id.toString()) {
		throw new ApiError(
			403,
			"User is not the owner of the offered product."
		);
	}

	const existingTransaction = await Transaction.findOne({
		productOffered: productOfferedId,
		orderStatus: { $ne: "cancel" },
	});

	if (existingTransaction) {
		throw new ApiError(
			409,
			"An active transaction involving offered already exists."
		);
	}

	const transaction = await Transaction.create({
		transactionType,
		productOffered: productOfferedId,
		productRequested: productRequestedId,
		priceOffered:
			transactionType === "sale" || transactionType === "hybrid"
				? priceOffered
				: undefined,
		priceRequested:
			transactionType === "sale" || transactionType === "hybrid"
				? priceRequested
				: undefined,
		initiator: req.user._id,
		recipient: productRequested?.owner,
	});

	if (
		transaction &&
		(transactionType === "barter" || transactionType === "hybrid")
	) {
		await Notification.create({
			transactionId: transaction.insertedId,
			notificationType: "transaction",
			content: "A transaction was initiated",
			user: productRequested.owner,
		});
	}

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
	const { priceOffered, priceRequested, orderStatus } = req.body;
	const { transactionId } = req.params;

	if (!transactionId || !isValidObjectId(transactionId)) {
		throw new ApiError(400, "Invalid or missing transaction ID");
	}

	const { error } = validateTransaction({
		priceOffered,
		priceRequested,
		orderStatus,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	if ((priceOffered || priceRequested) && orderStatus !== "counter") {
		throw new ApiError(403, "Access forbidden.");
	}

	const transaction = await Transaction.findById(transactionId);
	if (!transaction) {
		throw new ApiError(404, "Transaction not found");
	}

	if (orderStatus === "accept" || orderStatus === "complete") {
		if (transaction.recipient.toString() !== req.user._id.toString()) {
			throw new ApiError(403, "Access forbidden.");
		}
	}

	await Transaction.findByIdAndUpdate(transactionId, {
		$set: {
			priceOffered:
				transaction.transactionType === "sale" ||
				transaction.transactionType === "hybrid"
					? priceOffered
					: 0,
			priceRequested:
				transaction.transactionType === "sale" ||
				transaction.transactionType === "hybrid"
					? priceRequested
					: 0,
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
get transaction details ✔️
initiate transaction - send notification ✔️
update transaction status - send notification

// if any product is not available, change status of transaction and return
*/
