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
		bio: {
			type: String,
		},
		location: {
			type: String,
		},
		refreshToken: {
			type: String,
		},
		/*
		phone: {
			type: String,
		},
		banner: {
			id: String,
			url: String,
		},
		status: {
			type: Boolean,
			default: true,
		},
		rating: {
			type: Number,
			default: 0,
		},
		interestedProducts: [
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
		*/
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
