import React, { useEffect, useState, useContext } from 'react';
import { Dialog, DialogContent, IconButton, DialogActions, DialogTitle, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getPublicUserProfile, rateUser } from '../services/mongodb';
import './UserProfileDialog.css';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';

const UserProfileDialog = ({ open, userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  const { user } = useContext(AuthContext);
  const isOwnProfile = user && profile && user._id === profile._id;
  const myRatingObj = user && profile && profile.ratings ? profile.ratings.find(r => r.rater === user._id || r.rater?._id === user._id) : null;
  const myRating = myRatingObj ? myRatingObj.value : 0;

  const fetchProfile = async (uid) => {
    setLoading(true);
    setError('');
    setProfile(null);
    getPublicUserProfile(uid)
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || err.message || 'Failed to load user profile');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    setUserRating(0);
    setRatingSuccess('');
    setRatingError('');
    setShowEditConfirm(false);
  }, [userId, open]);

  useEffect(() => {
    const fetchProfilePhotoUrl = async () => {
      if (profile && profile.photoKey) {
        try {
          const res = await axios.get(`/users/${profile._id}/profile-photo-url`);
          setProfilePhotoUrl(res.data.url);
        } catch (err) {
          setProfilePhotoUrl('');
        }
      } else if (profile && profile.photoURL) {
        setProfilePhotoUrl(profile.photoURL);
      } else {
        setProfilePhotoUrl('');
      }
    };
    fetchProfilePhotoUrl();
  }, [profile]);

  const handleRate = async () => {
    if (myRating && !showEditConfirm) {
      setShowEditConfirm(true);
      return;
    }
    if (!userRating && !myRating) return;
    setRatingSubmitting(true);
    setRatingError('');
    setRatingSuccess('');
    try {
      await rateUser(userId, userRating || myRating);
      fetchProfile(userId);
      setRatingSuccess('Thank you for your rating!');
      setUserRating(0);
      setShowEditConfirm(false);
    } catch (err) {
      setRatingError(err.response?.data?.message || err.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth><DialogContent>Loading...</DialogContent></Dialog>;
  if (error) return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth><DialogContent style={{ color: 'red' }}>{error}</DialogContent></Dialog>;
  if (!profile) return null;
  // Use averageRating from backend if available, otherwise calculate from ratings
  const avgRating = (profile && profile.averageRating !== undefined)
    ? Number(profile.averageRating).toFixed(1)
    : (profile && profile.ratings && profile.ratings.length > 0
        ? (profile.ratings.reduce((a, b) => a + b.value, 0) / profile.ratings.length).toFixed(1)
        : 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent>
        <IconButton
          onClick={onClose}
          style={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        <div className="user-profile-dialog-content">
          <div className="profile-header">
            <div className="profile-avatar">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={profile.displayName} />
              ) : (
                <span>
                  {profile.displayName
                    ? profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
                    : <i className="fa fa-user" />}
                </span>
              )}
            </div>
            <div className="profile-info">
              <h2>{profile.displayName}</h2>
              <div className="profile-stats">
                <span className="profile-stat">⭐ Rating: {avgRating}</span>
                {/* <span className="profile-stat">✅ Successful Trades: {profile.totalSuccessfulTrades || 0}</span> */}
                <span className="profile-stat">📦 Listed Items: {profile.totalListedItems || (profile.postings ? profile.postings.length : 0)}</span>
              </div>
              {user && !isOwnProfile && (
                <div style={{ marginTop: 12 }}>
                  <span>{myRating ? 'Update your rating:' : 'Rate this user:'} </span>
                  {[1,2,3,4,5].map(star => (
                    <span
                      key={star}
                      style={{ cursor: 'pointer', color: (userRating || myRating) >= star ? '#FFD600' : '#bbb', fontSize: 22 }}
                      onClick={() => setUserRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >★</span>
                  ))}
                  <button
                    style={{ marginLeft: 12, padding: '2px 12px', borderRadius: 6, border: '1px solid #bbb', background: '#f8f8f8', cursor: 'pointer', fontWeight: 600 }}
                    disabled={ratingSubmitting || !(userRating || myRating)}
                    onClick={handleRate}
                  >
                    {ratingSubmitting ? 'Submitting...' : myRating ? 'Update' : 'Submit'}
                  </button>
                  {ratingError && <div style={{ color: 'red', marginTop: 4 }}>{ratingError}</div>}
                  {ratingSuccess && <div style={{ color: 'green', marginTop: 4 }}>{ratingSuccess}</div>}
                  <Dialog open={showEditConfirm} onClose={() => setShowEditConfirm(false)}>
                    <DialogTitle>Update Rating?</DialogTitle>
                    <DialogContent>Are you sure you want to update your rating for this user?</DialogContent>
                    <DialogActions>
                      <Button onClick={() => setShowEditConfirm(false)} color="primary">Cancel</Button>
                      <Button onClick={() => { setShowEditConfirm(false); handleRate(); }} color="primary" autoFocus>Yes, Update</Button>
                    </DialogActions>
                  </Dialog>
                </div>
              )}
              {isOwnProfile && <div style={{ color: '#888', marginTop: 8 }}>You cannot rate yourself.</div>}
            </div>
          </div>
          <div className="user-items">
            <h3 style={{ marginTop: 24 }}>Listings</h3>
            {!profile.postings || profile.postings.length === 0 ? (
              <div style={{ color: '#888', margin: 16 }}>No items posted yet.</div>
            ) : (
              <div className="user-items-grid">
                {profile.postings.map(item => (
                  <div key={item._id} className="item-card tomato-style">
                    <img
                      src={item.imageUrls?.[0] || '/default-image.png'}
                      alt={item.title}
                      style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <div className="item-title tomato-style">{item.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Reusable component to display a user's average rating
export const UserRatingDisplay = ({ userId, style = {}, showLabel = true }) => {
  const [avgRating, setAvgRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getPublicUserProfile(userId)
      .then(profile => {
        let rating = 0;
        if (profile && profile.averageRating !== undefined) {
          rating = Number(profile.averageRating).toFixed(1);
        } else if (profile && profile.ratings && profile.ratings.length > 0) {
          rating = (profile.ratings.reduce((a, b) => a + b.value, 0) / profile.ratings.length).toFixed(2);
        }
        setAvgRating(rating);
        setLoading(false);
      })
      .catch(() => {
        setAvgRating(null);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <span style={style}>⭐ ...</span>;
  if (avgRating === null) return null;
  return (
    <span style={style} title={`User rating: ${avgRating}`}>
      ⭐ {showLabel ? `Rating: ${avgRating}` : avgRating}
    </span>
  );
};

export default UserProfileDialog; 