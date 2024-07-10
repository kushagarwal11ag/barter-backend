import mongoose, { isValidObjectId } from "mongoose";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Transaction from "../models/transaction.model.js";
import Notification from "../models/notification.model.js";
import Message from "../models/message.model.js";
import Feedback from "../models/feedback.model.js";
import Follower from "../models/follower.model.js";
import { validateUser } from "../utils/validators.js";
import {
	uploadOnCloudinary,
	deleteFromCloudinary,
} from "../utils/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";

const options = {
	httpOnly: true,
	secure: true,
	sameSite: "Strict",
};
const accessTokenExpiry = 15 * 60 * 1000; // 15 minutes
const refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days

// helper methods
const generateAccessAndRefreshTokens = async (user) => {
	try {
		const accessToken = await user.generateAccessToken();
		const refreshToken = await user.generateRefreshToken();

		user.refreshToken = refreshToken;
		await user.save({ validateBeforeSave: false });

		return { accessToken, refreshToken };
	} catch (error) {
		throw new ApiError(500, "Error generating tokens");
	}
};

const handleFileUpload = async (filePath, fileType) => {
	if (!filePath) return null;

	const uploadedFile = await uploadOnCloudinary(filePath);
	if (!uploadedFile?.url) {
		throw new ApiError(500, `Failed to upload ${fileType}`);
	}

	return { id: uploadedFile?.public_id, url: uploadedFile?.url };
};

// controller functions
const registerUser = asyncHandler(async (req, res) => {
	const { name, email, password } = req.body;

	const { error } = validateUser({ name, email, password });
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new ApiError(
			409,
			"A user with the provided email already exists"
		);
	}

	await User.create({ name, email, password });

	return res
		.status(201)
		.json(new ApiResponse(201, {}, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
	const { email, password } = req.body;

	const { error } = validateUser({ email, password });
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	const user = await User.findOne({ email });
	if (!user) {
		throw new ApiError(404, "User not found");
	}

	const isPasswordValid = await user.isPasswordCorrect(password);
	if (!isPasswordValid) {
		throw new ApiError(401, "Invalid Credentials");
	}

	const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
		user
	);

	const loggedInUser = user.toObject();
	delete loggedInUser.password;
	delete loggedInUser.displayEmail;
	delete loggedInUser.displayPhone;
	delete loggedInUser.isVerified;
	delete loggedInUser.isBanned;
	delete loggedInUser.refreshToken;
	delete loggedInUser.tokenVersion;

	return res
		.status(200)
		.cookie("accessToken", accessToken, {
			...options,
			maxAge: accessTokenExpiry,
			expires: new Date(Date.now() + accessTokenExpiry),
		})
		.cookie("refreshToken", refreshToken, {
			...options,
			maxAge: refreshTokenExpiry,
			expires: new Date(Date.now() + refreshTokenExpiry),
		})
		.json(
			new ApiResponse(
				200,
				{
					user: loggedInUser,
					accessToken,
					refreshToken,
				},
				"User logged in successfully"
			)
		);
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
	const { oldPassword, newPassword } = req.body;

	const { error: oldPasswordError } = validateUser({ password: oldPassword });
	const { error: newPasswordError } = validateUser({ password: newPassword });

	if (oldPasswordError || newPasswordError) {
		let errorMessage = oldPasswordError
			? oldPasswordError.details[0].message
			: newPasswordError.details[0].message;
		throw new ApiError(400, `Validation error: ${errorMessage}`);
	}

	if (oldPassword === newPassword) {
		throw new ApiError(400, "New password cannot be same as the old one");
	}

	const user = await User.findById(req.user._id);
	const isPasswordValid = await user.isPasswordCorrect(oldPassword);
	if (!isPasswordValid) {
		throw new ApiError(400, "The old password is incorrect");
	}

	user.password = newPassword;
	await user.save();

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
	const currentUser = req.user.toObject();
	delete currentUser.isVerified;
	delete currentUser.isBanned;
	delete currentUser.tokenVersion;
	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				currentUser,
				"Current user retrieved successfully"
			)
		);
});

const getUserById = asyncHandler(async (req, res) => {
	const { userId } = req.params;

	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	const isFollow = await Follower.exists({
		following: userId,
		follower: req.user._id,
	});

	const user = await User.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$addFields: {
				avatar: "$avatar.url",
				banner: "$banner.url",
				isBlocked: {
					$or: [
						{
							$in: [
								new mongoose.Types.ObjectId(req.user._id),
								"$blockedUsers",
							],
						}, // if logged-in user is blocked by this user
						{
							$in: ["$_id", req.user.blockedUsers],
						}, // if this user is blocked by logged-in user
					],
				},
			},
		},
		{
			$project: {
				email: {
					$cond: {
						if: "$displayEmail",
						then: "$email",
						else: "$$REMOVE",
					},
				},
				phone: {
					$cond: {
						if: "$displayPhone",
						then: "$phone",
						else: "$$REMOVE",
					},
				},
				name: 1,
				bio: 1,
				avatar: 1,
				banner: 1,
				rating: 1,
				isBanned: 1,
				isBlocked: 1,
				createdAt: 1,
			},
		},
	]);

	if (!user.length) {
		throw new ApiError(404, "User not found");
	}

	if (user[0]?.isBlocked || user[0]?.isBanned) {
		throw new ApiError(403, "Access denied.");
	}
	delete user[0]?.isBlocked;
	delete user[0]?.isBanned;

	const userDetails = {
		...user[0],
		isFollow: isFollow ? true : false,
	};

	return res
		.status(200)
		.json(new ApiResponse(200, userDetails, "User retrieved successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
	const { name, bio, phone, displayEmail, displayPhone } = req.body;

	const { error } = validateUser({
		name,
		bio,
		phone,
		displayEmail,
		displayPhone,
	});
	if (error) {
		throw new ApiError(
			400,
			`Validation error: ${error.details[0].message}`
		);
	}

	await User.findByIdAndUpdate(req.user?._id, {
		$set: {
			name,
			bio,
			phone,
			displayEmail,
			displayPhone,
		},
	});

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Account details updated successfully"));
});

const updateUserFiles = asyncHandler(async (req, res) => {
	const avatarLocalPath = req.files?.avatar?.[0]?.path;
	const bannerLocalPath = req.files?.banner?.[0]?.path;
	if (!(avatarLocalPath || bannerLocalPath)) {
		throw new ApiError(400, "Upload files to proceed");
	}

	const user = req.user;
	const uploadObject = {};

	if (avatarLocalPath) {
		const avatar = await handleFileUpload(avatarLocalPath, "avatar");
		uploadObject.avatar = {
			id: avatar.id,
			url: avatar.url,
		};
	}
	if (bannerLocalPath) {
		const banner = await handleFileUpload(bannerLocalPath, "banner");
		uploadObject.banner = {
			id: banner.id,
			url: banner.url,
		};
	}

	await User.findByIdAndUpdate(user?._id, {
		$set: {
			...uploadObject,
		},
	});

	if (avatarLocalPath && user?.avatar?.id) {
		await deleteFromCloudinary(user?.avatar?.id);
	}
	if (bannerLocalPath && user?.banner?.id) {
		await deleteFromCloudinary(user?.banner?.id);
	}

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "User files updated successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
	await User.findByIdAndUpdate(req.user?._id, {
		$unset: {
			refreshToken: 1,
		},
		$inc: {
			tokenVersion: 1,
		},
	});

	return res
		.status(200)
		.clearCookie("accessToken", {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
		})
		.clearCookie("refreshToken", {
			httpOnly: true,
			secure: true,
			sameSite: "Strict",
		})
		.json(new ApiResponse(200, {}, "User logged out successfully"));
});

const deleteAccount = asyncHandler(async (req, res) => {
	const userId = req.user._id;

	const feedbacks = await Feedback.find({ feedbackBy: userId });
	const products = await Product.find({ owner: userId });
	const transactions = await Transaction.find({
		$or: [
			{
				initiator: userId,
			},
			{
				recipient: userId,
			},
		],
	});

	await Feedback.deleteMany({
		$or: [
			{
				feedbackFor: userId,
			},
			{
				feedBackBy: userId,
			},
		],
	});

	await Follower.deleteMany({
		$or: [
			{
				following: userId,
			},
			{
				follower: userId,
			},
		],
	});

	await Message.deleteMany({
		$or: [
			{
				from: userId,
			},
			{
				to: userId,
			},
		],
	});

	await Notification.deleteMany({
		$or: [{ followedById: userId }, { user: userId }],
	});
	for (const feedback of feedbacks) {
		await Notification.deleteMany({ feedbackId: feedback._id });
	}
	for (const transaction of transactions) {
		await Notification.deleteMany({ transactionId: transaction._id });
	}

	for (const product of products) {
		if (product.image?.id) {
			await deleteFromCloudinary(product.image.id);
		}
		await User.updateMany({ $pull: { wishlist: product._id } });
	}
	await Product.deleteMany({ owner: userId });

	await Transaction.deleteMany({
		$or: [
			{
				initiator: userId,
			},
			{
				recipient: userId,
			},
		],
	});

	if (req.user.avatar?.id) {
		await deleteFromCloudinary(req.user.avatar.id);
	}
	if (req.user.banner?.id) {
		await deleteFromCloudinary(req.user.banner.id);
	}

	await User.updateMany({ $pull: { blockedUsers: userId } });
	await User.deleteOne({ _id: userId });

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Account deleted successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
	const incomingRefreshToken =
		req.cookies?.refreshToken || req.body?.refreshToken;

	if (!incomingRefreshToken) {
		throw new ApiError(
			401,
			"Unauthorized request. No refresh token provided"
		);
	}

	try {
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);
		const user = await User.findById(decodedToken?._id);

		if (
			!user ||
			incomingRefreshToken !== user.refreshToken ||
			decodedToken.tokenVersion !== user.tokenVersion
		) {
			throw new ApiError(401, "Invalid or expired refresh token.");
		}

		const { accessToken, refreshToken } =
			await generateAccessAndRefreshTokens(user);

		return res
			.status(200)
			.cookie("accessToken", accessToken, {
				...options,
				maxAge: accessTokenExpiry,
				expires: new Date(Date.now() + accessTokenExpiry),
			})
			.cookie("refreshToken", refreshToken, {
				...options,
				maxAge: refreshTokenExpiry,
				expires: new Date(Date.now() + refreshTokenExpiry),
			})
			.json(
				new ApiResponse(
					200,
					accessToken,
					refreshToken,
					"Access token refreshed successfully."
				)
			);
	} catch (error) {
		throw new ApiError(401, error?.message || "Invalid refresh token");
	}
});

export {
	registerUser,
	loginUser,
	changeCurrentPassword,
	getCurrentUser,
	getUserById,
	updateUserDetails,
	updateUserFiles,
	logoutUser,
	deleteAccount,
	refreshAccessToken,
};
