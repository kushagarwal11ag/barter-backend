import Joi from "joi";

const userSchema = Joi.object({
	email: Joi.string().email(),
	name: Joi.string().trim().min(3).max(20),
	bio: Joi.string().trim().min(10).max(300),
	password: Joi.string().min(8).max(20),
	phone: Joi.string().pattern(new RegExp("^[0-9]{10}$")),
	rating: Joi.number(),
	displayEmail: Joi.boolean(),
	displayPhone: Joi.boolean(),
}).or(
	"email",
	"name",
	"bio",
	"password",
	"phone",
	"rating",
	"displayEmail",
	"displayPhone"
);

const productSchema = Joi.object({
	title: Joi.string().trim().min(3).max(20),
	description: Joi.string().trim().min(10).max(150),
	condition: Joi.string().trim().valid("new", "good", "fair", "poor"),
	category: Joi.string().trim().min(3).max(30),
	isBarter: Joi.boolean(),
	barterCategory: Joi.string().trim().min(3).max(30),
	barterDescription: Joi.string().trim(),
	price: Joi.number(),
	meetingSpot: Joi.string().trim().min(10).max(100),
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

const feedbackSchema = Joi.object({
	content: Joi.string().trim().min(10).max(300),
	rating: Joi.number().min(1).max(5).integer(),
}).or("content", "rating");

const notificationSchema = Joi.object({
	notificationType: Joi.string().valid(
		"feedback",
		"product",
		"transaction",
		"follow"
	),
	content: Joi.string().trim().min(5).max(50),
	isRead: Joi.boolean(),
});

const validateUser = (userData) => {
	return userSchema.validate(userData);
};
const validateProduct = (productData) => {
	return productSchema.validate(productData);
};
const validateFeedback = (feedbackData) => {
	return feedbackSchema.validate(feedbackData);
};
const validateNotification = (notificationData) => {
	return notificationSchema.validate(notificationData);
};

export {
	validateUser,
	validateProduct,
	validateFeedback,
	validateNotification,
};
