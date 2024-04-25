import mongoose, { Schema } from "mongoose";

const followerSchema = new Schema({
	following: {
		type: Schema.Types.ObjectId,
		ref: "User",
	},
	follower: {
		type: Schema.Types.ObjectId,
		ref: "User",
	},
});

export const Follower = mongoose.model("Follower", followerSchema);
