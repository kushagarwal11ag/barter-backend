import { Router } from "express";
import {
	getAllUserAsInitiatorTransactions,
	getAllUserAsRecipientTransactions,
	getTransactionDetails,
	initiateTransaction,
	updateTransactionAsInitiator,
	updateTransactionAsRecipient,
} from "../controllers/transaction.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

//secured routes
router
	.route("/user/initiator")
	.get(verifyJWT, checkVerificationAndBan, getAllUserAsInitiatorTransactions);
router
	.route("/user/recipient")
	.get(verifyJWT, checkVerificationAndBan, getAllUserAsRecipientTransactions);
router
	.route("/:transactionId")
	.get(verifyJWT, checkVerificationAndBan, getTransactionDetails);
router
	.route("/add")
	.post(verifyJWT, checkVerificationAndBan, initiateTransaction);
router
	.route("/initiate/:transactionId")
	.patch(verifyJWT, checkVerificationAndBan, updateTransactionAsInitiator);
router
	.route("/recipient/:transactionId")
	.patch(verifyJWT, checkVerificationAndBan, updateTransactionAsRecipient);

export default router;
