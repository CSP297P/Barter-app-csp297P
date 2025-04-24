import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import './ItemDetail.css';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await axios.get(`/items/${id}`);
        setItem(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    console.log("imagePath: " + imagePath);
    return `http://localhost:${process.env.REACT_APP_API_PORT}${imagePath}`;
  };

  const handleStartChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowChatDialog(true);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setSending(true);
    try {
      await axios.post('/messages', {
        recipientId: item.owner._id,
        itemId: item._id,
        content: message
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowChatDialog(false);
      setMessage('');
      // You could add a success toast/notification here
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading item details...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!item) {
    return <div className="error-message">Item not found</div>;
  }

  return (
    <div className="item-detail">
      <div className="item-detail-container">
        <div className="item-image">
          <img src={getImageUrl(item.imageUrl)} alt={item.title} />
          <div className={`type-badge ${item.category}`}>{item.category}</div>
        </div>
        
        <div className="item-info">
          <h1>{item.title}</h1>
          <p className="description">{item.description}</p>
          
          <div className="item-meta">
            <p className="condition">Condition: {item.condition}</p>
            <p className="status">Status: {item.status}</p>
          </div>
          
          <div className="owner-info">
            <div>
              <p>Posted by: {item.owner.username}</p>
              <p>Posted on: {new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            
            {user && 
             user._id !== item.owner._id && 
             item.status === 'available' && (
              <button 
                className="chat-button"
                onClick={handleStartChat}
              >
                Start Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {showChatDialog && (
        <div className="dialog-overlay" onClick={() => setShowChatDialog(false)}>
          <div className="dialog-content" onClick={e => e.stopPropagation()}>
            <h2>Send Message to {item.owner.username}</h2>
            <form className="chat-form" onSubmit={e => e.preventDefault()}>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message here..."
                rows="4"
              />
              <div className="dialog-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setShowChatDialog(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="send-button"
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sending}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemDetail; 