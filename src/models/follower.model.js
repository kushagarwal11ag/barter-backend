import mongoose, { Schema } from "mongoose";

const followerSchema = new Schema(
	{
		following: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
		follower: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

export const Follower = mongoose.model("Follower", followerSchema);
