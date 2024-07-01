import { Router } from "express";
import {
	getAllTransactions,
	getTransactionDetails,
	initiateTransaction,
	updateTransactionAsInitiator,
	updateTransactionAsRecipient,
} from "../controllers/transaction.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import checkVerificationAndBan from "../middlewares/checkVerificationAndBan.middleware.js";

const router = Router();

//secured routes
router.route("/").get(verifyJWT, checkVerificationAndBan, getAllTransactions);
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
