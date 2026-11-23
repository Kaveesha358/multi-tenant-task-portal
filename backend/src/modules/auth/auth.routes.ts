import { Router } from "express";
import { z } from "zod";
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  getUserById,
} from "./auth.service";
import { requireAuth } from "../../middleware/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  return {
    errors: issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    })),
  };
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationError(parsed.error.issues));
  }

  try {
    const { email, name, password } = parsed.data;
    const user = await registerUser(email, name, password);
    return res.status(201).json(user);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationError(parsed.error.issues));
  }

  try {
    const { email, password } = parsed.data;
    const result = await loginUser(email, password);
    return res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationError(parsed.error.issues));
  }

  try {
    const tokens = await refreshSession(parsed.data.refreshToken);
    return res.json(tokens);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_REFRESH_TOKEN") {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(validationError(parsed.error.issues));
  }

  try {
    await logoutUser(parsed.data.refreshToken);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/me", requireAuth, async (_req, res) => {
  const user = await getUserById(res.locals.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

export default router;