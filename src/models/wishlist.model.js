import mongoose, { Schema } from "mongoose";

const wishlistSchema = new Schema({
	product: {
		type: Schema.Types.ObjectId,
		ref: "Product",
	},
	owner: {
		type: Schema.Types.ObjectId,
		ref: "User",
	},
});

export const Wishlist = mongoose.model("Wishlist", wishlistSchema);
