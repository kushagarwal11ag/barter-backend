import mongoose, { isValidObjectId } from "mongoose";
import Transaction from "../models/transaction.model.js";
import Product from "../models/product.model.js";
import Notification from "../models/notification.model.js";
import { validateTransaction } from "../utils/validators.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const handleSale = async (userId, priceRequested, productRequested, res) => {
	const { error } = validateTransaction({
		priceRequested,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}
	if (!priceRequested) {
		throw new ApiError(400, "No amount provided for sale");
	}
	if (productRequested.isBarter) {
		throw new ApiError(403, "Transaction type invalid");
	}

	const transaction = await Transaction.create({
		transactionType: "sale",
		productRequested: productRequested._id,
		priceRequested,
		initiator: userId,
		recipient: productRequested.owner._id,
	});

	await Notification.create({
		transactionId: transaction._id,
		notificationType: "transaction",
		content: "Transaction requested",
		user: productRequested.owner._id,
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Transaction initiated successfully"));
};

const handleBarter = async (userId, productRequested, productOffered, res) => {
	const transaction = await Transaction.create({
		transactionType: "barter",
		productOffered: productOffered._id,
		productRequested: productRequested._id,
		initiator: userId,
		recipient: productRequested.owner._id,
	});

	await Notification.create({
		transactionId: transaction._id,
		notificationType: "transaction",
		content: "Transaction requested",
		user: productRequested.owner._id,
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Transaction initiated successfully"));
};

const handleHybrid = async (
	userId,
	productRequested,
	productOffered,
	priceOffered,
	priceRequested,
	res
) => {
	const { error } = validateTransaction({
		priceOffered,
		priceRequested,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	let newPriceOffered = priceOffered;
	let newPriceRequested = priceRequested;

	if (newPriceOffered > 0 && newPriceRequested > 0) {
		if (newPriceOffered > newPriceRequested) {
			newPriceOffered -= newPriceRequested;
			newPriceRequested = 0;
		} else if (newPriceOffered < newPriceRequested) {
			newPriceRequested -= newPriceOffered;
			newPriceOffered = 0;
		} else {
			newPriceOffered = newPriceRequested = 0;
		}
	} else if (newPriceOffered === 0 && newPriceRequested === 0) {
		throw new ApiError(400, "Enter amount to initiate Hybrid exchange");
	}

	const transaction = await Transaction.create({
		transactionType: "hybrid",
		productOffered: productOffered._id,
		productRequested: productRequested._id,
		priceOffered: newPriceOffered,
		priceRequested: newPriceRequested,
		initiator: userId,
		recipient: productRequested.owner._id,
	});

	await Notification.create({
		transactionId: transaction._id,
		notificationType: "transaction",
		content: "Transaction requested",
		user: productRequested.owner._id,
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Transaction initiated successfully"));
};

const getAllUserAsInitiatorTransactions = asyncHandler(async (req, res) => {
	const userId = req.user._id;
	const blocked = req.user.blockedUsers;
	const transactions = await Transaction.aggregate([
		{
			$match: {
				initiator: new mongoose.Types.ObjectId(userId),
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
						$match: {
							isAvailable: true,
							owner: { $nin: blocked },
						},
					},
					{
						$addFields: {
							image: "$image.url",
						},
					},
					{
						$lookup: {
							from: "users",
							localField: "owner",
							foreignField: "_id",
							as: "recipient",
							pipeline: [
								{
									$match: {
										blockedUsers: {
											$nin: [
												new mongoose.Types.ObjectId(
													userId
												),
											],
										},
										isBanned: {
											$ne: true,
										},
									},
								},
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
						$project: {
							_id: 0,
							title: 1,
							image: 1,
							owner: { $ifNull: ["$recipient", null] },
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
			$project: {
				createdAt: 0,
				updatedAt: 0,
				__v: 0,
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
	const userId = req.user._id;
	const blocked = req.user.blockedUsers;
	const transactions = await Transaction.aggregate([
		{
			$match: {
				recipient: new mongoose.Types.ObjectId(userId),
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
						$match: {
							isAvailable: true,
							owner: { $nin: blocked },
						},
					},
					{
						$addFields: {
							image: "$image.url",
						},
					},
					{
						$lookup: {
							from: "users",
							localField: "owner",
							foreignField: "_id",
							as: "recipient",
							pipeline: [
								{
									$match: {
										blockedUsers: {
											$nin: [
												new mongoose.Types.ObjectId(
													userId
												),
											],
										},
										isBanned: {
											$ne: true,
										},
									},
								},
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
						$project: {
							_id: 0,
							title: 1,
							image: 1,
							owner: { $ifNull: ["$recipient", null] },
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
			$project: {
				createdAt: 0,
				updatedAt: 0,
				__v: 0,
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

	const userId = req.user._id;
	const blocked = req.user.blockedUsers;

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
							updatedAt: 0,
							__v: 0,
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
							updatedAt: 0,
							__v: 0,
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
				isBlocked: {
					$or: [
						{
							$in: [
								new mongoose.Types.ObjectId(userId),
								"$blockedUsers",
							],
						},
						{
							$in: ["$_id", blocked],
						},
					],
				},
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
				updatedAt: 0,
				__v: 0,
			},
		},
	]);

	if (!transaction.length) {
		throw new ApiError(404, "Transaction not found");
	}

	if (transaction?.isBlocked) {
		throw new ApiError(403, "Access forbidden. User blocked");
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

	if (!productRequestedId || !isValidObjectId(productRequestedId)) {
		throw new ApiError(400, "Invalid or missing product requested ID");
	}
	const productRequested = await Product.findById(
		productRequestedId
	).populate({
		path: "owner",
		select: "_id, isBanned, blockedUsers",
	});
	if (!productRequested) {
		throw new ApiError(404, "Requested product not found");
	}

	if (
		!productRequested.isAvailable ||
		productRequested.owner.isBanned ||
		productRequested.owner.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(productRequested.owner._id)
	) {
		throw new ApiError(403, "Access forbidden.");
	}

	if (productRequested.owner._id.toString() === req.user._id.toString()) {
		throw new ApiError(
			403,
			"Cannot initiate transaction with own product."
		);
	}

	const activeTransaction = await Transaction.findOne({
		$or: [
			{ productOffered: productRequested._id },
			{ productRequested: productRequested._id },
		],
		orderStatus: { $nin: ["cancel", "pending"] },
	});
	if (activeTransaction) {
		throw new ApiError(
			409,
			"Requested product is already involved in another transaction."
		);
	}
	const duplicateTransaction = await Transaction.findOne({
		productRequested: productRequested._id,
		initiator: req.user._id,
		orderStatus: { $ne: "cancel" },
	});
	if (duplicateTransaction) {
		throw new ApiError(409, "Cannot create multiple transactions.");
	}

	const { error } = validateTransaction({
		transactionType,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	const userId = req.user._id;
	if (transactionType === "sale")
		handleSale(userId, priceRequested, productRequested, res);
	else {
		if (!productRequested.isBarter) {
			throw new ApiError(403, "Transaction type invalid");
		}
		if (!productOfferedId || !isValidObjectId(productOfferedId)) {
			throw new ApiError(400, "Invalid or missing product offered ID");
		}

		const productOffered = await Product.findById(productOfferedId);
		if (!productOffered) {
			throw new ApiError(404, "Offered product not found");
		}
		if (productOffered.owner.toString() !== userId.toString()) {
			throw new ApiError(403, "Access forbidden");
		}
		if (!productOffered.isBarter) {
			throw new ApiError(403, "Transaction type invalid");
		}

		const existingTransaction = await Transaction.findOne({
			$or: [
				{ productOffered: productOfferedId },
				{ productRequested: productOfferedId },
			],
			orderStatus: { $nin: ["cancel", "pending"] },
		});
		if (existingTransaction) {
			throw new ApiError(
				409,
				"Offered product is already involved in another transaction."
			);
		}
		if (transactionType === "barter")
			handleBarter(userId, productRequested, productOffered, res);
		else
			handleHybrid(
				userId,
				productRequested,
				productOffered,
				priceOffered,
				priceRequested,
				res
			);
	}
});

const updateTransactionAsInitiator = asyncHandler(async (req, res) => {
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

	const transaction = await Transaction.findById(transactionId);
	if (!transaction) {
		throw new ApiError(404, "Transaction not found");
	}
	if (transaction.initiator.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "Access forbidden");
	}
	if (
		transaction.orderStatus === "cancel" ||
		transaction.orderStatus === "complete" ||
		transaction.orderStatus === "accept" ||
		orderStatus === "accept" ||
		orderStatus === "complete"
	) {
		throw new ApiError(403, "Access denied.");
	}

	const productRequestedDetails = transaction.populate({
		path: "productRequested",
		populate: {
			path: "owner",
			select: "_id, isBanned, blockedUsers",
		},
	});

	if (
		productRequestedDetails.owner.isBanned ||
		productRequestedDetails.owner.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(productRequestedDetails.owner._id)
	) {
		throw new ApiError(403, "Access forbidden.");
	}

	const existingTransaction = await Transaction.findOne({
		_id: { $ne: transactionId },
		$or: [
			{ productRequested: transaction.productRequested },
			{ productOffered: transaction.productRequested },
		],
		$or: [
			{ productRequested: transaction.productOffered },
			{ productOffered: transaction.productOffered },
		],
		orderStatus: { $nin: ["pending", "cancel"] },
	});
	if (existingTransaction) {
		await Transaction.findByIdAndUpdate(transactionId, {
			orderStatus: "cancel",
		});
		throw new ApiError(
			403,
			"This transaction cannot be completed. Another transaction in progress."
		);
	}

	if (orderStatus === "cancel") {
		await Transaction.findByIdAndUpdate(transactionId, {
			orderStatus: "cancel",
		});

		await Notification.create({
			transactionId: transactionId,
			notificationType: "transaction",
			content: "Transaction cancelled",
			user: transaction.recipient,
		});

		return res
			.status(200)
			.json(
				200,
				new ApiResponse(200, {}, "Transaction cancelled successfully")
			);
	}

	const isSale = transaction.transactionType === "sale";
	const isHybrid = transaction.transactionType === "hybrid";

	if (isSale) {
		if (
			priceOffered !== transaction.priceOffered &&
			orderStatus !== "cancel"
		) {
			await Transaction.findByIdAndUpdate(transactionId, {
				priceOffered,
			});

			await Notification.create({
				transactionId: transactionId,
				notificationType: "transaction",
				content: "Transaction price updated",
				user: transaction.recipient,
			});

			return res
				.status(200)
				.json(
					200,
					new ApiResponse(200, {}, "Transaction updated successfully")
				);
		} else {
			throw new ApiError(400, "Proper fields for updating not provided.");
		}
	}

	if (isHybrid) {
		if (
			priceOffered >= 0 &&
			priceRequested >= 0 &&
			orderStatus !== "cancel"
		) {
			if (priceOffered > priceRequested) {
				priceOffered = priceOffered - priceRequested;
				priceRequested = 0;
			} else if (priceOffered < priceRequested) {
				priceRequested = priceRequested - priceOffered;
				priceOffered = 0;
			} else {
				priceOffered = priceRequested = 0;
			}
			await Transaction.findByIdAndUpdate(transactionId, {
				priceOffered,
				priceRequested,
			});

			await Notification.create({
				transactionId: transactionId,
				notificationType: "transaction",
				content: "Transaction price updated",
				user: transaction.recipient,
			});

			return res
				.status(200)
				.json(
					200,
					new ApiResponse(200, {}, "Transaction updated successfully")
				);
		} else {
			throw new ApiError(400, "Proper fields for updating not provided.");
		}
	}

	throw new ApiError(400, "Proper fields for updating not provided.");
});

const updateTransactionAsRecipient = asyncHandler(async (req, res) => {
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

	const transaction = await Transaction.findById(transactionId);
	if (!transaction) {
		throw new ApiError(404, "Transaction not found");
	}
	if (transaction.recipient.toString() !== req.user._id.toString()) {
		throw new ApiError(403, "Access forbidden");
	}
	if (
		transaction.orderStatus === "cancel" ||
		transaction.orderStatus === "complete" ||
		transaction.orderStatus === "accept" ||
		orderStatus === "complete"
	) {
		throw new ApiError(403, "Access denied.");
	}

	const productOfferedDetails = transaction.populate({
		path: "productOffered",
		populate: {
			path: "owner",
			select: "_id, isBanned, blockedUsers",
		},
	});

	if (
		productOfferedDetails.owner.isBanned ||
		productOfferedDetails.owner.blockedUsers?.includes(req.user._id) ||
		req.user.blockedUsers?.includes(productOfferedDetails.owner._id)
	) {
		throw new ApiError(403, "Access forbidden.");
	}

	const existingTransaction = await Transaction.findOne({
		_id: { $ne: transactionId },
		$or: [
			{ productRequested: transaction.productRequested },
			{ productOffered: transaction.productRequested },
		],
		$or: [
			{ productRequested: transaction.productOffered },
			{ productOffered: transaction.productOffered },
		],
		orderStatus: { $nin: ["pending", "cancel"] },
	});
	if (existingTransaction) {
		await Transaction.findByIdAndUpdate(transactionId, {
			orderStatus: "cancel",
		});
		throw new ApiError(
			403,
			"This transaction cannot be completed. Another transaction in progress."
		);
	}

	if (orderStatus === "cancel") {
		await Transaction.findByIdAndUpdate(transactionId, {
			orderStatus: "cancel",
		});

		await Notification.create({
			transactionId: transactionId,
			notificationType: "transaction",
			content: "Transaction cancelled",
			user: transaction.initiator,
		});

		return res
			.status(200)
			.json(
				200,
				new ApiResponse(200, {}, "Transaction cancelled successfully")
			);
	} else if (orderStatus === "accept") {
		await Transaction.findByIdAndUpdate(transactionId, {
			orderStatus: "accept",
		});

		await Notification.create({
			transactionId: transactionId,
			notificationType: "transaction",
			content: "Transaction accepted",
			user: transaction.initiator,
		});

		return res
			.status(200)
			.json(
				200,
				new ApiResponse(200, {}, "Transaction accepted successfully")
			);
	}

	const isHybrid = transaction.transactionType === "hybrid";

	if (isHybrid) {
		if (
			priceOffered >= 0 &&
			priceRequested >= 0 &&
			orderStatus !== "cancel"
		) {
			if (priceOffered > priceRequested) {
				priceOffered = priceOffered - priceRequested;
				priceRequested = 0;
			} else if (priceOffered < priceRequested) {
				priceRequested = priceRequested - priceOffered;
				priceOffered = 0;
			} else {
				priceOffered = priceRequested = 0;
			}
			await Transaction.findByIdAndUpdate(transactionId, {
				priceOffered,
				priceRequested,
			});

			await Notification.create({
				transactionId: transactionId,
				notificationType: "transaction",
				content: "Transaction price updated",
				user: transaction.initiator,
			});

			return res
				.status(200)
				.json(
					200,
					new ApiResponse(200, {}, "Transaction updated successfully")
				);
		} else {
			throw new ApiError(400, "Proper fields for updating not provided.");
		}
	}

	throw new ApiError(400, "Proper fields for updating not provided.");
});

export {
	getAllUserAsInitiatorTransactions,
	getAllUserAsRecipientTransactions,
	getTransactionDetails,
	initiateTransaction,
	updateTransactionAsInitiator,
	updateTransactionAsRecipient,
};

/*
get all user as initiator transactions ✔️
get all user as recipient transactions ✔️
get transaction details ✔️
initiate transaction - send notification ✔️
update transaction status - send notification ✔️
*/
