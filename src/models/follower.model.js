/*
import mongoose, { Schema } from "mongoose";

const followerSchema = new Schema(
	{
		following: { // being followed to
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		follower: { // being followed by
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

export const Follower = mongoose.model("Follower", followerSchema);
*/