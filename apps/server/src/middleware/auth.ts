import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["x-admin-auth"];

  if (authHeader === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};
