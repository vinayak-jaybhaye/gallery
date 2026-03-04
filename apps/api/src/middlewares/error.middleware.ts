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

    console.log(err);
    console.log(statusCode);
    console.log(message);
    console.log(req.body);
    console.log(req.params);
    console.log(req.query);
    console.log(req.headers);
    console.log(req.path);
    console.log(req.method);

  res.status(statusCode).json({
    success: false,
    message
  });
}