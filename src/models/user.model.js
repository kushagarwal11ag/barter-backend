import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		password: {
			type: String,
			required: [true, "Password is required"],
		},
		avatar: {
			id: String,
			url: String,
		},
		banner: {
			id: String,
			url: String,
		},
		bio: {
			type: String,
		},
		phone: {
			type: String,
		},
		rating: {
			type: Number,
			default: 0,
		},
		displayEmail: {
			type: Boolean,
			default: true,
		},
		displayPhone: {
			type: Boolean,
			default: true,
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
		blockedUsers: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		isBanned: {
			type: Boolean,
			default: false,
		},
		productsNotInterestedIn: [
			{
				type: Schema.Types.ObjectId,
				ref: "Product",
			},
		],
		wishlist: [
			{
				type: Schema.Types.ObjectId,
				ref: "Product",
			},
		],
		refreshToken: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	this.password = await bcrypt.hash(this.password, 10);
	next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
	return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function () {
	return jwt.sign(
		{
			_id: this._id,
		},
		process.env.ACCESS_TOKEN_SECRET,
		{
			expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
		}
	);
};

userSchema.methods.generateRefreshToken = async function () {
	return jwt.sign(
		{
			_id: this._id,
		},
		process.env.REFRESH_TOKEN_SECRET,
		{
			expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
		}
	);
};

const User = mongoose.model("User", userSchema);
export default User;
