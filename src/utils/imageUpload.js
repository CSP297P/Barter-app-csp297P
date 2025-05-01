import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, AWS_CONFIG } from '../config/aws';
import { compressImage } from './imageCompression';

// Custom error classes
export class FileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export class S3UploadError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'S3UploadError';
    this.originalError = originalError;
  }
}

// Enhanced error handling with specific error types
export class NetworkError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export class StorageQuotaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

// Validation functions
const validateFile = (file) => {
  console.log('Uploading file:validateFile', file);
  if (!file) {
    throw new FileValidationError('No file provided');
  }

  if (file.size > AWS_CONFIG.maxFileSize) {
    throw new FileValidationError(
      `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${AWS_CONFIG.maxFileSize / 1024 / 1024}MB)`
    );
  }

  if (!AWS_CONFIG.allowedFileTypes.includes(file.type)) {
    throw new FileValidationError(
      `File type "${file.type}" is not allowed. Allowed types: ${AWS_CONFIG.allowedFileTypes.join(', ')}`
    );
  }
};

// Generate a unique key for the file
const generateUniqueKey = (file, productId = null) => {
  if (!file || !file.name) {
    throw new FileValidationError('Invalid file object: file or file name is missing');
  }
  
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Use images/temp/ as the base path
  const folderPath = `${AWS_CONFIG.uploadFolderPath}temp/`;
    
  return `${folderPath}${timestamp}_${randomString}_${sanitizedFileName}`;
};

// Get signed URL for uploaded file
const getFileUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: AWS_CONFIG.bucketName,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: AWS_CONFIG.urlExpirationSeconds });
};

// Generate a pre-signed URL for upload
const getUploadUrl = async (key) => {
  const command = new PutObjectCommand({
    Bucket: AWS_CONFIG.bucketName,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
};

// Delete file from S3
export const deleteImage = async (url) => {
  try {
    // Extract key from signed URL
    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });

    await s3.send(command);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new S3UploadError('Failed to delete image', error);
  }
};

// Retry logic with exponential backoff
const retryOperation = async (operation, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

const isRetryableError = (error) => {
  const retryableCodes = ['NetworkingError', 'ThrottlingException', 'RequestTimeout'];
  return retryableCodes.includes(error.name) || error instanceof NetworkError;
};

// Enhanced upload single image with retry and compression
export const uploadImage = async (file, productId = null, onProgress, compressionOptions = {}) => {
  try {
    console.log('Starting upload process with file:', file);
    validateFile(file);
    console.log('File validation passed');
    
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      console.log('Compressing image before upload');
      const compressedBlob = await compressImage(file, compressionOptions);
      fileToUpload = new File([compressedBlob], file.name, {
        type: compressedBlob.type
      });
      console.log('Image compressed successfully');
    }

    const key = generateUniqueKey(fileToUpload, productId);
    console.log('Generated unique key:', key);
    
    const upload = async () => {
      try {
        console.log('Starting file conversion to ArrayBuffer');
        // Convert file to ArrayBuffer first
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log('File successfully converted to ArrayBuffer');
            resolve(reader.result);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsArrayBuffer(fileToUpload);
        });

        console.log('Initiating S3 upload');
        // Upload using S3.putObject
        try {
          await s3.putObject({
            Bucket: AWS_CONFIG.bucketName,
            Key: key,
            Body: arrayBuffer,
            ContentType: fileToUpload.type
          });

          console.log('S3 upload successful');
          // Get the URL immediately after successful upload
          const getUrl = await getFileUrl(key);
          console.log('Generated signed URL:', getUrl);

          // Return success response without verification
          const response = {
            url: getUrl,
            key,
            originalName: file.name,
            size: fileToUpload.size,
            originalSize: file.size,
            type: fileToUpload.type,
            compressionRatio: file.size / fileToUpload.size,
          };
          console.log('Returning upload response:', response);
          return response;

        } catch (error) {
          console.error('S3 upload error:', error);
          throw new Error(`Failed to upload file: ${error.message}`);
        }
      } catch (error) {
        console.error('File processing error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }
    };

    return await retryOperation(upload);
  } catch (error) {
    console.error('Upload process error:', error);
    if (error instanceof FileValidationError) {
      throw error;
    }
    
    if (error.name === 'NetworkError') {
      throw new NetworkError('Network error during upload', error);
    }
    
    if (error.name === 'QuotaExceededError') {
      throw new StorageQuotaError('Storage quota exceeded');
    }

    throw new S3UploadError('Failed to upload image', error);
  }
};

// Upload multiple images with concurrency control
export const uploadMultipleImages = async (files, onProgress) => {
  try {
    if (!files || !Array.isArray(files) && !files.length) {
      throw new FileValidationError('No files provided for upload');
    }

    const filesToUpload = Array.from(files).filter(file => file && file.name);
    
    if (filesToUpload.length === 0) {
      throw new FileValidationError('No valid files to upload');
    }

    console.log('Processing files for upload:', filesToUpload.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    const results = [];
    const errors = [];

    // Process files in batches to control concurrency
    for (let i = 0; i < filesToUpload.length; i += AWS_CONFIG.maxConcurrentUploads) {
      const batch = filesToUpload.slice(i, i + AWS_CONFIG.maxConcurrentUploads);
      const batchPromises = batch.map(async (file) => {
        try {
          console.log('Uploading file:1', !file || !file.name);
          if (!file || !file.name) {
            throw new FileValidationError(`Invalid file at index ${i}`);
          }
          console.log('Uploading file:2', file);
          const result = await uploadImage(file);
          results.push(result);
          if (onProgress) {
            onProgress((results.length + errors.length) / filesToUpload.length * 100);
          }
          console.log('Uploading file:3', result);
          return result;
        } catch (error) {
          console.error(`Error uploading file ${file?.name || 'unknown'}:`, error);
          errors.push({ file, error });
          if (onProgress) {
            onProgress((results.length + errors.length) / filesToUpload.length * 100);
          }
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    if (errors.length > 0) {
      console.error('Some files failed to upload:', errors);
    }

    return {
      successful: results,
      failed: errors,
      totalCount: filesToUpload.length,
      successCount: results.length,
      failureCount: errors.length,
    };
  } catch (error) {
    console.error('Error in batch upload:', error);
    throw new S3UploadError('Failed to process batch upload', error);
  }
}; 