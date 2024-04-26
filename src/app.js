import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import ApiError from "./utils/ApiError.js";

const app = express();

app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	})
);

app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

//routes import
import healthCheckRouter from "./routes/healthCheck.routes.js";
import userRouter from "./routes/user.routes.js";
import productRouter from "./routes/product.routes.js";
import transactionRouter from "./routes/transaction.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";

//routes declaration
app.use("/api/v1/health-check", healthCheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/wishlist", wishlistRouter);

app.use((err, req, res, next) => {
	if (err instanceof ApiError) {
		res.status(err.statusCode).json({
			success: false,
			message: err.message,
			errors: err.errors,
		});
	} else {
		res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
});

export default app;
