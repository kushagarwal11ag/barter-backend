import Joi from "joi";

const userSchema = Joi.object({
	email: Joi.string().email(),
	name: Joi.string().trim().min(3).max(20),
	bio: Joi.string().trim().min(3).max(300),
	password: Joi.string().min(8).max(20),
	phone: Joi.string().pattern(new RegExp("^[0-9]{10}$")),
	rating: Joi.number(),
	blockedUsers: Joi.array().items(Joi.string().hex().length(24)),
	wishlist: Joi.array().items(Joi.string().hex().length(24)),
	displayEmail: Joi.boolean(),
	displayPhone: Joi.boolean(),
}).or(
	"email",
	"name",
	"bio",
	"password",
	"phone",
	"rating",
	"blockedUsers",
	"wishlist",
	"displayEmail",
	"displayPhone"
);

const productSchema = Joi.object({
	title: Joi.string().trim().min(3).max(20),
	description: Joi.string().trim().min(3).max(150),
	condition: Joi.string().trim().valid("new", "good", "fair", "poor"),
	category: Joi.string().trim().min(3).max(30),
	isBarter: Joi.boolean(),
	barterCategory: Joi.string().trim().min(3).max(30),
	barterDescription: Joi.string().trim(),
	price: Joi.number(),
	meetingSpot: Joi.string().trim().min(3).max(100),
	isAvailable: Joi.boolean(),
}).or(
	"title",
	"description",
	"condition",
	"category",
	"isBarter",
	"barterCategory",
	"barterDescription",
	"price",
	"meetingSpot",
	"isAvailable"
);

const validateUser = (userData) => {
	return userSchema.validate(userData);
};
const validateProduct = (productData) => {
	return productSchema.validate(productData);
};

export { validateUser, validateProduct };
