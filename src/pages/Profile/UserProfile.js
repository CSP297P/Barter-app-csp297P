import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { getUserItems } from '../../services/mongodb';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ImageUploader from '../../components/ImageUploader';
import ImageCarousel from '../../components/ImageCarousel';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  
  // Item upload states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('barter');
  const [condition, setCondition] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);

  const statusOptions = ['available', 'pending', 'traded'];

  useEffect(() => {
    const fetchUserItems = async () => {
      if (!user) return;

      try {
        const data = await getUserItems(user._id);
        setItems(data);
      } catch (error) {
        setError('Failed to load user items');
        console.error('Error fetching user items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserItems();
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleImageUploadComplete = async (images) => {
    if (images && images.length > 0) {
      setUploadedImages(images);
      setError('');
    } else {
      setError('Please upload at least one image');
    }
  };

  const handleItemUpload = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (uploadedImages.length === 0) {
      setError('Please upload at least one image');
      setLoading(false);
      return;
    }

    try {
      // Create the item data object matching the schema requirements
      const itemData = {
        title,
        description,
        category,
        type,
        condition,
        priceRange,
        imageUrls: uploadedImages.map(img => img.url),
        owner: user._id
      };

      // Make the API call with the correct endpoint and data
      const response = await axios.post('http://localhost:5001/api/items', itemData, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      if (response.data) {
        setItems(prevItems => [...prevItems, response.data]);
        setUploadMode(false);
        
        // Reset form
        setTitle('');
        setDescription('');
        setCategory('');
        setType('barter');
        setCondition('');
        setPriceRange('');
        setUploadedImages([]);
        setError('');
      }
    } catch (error) {
      console.error('Upload error:', error.response || error);
      setError(error.response?.data?.message || 'Failed to upload item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    setDeletingItemId(itemToDelete._id);
    try {
      console.log('Current user ID:', user._id);
      console.log('Item owner ID:', itemToDelete.owner._id);
      console.log('Item to delete:', itemToDelete);
      
      if (!(user._id === itemToDelete.owner._id)) {
        throw new Error('You are not authorized to delete this item');
      }

      console.log('Attempting to delete item:', itemToDelete._id);
      const response = await axios.delete(`/items/${itemToDelete._id}`, {
        data: { userId: user._id },
        withCredentials: true
      });
      
      console.log('Delete response:', response.data);
      
      if (response.data && response.data.message === 'Item deleted successfully') {
        setItems(prevItems => prevItems.filter(item => item._id !== itemToDelete._id));
        setError('');
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response) {
        setError(error.response.data.message || 'Failed to delete item');
      } else if (error.request) {
        setError('No response from server. Please try again.');
      } else {
        setError(error.message || 'An error occurred while deleting the item');
      }
    } finally {
      setDeletingItemId(null);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setItemToDelete(null);
  };

  const getImageUrl = (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return '';
    // If it's an array of URLs (new format), take the first one
    if (Array.isArray(imageUrls)) {
      return imageUrls[0];
    }
    // If it's a single URL (old format)
    if (typeof imageUrls === 'string') {
      if (imageUrls.startsWith('http')) return imageUrls;
      return `http://localhost:${process.env.REACT_APP_API_PORT}${imageUrls}`;
    }
    return '';
  };

  const handleStatusChange = async (itemId, newStatus) => {
    setUpdatingStatus(itemId);
    try {
      const response = await axios.put(`/items/${itemId}`, 
        { status: newStatus },
        { withCredentials: true }
      );
      
      if (response.data) {
        setItems(prevItems => 
          prevItems.map(item => 
            item._id === itemId ? response.data : item
          )
        );
        setError('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update item status';
      setError(errorMessage);
      
      setItems(prevItems => [...prevItems]);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const formatPriceRange = (range) => {
    if (!range) return 'N/A';
    if (range === '1000+') return '$1000+';
    const [min, max] = range.split('-');
    return `$${min} - $${max}`;
  };

  if (!user) {
    return <div className="error">Please log in to view your profile</div>;
  }

  if (loading && !uploadMode) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h1>My Profile</h1>
        <div className="profile-info">
          <h2>{user.displayName}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="user-items">
        <div className="items-header">
          <h2>My Items</h2>
          <button 
            className="profile-button success"
            onClick={() => setUploadMode(true)}
          >
            Upload New Item
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {uploadMode ? (
          <div className="upload-form">
            <button 
              className="back-button" 
              onClick={() => {
                setUploadMode(false);
                setImage(null);
                setPreviewUrl('');
              }}
              aria-label="Go back"
            >
              ←
            </button>
            <h3>Upload New Item</h3>
            <form onSubmit={handleItemUpload}>
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
              <div className="form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Item'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setUploadMode(false);
                    setImage(null);
                    setPreviewUrl('');
                  }}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : !items.length ? (
          <div className="no-items">
            <p>You haven't posted any items yet.</p>
            <button 
              className="profile-button success upload-item-button"
              onClick={() => setUploadMode(true)}
            >
              Upload Your First Item
            </button>
          </div>
        ) : (
          <div className="items-grid">
            {items.map((item) => (
              <div key={item._id} className="item-card">
                <div className="item-image-container">
                  <ImageCarousel 
                    images={Array.isArray(item.imageUrls) ? item.imageUrls : [getImageUrl(item.imageUrl)]} 
                  />
                  <div className="tags-container">
                    <div className="badge-wrapper">
                      <div className="badge-label">TYPE</div>
                      <div className={`badge-value ${!item.type ? 'not-available' : 'has-value'}`}>
                        {item.type || 'N/A'}
                      </div>
                    </div>
                    <div className="badge-wrapper">
                      <div className="badge-label">CATEGORY</div>
                      <div className={`badge-value ${!item.category ? 'not-available' : 'has-value'}`}>
                        {item.category || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="item-info">
                  <h3>{item.title}</h3>
                  <p className="description">{item.description}</p>
                  <p className="condition">{item.condition}</p>
                  <p className="price-range">Est. Value: {formatPriceRange(item.priceRange)}</p>
                  <div className="status-wrapper">
                    <label htmlFor={`status-${item._id}`}>Status:</label>
                    <select
                      id={`status-${item._id}`}
                      value={item.status}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      disabled={updatingStatus === item._id}
                      className={`status-select ${item.status}`}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                    {updatingStatus === item._id && <span className="status-updating">Updating...</span>}
                  </div>
                  <div className="item-actions">
                    <button
                      className="edit-button"
                      onClick={() => navigate(`/item/${item._id}/edit`)}
                    >
                      Edit Item
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteClick(item)}
                      disabled={deletingItemId === item._id}
                    >
                      {deletingItemId === item._id ? 'Deleting...' : 'Delete Item'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteDialog && (
        <div className="dialog-overlay" onClick={handleDeleteCancel}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <h2>Delete Item</h2>
            <p>Are you sure you want to delete "{itemToDelete?.title}"? This action cannot be undone.</p>
            <div className="dialog-actions">
              <button 
                className="cancel-button"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDeleteConfirm}
                disabled={deletingItemId === itemToDelete?._id}
              >
                {deletingItemId === itemToDelete?._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 