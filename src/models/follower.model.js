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

const Follower = mongoose.model("Follower", followerSchema);
export default Follower;
