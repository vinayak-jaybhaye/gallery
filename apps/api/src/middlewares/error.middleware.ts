import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message =
    err.isOperational || process.env.NODE_ENV === "development"
      ? err.message
      : "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message
  });
}