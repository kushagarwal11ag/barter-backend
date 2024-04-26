import Joi from "joi";

const schema = Joi.object({
	email: Joi.string().email(),
	name: Joi.string().min(3).max(20),
	bio: Joi.string().trim().min(3).max(300),
	password: Joi.string().min(8).max(30),
	phone: Joi.string().pattern(new RegExp("^[0-9]{10}$")),
	rating: Joi.number(),
	blockedUsers: Joi.array().items(Joi.string().hex().length(24)),
	wishlist: Joi.array().items(Joi.string().hex().length(24)),
}).or(
	"email",
	"name",
	"bio",
	"password",
	"phone",
	"rating",
	"blockedUsers",
	"wishlist"
);

export const validateUser = (user) => {
	return schema.validate(user);
};
