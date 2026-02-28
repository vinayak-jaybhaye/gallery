import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export function createS3Client(config: S3Config): S3Client {
  const s3Config: S3ClientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    s3Config.endpoint = config.endpoint;
    s3Config.forcePathStyle = true;
  }

  return new S3Client(s3Config);
}

// Re-export S3 types for convenience
export * from "@aws-sdk/client-s3";
export { getSignedUrl } from "@aws-sdk/s3-request-presigner";
