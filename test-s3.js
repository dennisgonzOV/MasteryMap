require("dotenv").config();
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const client = new S3Client({ region: process.env.AWS_REGION });

async function test() {
  try {
    console.log("Testing nonexistent object...");
    const res = await client.send(new HeadObjectCommand({ Bucket: "masterymap", Key: "Thumbnails/nonexistent-12345.png" }));
    console.log("nonexistent:", res);
  } catch (e) {
    console.log("nonexistent error status:", e.$metadata?.httpStatusCode, e.name);
  }
}
test();
