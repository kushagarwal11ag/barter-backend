import { Router } from "express";
import {
	getAllUserAsInitiatorTransactions,
	getAllUserAsRecipientTransactions,
	getTransactionDetails,
	initiateTransaction,
	updateTransaction,
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
	.get(verifyJWT, checkVerificationAndBan, getTransactionDetails)
	.patch(verifyJWT, checkVerificationAndBan, updateTransaction);
router
	.route("/add")
	.post(verifyJWT, checkVerificationAndBan, initiateTransaction);

export default router;
