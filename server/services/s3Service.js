const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * Uploads a file buffer to S3 and returns the S3 key
 * @param {Buffer} buffer - The file buffer
 * @param {string} mimetype - The file mimetype
 * @param {string} folder - The S3 folder (e.g. 'profile-pictures')
 * @returns {Promise<string>} - The S3 key
 */
async function uploadToS3(buffer, mimetype, folder = 'profile-pictures') {
  const ext = mimetype.split('/')[1];
  const key = `${folder}/${uuidv4()}.${ext}`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    // ACL: 'public-read',
  };
  await s3.upload(params).promise();
  return key;
}

function getSignedUrlForKey(key, expiresInSeconds = 3600) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Expires: expiresInSeconds,
  };
  return s3.getSignedUrl('getObject', params);
}

module.exports = { uploadToS3, getSignedUrlForKey }; 