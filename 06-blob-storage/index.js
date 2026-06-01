const path = require("node:path");
const express = require("express");
const dotenv = require("dotenv");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());

const port = Number(process.env.PORT || 3016);
const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION;
const expiresIn = Number(process.env.SIGNED_URL_EXPIRES_SECONDS || 900);

function requireEnv(name, value) {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy 06-blob-storage/.env.example to 06-blob-storage/.env and fill it in.`,
    );
  }
}

requireEnv("S3_BUCKET_NAME", bucketName);
requireEnv("AWS_REGION", region);
requireEnv("AWS_ACCESS_KEY_ID", process.env.AWS_ACCESS_KEY_ID);
requireEnv("AWS_SECRET_ACCESS_KEY", process.env.AWS_SECRET_ACCESS_KEY);

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
  },
});

function getObjectKey(req, res) {
  const key = typeof req.body.key === "string" ? req.body.key.trim() : "";

  if (!key || key.startsWith("/")) {
    res.status(400).json({
      error: "Send a non-empty object key that does not start with /.",
    });
    return null;
  }

  return key;
}

app.get("/", (req, res) => {
  res.json({
    lesson: "06-blob-storage",
    routes: {
      upload: "POST /signed-url/upload",
      download: "POST /signed-url/download",
    },
  });
});

app.post("/signed-url/upload", async (req, res, next) => {
  try {
    const key = getObjectKey(req, res);
    if (!key) return;

    const contentType =
      typeof req.body.contentType === "string"
        ? req.body.contentType
        : "application/octet-stream";
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn });

    res.json({
      method: "PUT",
      url,
      key,
      expiresIn,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/signed-url/download", async (req, res, next) => {
  try {
    const key = getObjectKey(req, res);
    if (!key) return;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn });

    res.json({
      method: "GET",
      url,
      key,
      expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    error: "Could not create a signed URL.",
    detail: error.message,
  });
});

app.listen(port, () => {
  console.log(
    `Blob storage signed URL API running at http://localhost:${port}`,
  );
});
