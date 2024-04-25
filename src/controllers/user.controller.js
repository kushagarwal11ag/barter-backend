import mongoose, { isValidObjectId } from "mongoose";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
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
};

// helper methods
const generateAccessAndRefreshTokens = async (userId) => {
	try {
		const user = await User.findById(userId);
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

	const user = await User.findOne({ email }).select(
		"-password -displayEmail -displayPhone -refreshToken"
	);
	if (!user) {
		throw new ApiError(404, "User not found");
	}

	const isPasswordValid = await user.isPasswordCorrect(password);
	if (!isPasswordValid) {
		throw new ApiError(401, "Invalid Credentials");
	}

	const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
		user._id
	);

	return res
		.status(200)
		.cookie("accessToken", accessToken, options)
		.cookie("refreshToken", refreshToken, options)
		.json(
			new ApiResponse(
				200,
				{
					user,
					accessToken,
					refreshToken,
				},
				"User logged in successfully"
			)
		);
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
	const { oldPassword, newPassword } = req.body;
	if (!oldPassword || !newPassword) {
		throw new ApiError(400, "Both old and new passwords are required");
	}

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

	const user = req.user;
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
	return res
		.status(200)
		.json(
			new ApiResponse(
				200,
				req.user,
				"Current user retrieved successfully"
			)
		);
});

const getUserById = asyncHandler(async (req, res) => {
	const { userId } = req.params;

	if (!userId || !isValidObjectId(userId)) {
		throw new ApiError(400, "Invalid or missing user ID");
	}

	const loggedInUserId = req.user?._id;

	const user = await User.aggregate([
		{
			$match: {
				_id: new mongoose.Types.ObjectId(userId),
			},
		},
		{
			$lookup: {
				from: "products",
				localField: "_id",
				foreignField: "owner",
				as: "product",
				pipeline: [
					{
						$match: {
							isAvailable: true,
						},
					},
					{
						$project: {
							title: 1,
							images: 1,
							category: 1,
						},
					},
				],
			},
		},
		{
			$addFields: {
				avatar: "$avatar.url",
				banner: "$banner.url",
				isBlocked: {
					$in: [loggedInUserId, "$blockedUsers"],
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
				product: 1,
			},
		},
	]);

	if (!user.length) {
		throw new ApiError(404, "User not found");
	}

	if (user?.[0]?.isBlocked) {
		throw new ApiError(403, "Access denied. You are blocked by this user.");
	}
	delete user?.[0]?.isBlocked;

	return res
		.status(200)
		.json(new ApiResponse(200, user?.[0], "User retrieved successfully"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
	const { name, bio, phone, location } = req.body;
	if (!(name?.trim() || bio?.trim() || phone?.trim() || location?.trim())) {
		throw new ApiError(400, "No field requested for update");
	}

	await User.findByIdAndUpdate(req.user?._id, {
		$set: {
			name,
			bio,
			phone,
			location,
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
		const banner = await handleFileUpload(bannerLocalPath, "govId");
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
	await User.findByIdAndUpdate(
		req.user?._id,
		{
			$unset: {
				refreshToken: 1,
			},
		},
		{
			new: true,
		}
	);

	return res
		.status(200)
		.clearCookie("accessToken", options)
		.clearCookie("refreshToken", options)
		.json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
	const incomingRefreshToken =
		req.cookies?.refreshToken || req.body?.refreshToken;

	if (!incomingRefreshToken) {
		throw new ApiError(401, "Unauthorized request");
	}

	try {
		const decodedToken = await jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);
		const user = await User.findById(decodedToken?._id);

		if (!user || incomingRefreshToken !== user?.refreshToken) {
			throw new ApiError(401, "Invalid or expired refresh token.");
		}

		const { accessToken, refreshToken: newRefreshToken } =
			await generateAccessAndRefreshTokens(user._id);

		return res
			.status(200)
			.cookie("accessToken", accessToken, options)
			.cookie("refreshToken", newRefreshToken, options)
			.json(
				new ApiResponse(
					200,
					{ accessToken, refreshToken: newRefreshToken },
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
	refreshAccessToken,
};

/*
register user ✔️
login user ✔️
change password ✔️
get current user ✔️
get user -> products ✔️ (follower count, feedback)
update user details ✔️
update files (avatar, banner) ✔️
logout user ✔️
refresh access token ✔️

// retrieve notifications
// follow / un-follow user (id)
*/
