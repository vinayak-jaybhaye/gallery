import {
  createS3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@gallery/s3";

const {
  AWS_REGION,
  S3_ENDPOINT,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_BUCKET,
} = process.env;

if (!AWS_REGION) throw new Error("AWS_REGION is not set");
if (!AWS_ACCESS_KEY_ID) throw new Error("AWS_ACCESS_KEY_ID is not set");
if (!AWS_SECRET_ACCESS_KEY) throw new Error("AWS_SECRET_ACCESS_KEY is not set");
if (!S3_BUCKET) throw new Error("S3_BUCKET is not set");

export const s3Client = createS3Client({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT,
});

export const bucket = S3_BUCKET;

export async function getObject(key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty response body");
  return Buffer.from(bytes);
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}
