import mongoose, { Schema } from "mongoose";

const followerSchema = new Schema({
	following: {
		// the one who is being followed
		type: Schema.Types.ObjectId,
		ref: "User",
	},
	follower: {
		// the one who follows
		type: Schema.Types.ObjectId,
		ref: "User",
	},
});

const Follower = mongoose.model("Follower", followerSchema);
export default Follower;
