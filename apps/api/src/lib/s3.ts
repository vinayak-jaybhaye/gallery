import { createS3Client } from "@gallery/s3";

const {
  AWS_REGION,
  S3_ENDPOINT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = process.env;

if (!AWS_REGION) {
  throw new Error("AWS_REGION is not set");
}

if (!AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID is not set");
}

if (!AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY is not set");
}

export const s3Client = createS3Client({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT,
});

// Re-export types from s3 package
export * from "@gallery/s3";