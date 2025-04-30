import React, { useState, useCallback, useRef, useEffect } from 'react';
import { uploadMultipleImages } from '../utils/imageUpload';
import { AWS_CONFIG } from '../config/aws';
import ImageEditor from './ImageEditor';
import './ImageUploader.css';

const ImageUploader = ({ onUploadComplete, maxFiles = 5, initialImages = [] }) => {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize previews with initial images
  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      const initialPreviews = initialImages.map(img => ({
        file: img.file,
        url: img.url,
        isInitial: true // Flag to identify initial images
      }));
      setPreviews(initialPreviews);
    }
  }, [initialImages]);

  const uploadFiles = async (filesToUpload) => {
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadMultipleImages(filesToUpload, (progress) => {
        setProgress(progress);
      });

      if (result.failureCount > 0) {
        setError(`${result.failureCount} files failed to upload`);
        console.error('Failed uploads:', result.failed);
      }

      if (result.successCount > 0) {
        // Combine existing initial images with newly uploaded ones
        const currentInitialImages = previews
          .filter(p => p.isInitial)
          .map(p => ({ file: p.file, url: p.url }));
        onUploadComplete?.([...currentInitialImages, ...result.successful]);
      }
    } catch (error) {
      console.error('Upload error details:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const validateBlob = (blob) => {
    if (!(blob instanceof Blob)) {
      throw new Error('Invalid file format');
    }
    
    // Check file size
    if (blob.size > AWS_CONFIG.maxFileSize) {
      throw new Error(`File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${AWS_CONFIG.maxFileSize / 1024 / 1024}MB`);
    }
    
    // Check file type
    if (!AWS_CONFIG.allowedFileTypes.includes(blob.type)) {
      throw new Error(`File type ${blob.type} not allowed. Allowed types: ${AWS_CONFIG.allowedFileTypes.join(', ')}`);
    }
  };

  const createFileFromBlob = async (blob, fileName) => {
    try {
      validateBlob(blob);
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      setError(error.message);
      return null;
    }
  };

  const handleFiles = async (newFiles) => {
    const { validFiles, errors } = validateFiles(newFiles);
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setError(null);

    // Generate previews and upload files
    const previewPromises = validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ file: file.name, url: reader.result });
        };
        reader.readAsDataURL(file);
      });
    });

    const newPreviews = await Promise.all(previewPromises);
    setPreviews(prev => [...prev, ...newPreviews]);
    setFiles(prev => [...prev, ...validFiles]);

    // Start upload immediately
    await uploadFiles(validFiles);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (event) => {
    handleFiles(event.target.files);
  };

  const removeFile = (fileName) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    setPreviews(prevPreviews => {
      const newPreviews = prevPreviews.filter(preview => preview.file !== fileName);
      // Update the parent component with the new list of images
      const currentImages = newPreviews.map(p => ({ file: p.file, url: p.url }));
      onUploadComplete?.(currentImages);
      return newPreviews;
    });
  };

  const editImage = (index) => {
    setEditingImage(previews[index].url);
    setEditingIndex(index);
  };

  const handleEditSave = async (editedBlob) => {
    try {
      const editedFile = await createFileFromBlob(
        editedBlob,
        files[editingIndex].name
      );

      if (!editedFile) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews];
        newPreviews[editingIndex] = { file: editedFile.name, url: reader.result };
        setPreviews(newPreviews);

        const newFiles = [...files];
        newFiles[editingIndex] = editedFile;
        setFiles(newFiles);
      };
      reader.readAsDataURL(editedFile);

      setEditingImage(null);
      setEditingIndex(null);

      // Upload the edited file
      await uploadFiles([editedFile]);
    } catch (error) {
      setError(`Failed to save edited image: ${error.message}`);
    }
  };

  const validateFiles = (fileList) => {
    const errors = [];
    const validFiles = [];

    Array.from(fileList).forEach(file => {
      try {
        validateBlob(file);
        validFiles.push(file);
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    });

    if (validFiles.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { validFiles: [], errors };
    }

    return { validFiles, errors };
  };

  const allowedTypesText = AWS_CONFIG.allowedFileTypes
    .map(type => type.split('/')[1].toUpperCase())
    .join(', ');

  const maxSizeMB = AWS_CONFIG.maxFileSize / (1024 * 1024);

  return (
    <div className="image-uploader">
      {editingImage ? (
        <ImageEditor
          key="image-editor"
          image={editingImage}
          onSave={handleEditSave}
          onCancel={() => setEditingImage(null)}
        />
      ) : (
        <>
          <div className="upload-info">
            <p key="allowed-types">Allowed types: {allowedTypesText}</p>
            <p key="max-size">Max size: {maxSizeMB}MB per file</p>
            <p key="max-files">Max files: {maxFiles}</p>
          </div>

          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={AWS_CONFIG.allowedFileTypes.join(',')}
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <div className="drop-zone-content">
              <i className="upload-icon" key="upload-icon">📁</i>
              <p key="upload-text">{uploading ? 'Uploading...' : 'Drag & drop files here or click to browse'}</p>
            </div>
          </div>

          {error && (
            <div className="error-message" key="error-message">
              {error}
            </div>
          )}

          {uploading && (
            <div className="progress-bar" key="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
              <span>{Math.round(progress)}%</span>
            </div>
          )}

          {previews.length > 0 && (
            <div className="preview-container">
              {previews.map((preview, index) => (
                <div key={`${preview.file}-${index}`} className="preview-item">
                  <img src={preview.url} alt={preview.file} />
                  <div className="preview-actions">
                    <button
                      onClick={() => editImage(index)}
                      disabled={uploading}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeFile(preview.file)}
                      disabled={uploading}
                      className="remove-button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageUploader; 