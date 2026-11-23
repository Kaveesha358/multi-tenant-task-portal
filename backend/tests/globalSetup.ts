import dotenv from "dotenv";
import { execSync } from "node:child_process";

export default function setup() {
  dotenv.config({ path: ".env.test", override: true });

  if (!process.env.DATABASE_URL?.includes("_test")) {
    throw new Error("Refusing to run: DATABASE_URL is not a test database");
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}