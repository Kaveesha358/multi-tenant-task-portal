import { Router } from "express";
import { z } from "zod";
import { registerUser } from "./auth.service";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
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

export default router;