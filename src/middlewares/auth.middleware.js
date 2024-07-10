import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
	try {
		const accessToken =
			req.cookies?.accessToken ||
			req.header("Authorization")?.replace("Bearer ", "");

		if (!accessToken) {
			throw new ApiError(401, "No access token provided. Please log in.");
		}

		const decodedToken = jwt.verify(
			accessToken,
			process.env.ACCESS_TOKEN_SECRET
		);
		const user = await User.findById(decodedToken?._id).select(
			"-password -refreshToken"
		);

		if (!user || user.tokenVersion !== decodedToken.tokenVersion) {
			throw new ApiError(401, "Invalid Access Token.");
		}
		
		req.user = user;
		next();
	} catch (error) {
		if (error.name === "TokenExpiredError")
			throw new ApiError(401, "Access token expired. Please refresh.");
		throw new ApiError(401, error?.message || "Invalid access token. Please authenticate.");
	}
});

export default verifyJWT;
