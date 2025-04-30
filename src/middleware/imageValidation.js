import { FileValidationError } from '../utils/imageUpload';
import { AWS_CONFIG } from '../config/aws';

export const validateImageMiddleware = (req, res, next) => {
  const files = req.files || [];
  const errors = [];

  files.forEach(file => {
    // Check file size
    if (file.size > AWS_CONFIG.maxFileSize) {
      errors.push(`File ${file.originalname} exceeds maximum size of ${AWS_CONFIG.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!AWS_CONFIG.allowedFileTypes.includes(file.mimetype)) {
      errors.push(`File ${file.originalname} has invalid type. Allowed types: ${AWS_CONFIG.allowedFileTypes.join(', ')}`);
    }

    // Check image dimensions (if it's an image)
    if (file.mimetype.startsWith('image/')) {
      const { width, height } = file.dimensions || {};
      if (width > 5000 || height > 5000) {
        errors.push(`File ${file.originalname} dimensions exceed maximum allowed (5000x5000)`);
      }
    }

    // Validate file name
    const validFilename = /^[a-zA-Z0-9._-]+$/;
    if (!validFilename.test(file.originalname)) {
      errors.push(`File ${file.originalname} has invalid characters in name`);
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors
    });
  }

  next();
}; 