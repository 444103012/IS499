const { S3Client } = require("@aws-sdk/client-s3");

const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID ||
  process.env.AWS_ACCESS_KEY;
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.AWS_SECRET_KEY_ID ||
  process.env.AWS_SECRET_KEY;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  ...(accessKeyId && secretAccessKey
    ? {
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      }
    : {}),
});

module.exports = s3;