const path = require("node:path");
const express = require("express");
const dotenv = require("dotenv");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;

// 1. Get signed URL to UPLOAD a file directly to S3
app.post("/signed-url/upload", async (req, res) => {
  const key = req.body.key || "demo.txt";
  const contentType = req.body.contentType || "text/plain";

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 });

  res.json({
    message: "Signed upload URL created (valid for 15 minutes)",
    method: "PUT",
    url,
    key,
    headers: {
      "Content-Type": contentType,
    },
  });
});

// 2. Get signed URL to DOWNLOAD a file directly from S3
app.post("/signed-url/download", async (req, res) => {
  const key = req.body.key || "demo.txt";

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 900 });

  res.json({
    message: "Signed download URL created (valid for 15 minutes)",
    method: "GET",
    url,
    key,
  });
});

app.listen(3016, () => {
  console.log("02-blob-storage API running at http://localhost:3016");
});
