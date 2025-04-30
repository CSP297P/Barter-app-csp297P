import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Slider } from '@mui/material';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg');
  });
};

const ImageEditor = ({ image, onSave, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation
      );
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, rotation, image, onSave]);

  return (
    <div className="image-editor">
      <div className="crop-container">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={4 / 3}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>
      <div className="controls">
        <div className="control-section">
          <label>Zoom</label>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e, zoom) => setZoom(zoom)}
          />
        </div>
        <div className="control-section">
          <label>Rotation</label>
          <Slider
            value={rotation}
            min={0}
            max={360}
            step={1}
            onChange={(e, rotation) => setRotation(rotation)}
          />
        </div>
        <div className="buttons">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>

      <style jsx>{`
        .image-editor {
          position: relative;
          width: 100%;
          height: 100%;
          background: #333;
          padding: 20px;
        }

        .crop-container {
          position: relative;
          width: 100%;
          height: 400px;
          background: #000;
        }

        .controls {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          margin-top: 20px;
        }

        .control-section {
          margin-bottom: 20px;
        }

        .control-section label {
          display: block;
          margin-bottom: 10px;
          color: #666;
        }

        .buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        button:first-child {
          background: #ccc;
        }

        button:last-child {
          background: #007bff;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default ImageEditor; 