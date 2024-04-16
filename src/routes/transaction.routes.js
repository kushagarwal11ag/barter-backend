import { Router } from "express";
import {
	getAllUserAsInitiatorTransactions,
	getAllUserAsRecipientTransactions,
	getTransactionDetails,
	initiateTransaction,
	updateTransaction,
} from "../controllers/transaction.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

//secured routes
router
	.route("/user/initiator")
	.get(verifyJWT, getAllUserAsInitiatorTransactions);
router
	.route("/user/recipient")
	.get(verifyJWT, getAllUserAsRecipientTransactions);
router
	.route("/:transactionId")
	.get(verifyJWT, getTransactionDetails);
router
	.route("/transaction/add/:productRequestedId")
	.post(verifyJWT, initiateTransaction);
router
	.route("/transaction/update/:transactionId")
	.patch(verifyJWT, updateTransaction);

export default router;
