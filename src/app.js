import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import ApiError from "./utils/ApiError";

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
import userRouter from "./routes/user.routes.js";
// import healthCheckRouter from "./routes/healthCheck.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);
// app.use("/api/v1/health-check", healthCheckRouter);

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
