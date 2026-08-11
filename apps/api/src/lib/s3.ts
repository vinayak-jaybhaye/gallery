import { createS3Client } from "@gallery/s3";

const {
  AWS_REGION,
  S3_ENDPOINT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_PUBLIC_ENDPOINT,
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

// A separate client purely for generating presigned URLs that the browser can reach.
// If S3_PUBLIC_ENDPOINT is set, it signs with that endpoint (e.g. localhost instead of localstack)
export const s3PublicClient = S3_PUBLIC_ENDPOINT
  ? createS3Client({
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      endpoint: S3_PUBLIC_ENDPOINT,
    })
  : s3Client;

import { getSignedUrl as awsGetSignedUrl } from "@gallery/s3";

export const getSignedUrl = (client: any, command: any, options?: any) => {
  // Always use the public client for generating signed URLs to avoid host mismatch
  return awsGetSignedUrl(s3PublicClient, command, options);
};

// Re-export types from s3 package (except getSignedUrl)
export * from "@aws-sdk/client-s3";