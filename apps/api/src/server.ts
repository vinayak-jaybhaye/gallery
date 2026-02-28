import "dotenv/config";
import app from "./app";
import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Database connected");

    console.log("Checking S3 connection...");
    await s3Client.send(new ListBucketsCommand({}));
    console.log("S3 connection verified");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();