import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { getUserItems } from '../../services/mongodb';
import axios from 'axios';
import ImageCarousel from '../../components/ImageCarousel';
import EditItemDialog from '../../components/EditItemDialog';
import ItemUpload from '../../pages/Items/ItemUpload';
import { Dialog } from '@mui/material';
import './UserProfile.css';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
    console.log('imageUrls:', imageUrls);
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

  const formatPriceRange = (range) => {
    if (!range) return 'N/A';
    if (range === '1000+') return '$1000+';
    const [min, max] = range.split('-');
    return `$${min} - $${max}`;
  };

  if (!user) {
    return <div className="error">Please log in to view your profile</div>;
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        {/* Profile Avatar */}
        <div className="profile-avatar">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.displayName} />
          ) : (
            <span>
              {user.displayName
                ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                : <i className="fa fa-user" />}
            </span>
          )}
        </div>
        <div className="profile-info">
          <h2>{user.displayName}</h2>
          <p>{user.email}</p>
        </div>
      </div>

      <div className="user-items">
        <div className="items-header">
          <h2>My Items</h2>
          <button 
            className="profile-button success upload-item-button"
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload New Item
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!items.length ? (
          <div className="no-items">
            <p>You haven't posted any items yet.</p>
          </div>
        ) : (
          <div className="user-items-grid">
            {items.map((item) => (
              <div
                key={item._id}
                className="item-card tomato-style"
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => {
                  setEditItem(item);
                  setEditDialogOpen(true);
                }}
              >
                <div className="item-image-container tomato-style" style={{ position: 'relative' }}>
                  <ImageCarousel
                    images={Array.isArray(item.imageUrls) ? item.imageUrls : [getImageUrl(item.imageUrl)]}
                  />
                  <button
                    className="delete-item-btn"
                    title="Delete item"
                    onClick={e => {
                      e.stopPropagation();
                      setItemToDelete(item);
                      setShowDeleteDialog(true);
                    }}
                  >✕</button>
                </div>
                <div className="item-info tomato-style">
                  <div className="item-title tomato-style">{item.title}</div>
                  <div className="item-price tomato-style">{formatPriceRange(item.priceRange)}</div>
                  <div className="item-description tomato-style">
                    {item.description}
                  </div>
                  <div className="item-tags tomato-style">
                    <span className={`tag tag-type ${item.type}`}>
                      {item.type === 'barter' ? '🔄' : item.type === 'giveaway' ? '🎁' : '❓'}{' '}
                      {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'N/A'}
                    </span>
                    <span className={`tag tag-condition ${item.condition?.toLowerCase().replace(/\s/g, '-')}`}> 
                      {item.condition === 'New' ? '🆕' :
                       item.condition === 'Like New' ? '✨' :
                       item.condition === 'Good' ? '👍' :
                       item.condition === 'Fair' ? '👌' :
                       item.condition === 'Poor' ? '⚠️' : '❓'}{' '}
                      {item.condition || 'N/A'}
                    </span>
                    <span className={`tag tag-category ${item.category}`}>
                      {item.category === 'furniture' ? '🛋️' :
                       item.category === 'electronics' ? '💻' :
                       item.category === 'books' ? '📚' :
                       item.category === 'clothing' ? '👕' :
                       item.category === 'sports-equipment' ? '🏀' :
                       item.category === 'musical-instruments' ? '🎸' :
                       item.category === 'tools' ? '🛠️' :
                       item.category === 'art-supplies' ? '🎨' :
                       item.category === 'other' ? '❔' : '❓'}{' '}
                      {item.category || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button for Upload (mobile only) */}
      <button
        className="fab-upload-btn"
        title="Upload New Item"
        onClick={() => setUploadDialogOpen(true)}
      >
        +
      </button>

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

      <EditItemDialog
        open={editDialogOpen}
        item={editItem || {}}
        onClose={() => setEditDialogOpen(false)}
        onSave={async (updatedItem) => {
          try {
            const response = await axios.put(`/items/${updatedItem._id}`, updatedItem, { withCredentials: true });
            if (response.data) {
              setItems((prev) => prev.map((it) => (it._id === updatedItem._id ? response.data : it)));
              setEditDialogOpen(false);
              setEditItem(null);
            }
          } catch (err) {
            setError(err.response?.data?.message || 'Failed to update item');
          }
        }}
      />

      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <ItemUpload onSuccess={() => setUploadDialogOpen(false)} />
      </Dialog>
    </div>
  );
};

export default UserProfile; 