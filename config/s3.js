const AWS = require("aws-sdk");

// Configure AWS S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1", // Default region, adjust as needed
});

// Export the S3 client and bucket name for reuse
module.exports = {
  s3,
  bucket: process.env.AWS_S3_BUCKET,
};
