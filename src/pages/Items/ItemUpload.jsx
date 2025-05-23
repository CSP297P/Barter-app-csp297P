import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import ImageUploader from '../../components/ImageUploader';
import { Divider, Button, TextField, MenuItem } from '@mui/material';
import './ItemUpload.css';

const ItemUpload = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('barter');
  const [condition, setCondition] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const [uploadedImages, setUploadedImages] = useState([]);

  const handleImageUploadComplete = (images) => {
    setUploadedImages(images);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!user) {
      setError('You must be logged in to upload an item');
      setLoading(false);
      return;
    }

    if (!title || !description || !category || !condition || !priceRange || !type) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (uploadedImages.length === 0) {
      setError('Please upload at least one image');
      setLoading(false);
      return;
    }

    try {
      const imageUrls = uploadedImages.map(img => img.url);

      const itemData = {
        title,
        description,
        category,
        type,
        condition,
        priceRange,
        imageUrls,
        owner: user._id,
        ownerName: user.displayName
      };

      const response = await axios.post('/items', itemData, {
        withCredentials: true
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setType('barter');
      setCondition('');
      setPriceRange('');
      setUploadedImages([]);

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error.response || error);
      setError(
        error.response?.data?.message || 
        error.response?.data?.error || 
        'Failed to upload item. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setType('barter');
    setCondition('');
    setPriceRange('');
    setError('');
    setUploadedImages([]);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="item-upload item-upload-custom">
      <h2 className="item-upload-title">Upload New Item</h2>
      <Divider className="item-upload-divider" />
      {error && <div className="error-message item-upload-error">{error}</div>}
      <form onSubmit={handleSubmit} className="item-upload-form">
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          InputProps={{ className: 'item-upload-input' }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
          multiline
          rows={3}
          InputProps={{ className: 'item-upload-input' }}
        />
        <div className="item-upload-form-row">
          <TextField
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            select
            fullWidth
            InputProps={{ className: 'item-upload-input' }}
          >
            <MenuItem value="barter">Barter</MenuItem>
            <MenuItem value="giveaway">Giveaway</MenuItem>
          </TextField>
          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            select
            fullWidth
            InputProps={{ className: 'item-upload-input' }}
          >
            <MenuItem value="">Select Category</MenuItem>
            <MenuItem value="gaming-console">Gaming Console</MenuItem>
            <MenuItem value="sports-equipment">Sports Equipment</MenuItem>
            <MenuItem value="electronics">Electronics</MenuItem>
            <MenuItem value="books">Books</MenuItem>
            <MenuItem value="clothing">Clothing</MenuItem>
            <MenuItem value="furniture">Furniture</MenuItem>
            <MenuItem value="musical-instruments">Musical Instruments</MenuItem>
            <MenuItem value="tools">Tools</MenuItem>
            <MenuItem value="art-supplies">Art Supplies</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
        </div>
        <div className="item-upload-form-row">
          <TextField
            label="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
            select
            fullWidth
            InputProps={{ className: 'item-upload-input' }}
          >
            <MenuItem value="">Select Condition</MenuItem>
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="Like New">Like New</MenuItem>
            <MenuItem value="Good">Good</MenuItem>
            <MenuItem value="Fair">Fair</MenuItem>
            <MenuItem value="Poor">Poor</MenuItem>
          </TextField>
          <TextField
            label="Estimated Value Range"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            required
            select
            fullWidth
            InputProps={{ className: 'item-upload-input' }}
          >
            <MenuItem value="">Select Value Range</MenuItem>
            <MenuItem value="0-50">$0 - $50</MenuItem>
            <MenuItem value="51-100">$51 - $100</MenuItem>
            <MenuItem value="101-250">$101 - $250</MenuItem>
            <MenuItem value="251-500">$251 - $500</MenuItem>
            <MenuItem value="501-1000">$501 - $1000</MenuItem>
            <MenuItem value="1000+">$1000+</MenuItem>
          </TextField>
        </div>
        <Divider className="item-upload-divider item-upload-divider-small" />
        <div className="item-upload-section">
          <div className="item-upload-section-title">Images</div>
          <div className="item-upload-section-desc">Upload images for your item. You can rearrange or remove them after upload.</div>
          <ImageUploader
            onUploadComplete={handleImageUploadComplete}
            maxFiles={10}
          />
        </div>
        <div className="item-upload-actions">
          <Button
            onClick={handleCancel}
            className="item-upload-cancel-btn"
          >Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            className="item-upload-submit-btn"
          >{loading ? 'Uploading...' : 'Upload Item'}</Button>
        </div>
      </form>
    </div>
  );
};

export default ItemUpload; 