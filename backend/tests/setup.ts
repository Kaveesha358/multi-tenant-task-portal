import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

// never tests touch the real database
if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error("Refusing to run: DATABASE_URL is not a test database");
}