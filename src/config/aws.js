import { S3 } from '@aws-sdk/client-s3';
// import { GetObjectCommand } from '@aws-sdk/client-s3';
// Validate required environment variables
console.log('process.env.REACT_APP_AWS_ACCESS_KEY_ID', process.env);
// const requiredEnvVars = [
//   'REACT_APP_AWS_ACCESS_KEY_ID',
//   'REACT_APP_AWS_SECRET_ACCESS_KEY',
//   'REACT_APP_AWS_REGION',
//   'REACT_APP_S3_BUCKET_NAME'
// ];

// const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
// if (missingEnvVars.length > 0) {
//   throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
// }

// AWS S3 Configuration
export const AWS_CONFIG = {
  bucketName: process.env.REACT_APP_S3_BUCKET_NAME,
  region: process.env.REACT_APP_AWS_REGION,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  urlExpirationSeconds: 604800, // 1 week
  uploadFolderPath: 'images/',
  maxConcurrentUploads: 3,
  chunkSize: 5 * 1024 * 1024, // 5MB chunks for multipart upload
};
console.log('AWS_CONFIG', AWS_CONFIG);

// Initialize S3 with browser-specific configuration
const s3 = new S3({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
  retryMode: 'adaptive',
  forcePathStyle: false, // Use virtual hosted-style URLs
  sslEnabled: true,
  computeChecksums: true, // Enable checksums for data integrity
  logger: console, // Enable logging for debugging
});
// await s3.send(new GetObjectCommand({
//   Bucket: AWS_CONFIG.bucketName,
//   Key: 'images/1745992575984_3tm3da_download.png '
// }));

export { s3 }; 
