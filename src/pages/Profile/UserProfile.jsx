import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { getUserItems, getPublicUserProfile } from '../../services/mongodb';
import axios from 'axios';
import ImageCarousel from '../../components/ImageCarousel';
import EditItemDialog from '../../components/EditItemDialog';
import ItemUpload from '../../pages/Items/ItemUpload';
import { Dialog, TextField, Button, IconButton, Avatar } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import './UserProfile.css';
import { useParams } from 'react-router-dom';
import ImageEditor from '../../components/ImageEditor';

const UserProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const { userId } = useParams();
  const [items, setItems] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lastTried, setLastTried] = useState(Date.now());
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', photo: null });
  const [profileFormError, setProfileFormError] = useState('');
  const [profileFormLoading, setProfileFormLoading] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        if (userId) {
          // Viewing another user's profile
          const data = await getPublicUserProfile(userId);
          setProfileUser(data);
          setItems(data.postings || []);
        } else if (user) {
          // Viewing own profile
          setProfileUser(user);
          setProfileForm({ displayName: user.displayName || '', photo: null });
          const data = await getUserItems(user._id);
          setItems(data);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setError('User not found.');
        } else if (error.response && error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else if (error.message) {
          setError(error.message);
        } else {
          setError('Failed to load user profile.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, user, lastTried]);

  useEffect(() => {
    const fetchProfilePhotoUrl = async () => {
      if (profileUser && profileUser.photoKey) {
        try {
          const res = await axios.get(`/users/${profileUser._id}/profile-photo-url`);
          setProfilePhotoUrl(res.data.url);
        } catch (err) {
          setProfilePhotoUrl('');
        }
      } else if (profileUser && profileUser.photoURL) {
        setProfilePhotoUrl(profileUser.photoURL);
      } else {
        setProfilePhotoUrl('');
      }
    };
    fetchProfilePhotoUrl();
  }, [profileUser]);

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
      return `${process.env.REACT_APP_API_URL || ''}${imageUrls}`;
    }
    return '';
  };

  const formatPriceRange = (range) => {
    if (!range) return 'N/A';
    if (range === '1000+') return '$1000+';
    const [min, max] = range.split('-');
    return `$${min} - $${max}`;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user && !userId) {
    return <div className="error">Please log in to view your profile</div>;
  }

  if (error) {
    return (
      <div className="error">
        {error}
        <br />
        <button className="profile-retry-btn" onClick={() => setLastTried(Date.now())}>Retry</button>
      </div>
    );
  }

  if (!profileUser) {
    return <div className="error">User not found or could not be loaded.</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        {/* Profile Avatar */}
        <div className="profile-avatar">
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt={profileUser.displayName} />
          ) : (
            <span>
              {profileUser.displayName
                ? profileUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                : <i className="fa fa-user" />}
            </span>
          )}
          {/* Gentle message if no profile picture and it's the user's own profile */}
          {!profilePhotoUrl && !userId && (
            <div className="gentle-profile-message">
              You don't have a profile picture yet. Add one to personalize your profile!
            </div>
          )}
        </div>
        <div className="profile-info">
          <h2>{profileUser.displayName}</h2>
          {profileUser.email && <p>{profileUser.email}</p>}
          <div className="profile-stats">
            <span className="profile-stat">⭐ Rating: {profileUser.averageRating || 0}</span>
            {/* <span className="profile-stat">✅ Successful Trades: {profileUser.totalSuccessfulTrades || 0}</span> */}
            <span className="profile-stat">📦 Listed Items: {profileUser.totalListedItems || items.length}</span>
          </div>
          {/* Edit Profile button for own profile */}
          {!userId && (
            <Button variant="outlined" size="small" style={{marginTop:8}} onClick={() => setEditProfileOpen(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="user-items">
        <div className="items-header">
          <h2>{userId ? `${profileUser.displayName}'s Items` : 'My Items'}</h2>
          {!userId && (
            <button 
              className="profile-button success upload-item-button"
              onClick={() => setUploadDialogOpen(true)}
            >
              Upload New Item
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {!items.length ? (
          <div className="no-items">
            <p>{userId ? 'This user has not posted any items yet.' : "You haven't posted any items yet."}</p>
          </div>
        ) : (
          <div className="user-items-grid">
            {items.map((item) => (
              <div
                key={item._id}
                className="item-card tomato-style"
                style={{ cursor: userId ? 'default' : 'pointer', position: 'relative' }}
                onClick={() => {
                  if (!userId) {
                    setEditItem(item);
                    setEditDialogOpen(true);
                  }
                }}
              >
                <div className="item-image-container tomato-style" style={{ position: 'relative' }}>
                  <ImageCarousel
                    images={Array.isArray(item.imageUrls) ? item.imageUrls : [getImageUrl(item.imageUrl)]}
                  />
                  {!userId && (
                    <button
                      className="delete-item-btn"
                      title="Delete item"
                      onClick={e => {
                        e.stopPropagation();
                        setItemToDelete(item);
                        setShowDeleteDialog(true);
                      }}
                    >X</button>
                  )}
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
      {!userId && (
        <button
          className="fab-upload-btn"
          title="Upload New Item"
          onClick={() => setUploadDialogOpen(true)}
        >
          +
        </button>
      )}

      {showDeleteDialog && (
        <div className="dialog-overlay" onClick={handleDeleteCancel}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <button
              className="delete-dialog-close-btn"
              onClick={handleDeleteCancel}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="delete-dialog-content-center">
              <div className="delete-dialog-warning-icon">
                <span role="img" aria-label="Warning">⚠️</span>
              </div>
              <h2 className="delete-dialog-title">Delete Item</h2>
              <div className="delete-dialog-message">
                Are you sure you want to delete <b>"{itemToDelete?.title}"</b>?<br />
                <span className="delete-dialog-warning-text">This action cannot be undone.</span>
              </div>
            </div>
            <button
              className="delete-dialog-confirm-btn"
              onClick={handleDeleteConfirm}
              disabled={deletingItemId === itemToDelete._id}
            >
              {deletingItemId === itemToDelete?._id ? 'Deleting...' : 'Confirm Delete'}
            </button>
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
        <ItemUpload onSuccess={() => { setUploadDialogOpen(false); setLastTried(Date.now()); }} />
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="xs" fullWidth>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2>Edit Profile</h2>
          <Avatar
            src={
              imagePreviewUrl ? imagePreviewUrl :
              (profileForm.photo ? URL.createObjectURL(profileForm.photo) : (profileUser.photoURL || ''))
            }
            sx={{ width: 80, height: 80, mb: 2 }}
          >
            {(!imagePreviewUrl && !profileForm.photo && !profileUser.photoURL && profileUser.displayName) ? profileUser.displayName[0].toUpperCase() : null}
          </Avatar>
          {/* Re-adjust button for re-cropping the selected image */}
          {(profileForm.photo || imagePreviewUrl) && (
            <Button
              size="small"
              variant="outlined"
              style={{ marginBottom: 8 }}
              onClick={() => {
                let previewUrl = imagePreviewUrl;
                let fileToEdit = imageToEdit;
                if (!previewUrl && profileForm.photo) {
                  previewUrl = URL.createObjectURL(profileForm.photo);
                }
                if (profileForm.photo) {
                  fileToEdit = profileForm.photo;
                }
                setImagePreviewUrl(previewUrl);
                setImageToEdit(fileToEdit);
                setImageEditorOpen(true);
              }}
            >
              Re-adjust
            </Button>
          )}
          <label htmlFor="profile-photo-upload">
            <input
              accept="image/*"
              id="profile-photo-upload"
              type="file"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImagePreviewUrl(ev.target.result);
                    setImageToEdit(file);
                    setImageEditorOpen(true);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <IconButton color="primary" aria-label="upload picture" component="span">
              <PhotoCamera />
            </IconButton>
            <span style={{ fontSize: 12, color: '#888' }}>
              {profileForm.photo ? (profileForm.photo.name || 'Cropped Image') : 'Change profile picture'}
            </span>
          </label>
          <TextField
            label="Display Name"
            value={profileForm.displayName}
            onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
            fullWidth
            margin="normal"
          />
          {profileFormError && <div style={{ color: 'red', marginBottom: 8 }}>{profileFormError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setEditProfileOpen(false)} disabled={profileFormLoading}>Cancel</Button>
            <Button variant="contained" color="primary" disabled={profileFormLoading} onClick={async () => {
              setProfileFormError('');
              setProfileFormLoading(true);
              try {
                const formData = new FormData();
                formData.append('displayName', profileForm.displayName);
                if (profileForm.photo) {
                  formData.append('photo', profileForm.photo);
                }
                const response = await axios.put(
                  `/users/${user._id}/profile`,
                  formData,
                  {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    withCredentials: true
                  }
                );
                if (response.data) {
                  setProfileUser(response.data);
                  if (setUser) setUser(response.data);
                  setEditProfileOpen(false);
                  setLastTried(Date.now()); // refresh items/profile
                }
              } catch (err) {
                setProfileFormError(err.response?.data?.message || 'Failed to update profile');
              } finally {
                setProfileFormLoading(false);
              }
            }}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>

      {imageEditorOpen && imagePreviewUrl && (
        <Dialog open={imageEditorOpen} onClose={() => setImageEditorOpen(false)} maxWidth="sm" fullWidth>
          <ImageEditor
            image={imagePreviewUrl}
            onSave={blob => {
              // Convert blob to File for upload
              const croppedFile = new File(
                [blob],
                (imageToEdit && imageToEdit.name) ? imageToEdit.name : 'cropped.jpg',
                { type: 'image/jpeg' }
              );
              setProfileForm(f => ({ ...f, photo: croppedFile }));
              setImageEditorOpen(false);
              setImageToEdit(null);
              setImagePreviewUrl(null);
            }}
            onCancel={() => {
              setImageEditorOpen(false);
              setImageToEdit(null);
              setImagePreviewUrl(null);
            }}
          />
        </Dialog>
      )}
    </div>
  );
};

export default UserProfile; 