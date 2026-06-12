import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDB() {
  try {
    await mongoose.connect(env.DATABASE_URL);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error(error, "Failed to connect to MongoDB");
    throw error;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error(error, "Failed to disconnect from MongoDB");
    throw error;
  }
}

export { mongoose };
