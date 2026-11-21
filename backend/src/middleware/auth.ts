import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    res.locals.userId = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}