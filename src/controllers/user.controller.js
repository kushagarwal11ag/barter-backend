import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";

const options = {
	httpOnly: true,
	secure: true,
};

const generateAccessAndRefreshTokens = async (userId) => {
	try {
		const user = await User.findById(userId);
		const accessToken = user.generateAccessToken();
		const refreshToken = user.generateRefreshToken();

		user.refreshToken = refreshToken;
		await user.save({ validateBeforeSave: false });

		return { accessToken, refreshToken };
	} catch (error) {
		throw new ApiError(500, "Error generating tokens");
	}
};

/*
register user
get current user
get user (id)
get all user products
login user
update user
change password
update avatar or banner
delete avatar or banner
update status
update rating
follow / un-follow user (id)
get refresh token
refresh access token
logout user
*/

export { generateAccessAndRefreshTokens };
