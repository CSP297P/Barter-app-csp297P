import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { getUserItems, updateUserProfile } from '../../services/mongodb';
import axios from 'axios';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);
  
  // Item upload states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('barter');
  const [condition, setCondition] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

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

  const handleItemUpload = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!image) {
      setError('Please select an image');
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
      formData.append('userId', user._id);

      const response = await axios.post('http://localhost:5000/api/items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      console.log('Upload response:', response.data);
      setItems(prevItems => [...prevItems, response.data]);
      setUploadMode(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('barter');
      setCondition('');
      setImage(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Upload error:', error.response || error);
      setError(error.response?.data?.message || 'Failed to upload item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    setDeletingItemId(itemId);
    try {
      // Find the item in the current items list
      const itemToDelete = items.find(item => item._id === itemId);
      
      console.log('Current user ID:', user._id);
      console.log('Item owner ID:', itemToDelete?.owner);
      console.log('Item to delete:', itemToDelete);
      
      // Check if the current user is the owner of the item
      if (!itemToDelete) {
        throw new Error('Item not found');
      }
      
      // Verify authorization token before deletion
      console.log('All localStorage items:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`${key}: ${localStorage.getItem(key)}`);
      }
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Log token information for debugging
      console.log('Required token format: Bearer <jwt_token>');
      console.log('Available token:', token);
      console.log('Authorization header:', `Bearer ${token}`);

      // Add token to request headers for server-side verification
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // Let the server handle authorization check
      const authCheck = await axios.get(`http://localhost:5000/api/items/${itemId}/can-delete`, {
        headers,
        withCredentials: true
      });

      if (!authCheck.data.authorized) {
        throw new Error('You are not authorized to delete this item');
      }

      console.log('Attempting to delete item:', itemId);
      const response = await axios.delete(`http://localhost:5000/api/items/${itemId}`, {
        data: { userId: user._id },
        withCredentials: true
      });
      
      console.log('Delete response:', response.data);
      
      if (response.data && response.data.message === 'Item deleted successfully') {
        // Remove the item from the local state
        setItems(prevItems => prevItems.filter(item => item._id !== itemId));
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
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `http://localhost:5000${imageUrl}`;
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
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
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
                  <img src={getImageUrl(item.imageUrl)} alt={item.title} />
                  <div className={`type-badge ${item.category}`}>
                    {item.category}
                  </div>
                </div>
                <div className="item-info">
                  <h3>{item.title}</h3>
                  <p className="condition">{item.condition}</p>
                  <p className="status">Status: {item.status}</p>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteItem(item._id)}
                    disabled={deletingItemId === item._id}
                  >
                    {deletingItemId === item._id ? 'Deleting...' : 'Delete Item'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 