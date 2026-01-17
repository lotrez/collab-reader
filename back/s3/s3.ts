import { S3Client } from "bun";

export const minio = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  bucket: process.env.S3_BUCKET || "collab-reader",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "us-east-1",
});

export const insertFile = async (key: string, path: string, contentType: string) => {
  const file = Bun.file(path);
  await minio.write(key, file, {
    type: contentType,
  });
  return key;
}