# 06-blob-storage

This lesson shows how a backend can create short-lived signed URLs so clients can upload to and download from S3 without sending files through the backend.

## Run

Copy the example environment file and fill in your bucket and AWS credentials:

```sh
cp 06-blob-storage/.env.example 06-blob-storage/.env
```

Start the API from the repository root:

```sh
npm run 06-blob-storage
```

The API listens on `http://localhost:3016` by default.

## Routes

- `POST /signed-url/upload` returns a signed `PUT` URL for one S3 object key.
- `POST /signed-url/download` returns a signed `GET` URL for one S3 object key.

Use `06-blob-storage/request.http` to walk through the full flow:

1. Ask the API for an upload URL.
2. Use that URL to upload a file directly to S3.
3. Ask the API for a download URL.
4. Use that URL to read the file directly from S3.

The IAM identity used by the app needs permission to run `s3:PutObject` and `s3:GetObject` for the bucket.
