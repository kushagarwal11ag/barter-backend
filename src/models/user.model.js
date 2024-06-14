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
			default: 1,
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
			index: true,
		},
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

userSchema.pre("remove", async function (next) {
	try {
		const userId = this._id;

		const products = await mongoose
			.model("Product")
			.find({ owner: userId });
		const productIds = products.map((product) => product._id);
		await mongoose
			.model("User")
			.updateMany(
				{ wishlist: { $in: productIds } },
				{ $pull: { wishlist: { $in: productIds } } }
			);

		await mongoose.model("Product").deleteMany({ owner: userId });
		await mongoose.model("Feedback").deleteMany({
			$or: [
				{
					feedBackTo: userId,
				},
				{
					feedBackBy: userId,
				},
			],
		});
		await mongoose.model("Follower").deleteMany({
			$or: [
				{
					following: userId,
				},
				{
					follower: userId,
				},
			],
		});
		await mongoose.model("Message").deleteMany({
			$or: [
				{
					from: userId,
				},
				{
					to: userId,
				},
			],
		});
		await mongoose.model("Notification").deleteMany({ user: userId });
		await mongoose.model("Transaction").deleteMany({
			$or: [
				{
					initiator: userId,
				},
				{
					recipient: userId,
				},
			],
		});

		next();
	} catch (error) {
		console.error("Error during user removal cleanup:", error);
		next(error);
	}
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
