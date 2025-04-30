import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import ImageUploader from '../../components/ImageUploader';
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

  const handleImageUploadComplete = async (uploadedImages) => {
    if (!uploadedImages || uploadedImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    const imageUrls = uploadedImages.map(img => img.url);
    return imageUrls;
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

    try {
      const imageUrls = await handleImageUploadComplete();
      
      if (!imageUrls) {
        setLoading(false);
        return;
      }

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
          <label>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option value="barter">Barter</option>
            <option value="giveaway">Giveaway</option>
          </select>
        </div>
        <div className="form-group">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">Select Category</option>
            <option value="gaming-console">Gaming Console</option>
            <option value="sports-equipment">Sports Equipment</option>
            <option value="electronics">Electronics</option>
            <option value="books">Books</option>
            <option value="clothing">Clothing</option>
            <option value="furniture">Furniture</option>
            <option value="musical-instruments">Musical Instruments</option>
            <option value="tools">Tools</option>
            <option value="art-supplies">Art Supplies</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Estimated Value Range</label>
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            required
          >
            <option value="">Select Value Range</option>
            <option value="0-50">$0 - $50</option>
            <option value="51-100">$51 - $100</option>
            <option value="101-250">$101 - $250</option>
            <option value="251-500">$251 - $500</option>
            <option value="501-1000">$501 - $1000</option>
            <option value="1000+">$1000+</option>
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
          <label>Images</label>
          <ImageUploader
            onUploadComplete={handleImageUploadComplete}
            maxFiles={10}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Item'}
        </button>
      </form>
    </div>
  );
};

export default ItemUpload; 