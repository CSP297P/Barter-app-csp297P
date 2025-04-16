import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import './ItemUpload.css';

const ItemUpload = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
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

    if (!image) {
      setError('Please select an image');
      setLoading(false);
      return;
    }

    if (!title || !description || !category || !condition) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('image', image);

      console.log('Submitting form data:', {
        title,
        description,
        category,
        condition,
        image: image.name
      });

      const response = await axios.post('/api/items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      console.log('Upload successful:', response.data);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setCondition('');
      setImage(null);
      setPreviewUrl('');
      
      // Call success callback if provided
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

  return (
    <div className="item-upload">
      <h2>Upload New Item</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select Category</option>
            <option value="barter">Barter</option>
            <option value="giveaway">Giveaway</option>
          </select>
        </div>
        <div className="form-group">
          <label>Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
          >
            <option value="">Select Condition</option>
            <option value="New">New</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="image-preview"
            />
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Item'}
        </button>
      </form>
    </div>
  );
};

export default ItemUpload; 