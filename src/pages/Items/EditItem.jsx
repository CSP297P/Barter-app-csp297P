import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { getItemById, updateItem } from '../../services/mongodb';
import ImageUploader from '../../components/ImageUploader';
import './EditItem.css';
import { TextField, MenuItem } from '@mui/material';

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [originalItem, setOriginalItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const { user } = useContext(AuthContext);
  const [currentImages, setCurrentImages] = useState([]);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const data = await getItemById(id);
        if (data.owner._id !== user._id) {
          navigate('/marketplace');
          return;
        }
        setItem(data);
        setOriginalItem(data);
        // Initialize currentImages with existing images
        if (Array.isArray(data.imageUrls)) {
          setCurrentImages(data.imageUrls.map((url, index) => ({
            file: `image-${index}`,
            url: url
          })));
        }
      } catch (error) {
        setError('Failed to load item');
        console.error('Error fetching item:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, user, navigate]);

  const hasUnsavedChanges = () => {
    if (!item || !originalItem) return false;
    return (
      item.title !== originalItem.title ||
      item.description !== originalItem.description ||
      item.category !== originalItem.category ||
      item.condition !== originalItem.condition ||
      JSON.stringify(item.imageUrls) !== JSON.stringify(originalItem.imageUrls)
    );
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [item, originalItem]);

  const handleBack = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleImageUploadComplete = async (uploadedImages) => {
    if (!uploadedImages || uploadedImages.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    console.log('Received uploaded images:', uploadedImages);

    // Filter out any invalid image objects and ensure URLs are unique
    const validImages = uploadedImages.filter(img => img && img.url);
    const uniqueImages = Array.from(new Set(validImages.map(img => img.url)))
      .map(url => validImages.find(img => img.url === url));

    if (uniqueImages.length === 0) {
      setError('No valid images were uploaded');
      return;
    }

    // Update currentImages state with the full image objects
    setCurrentImages(uniqueImages);

    // Update the item state with just the URLs
    const imageUrls = uniqueImages.map(img => img.url);
    console.log('Setting image URLs:', imageUrls);
    
    setItem(prev => {
      const updated = {
        ...prev,
        imageUrls: imageUrls
      };
      console.log('Updated item state:', updated);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create a copy of the current item data with all fields
      const updatedData = {
        title: item.title,
        description: item.description,
        category: item.category,
        type: item.type,
        condition: item.condition,
        priceRange: item.priceRange,
        imageUrls: currentImages.map(img => img.url),
        status: item.status
      };

      console.log('Updating item with data:', updatedData);

      // Update the item
      const result = await updateItem(id, updatedData);

      // Update the item state with the result
      setItem(result);
      setOriginalItem(result);
      
      // Update currentImages with the received URLs
      if (Array.isArray(result.imageUrls)) {
        setCurrentImages(result.imageUrls.map((url, index) => ({
          file: `image-${index}`,
          url: url
        })));
      }

      // Navigate away
      navigate('/profile');
    } catch (error) {
      const errorMessage = `Failed to update item: ${error.message}`;
      console.error(errorMessage, error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!item) {
    return <div className="error">Item not found</div>;
  }

  return (
    <div className="edit-item">
      <div className="edit-header">
        <button className="back-button" onClick={handleBack}>
          ←
        </button>
        <h2>Edit Item</h2>
      </div>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={item.title}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select
            name="category"
            value={item.category}
            onChange={handleChange}
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
          <label>Condition</label>
          <select
            name="condition"
            value={item.condition}
            onChange={handleChange}
            required
          >
            <option value="New">New</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Estimated Value Range</label>
          <TextField
            select
            name="priceRange"
            label="Estimated Value Range"
            value={item.priceRange}
            onChange={handleChange}
            required
            fullWidth
            InputProps={{ className: 'item-upload-input' }}
            SelectProps={{ open: true }}
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
        <div className="form-group">
          <label>Images</label>
          <ImageUploader
            onUploadComplete={handleImageUploadComplete}
            maxFiles={10}
            initialImages={currentImages}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={handleBack}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {showUnsavedDialog && (
        <div className="dialog-overlay" onClick={() => setShowUnsavedDialog(false)}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <h2>Unsaved Changes</h2>
            <p>You have unsaved changes. Are you sure you want to leave?</p>
            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowUnsavedDialog(false)}
              >
                Stay
              </button>
              <button 
                className="confirm-button"
                onClick={() => navigate(-1)}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditItem; 