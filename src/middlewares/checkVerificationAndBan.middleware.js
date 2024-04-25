import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const checkVerificationAndBan = asyncHandler(async (req, _, next) => {
	if (req.user?.isBanned) {
		throw new ApiError(403, "Forbidden Access. User account has been banned");
	}
	if (!req.user?.isVerified) {
		throw new ApiError(403, "Forbidden Access. User not verified");
	}
	next();
});

export default checkVerificationAndBan;
