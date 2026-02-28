import express from "express";
import cors from "cors";
import { errorMiddleware, AppError } from "@/middlewares/error.middleware";
import { authMiddleware } from "@/middlewares/auth.middleware";
import authRoutes from "@/modules/auth/auth.routes";
import uploadsRoutes from "@/modules/uploads/uploads.routes";
import mediaRoutes from "@/modules/media/media.routes";
import userRoutes from "@/modules/user/user.routes";

const app = express();

app.use(cors(
  {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
));

app.use(express.json());

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

app.use("/auth", authRoutes);
app.use("/uploads", authMiddleware, uploadsRoutes);
app.use("/media", authMiddleware, mediaRoutes);
app.use("/user", authMiddleware, userRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// 404 handler
app.use((req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// error middleware
app.use(errorMiddleware);

export default app;