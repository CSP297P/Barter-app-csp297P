import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import ImageCarousel from '../../components/ImageCarousel';
import './ItemDetail.css';
import ItemUpload from './ItemUpload';
import { Dialog } from '@mui/material';

const formatPriceRange = (range) => {
  if (!range) return 'N/A';
  if (range === '1000+') return '$1000+';
  if (range.startsWith('$')) return range; // already formatted
  if (range.includes('/')) return range; // e.g. "$5.99 / lb"
  const [min, max] = range.split('-');
  if (min && max) return `$${min} - $${max}`;
  return `$${range}`;
};

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { joinTradeSession, sendMessage, isConnected, onMessage } = useSocket();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [tradeSession, setTradeSession] = useState(null);
  const messagesEndRef = useRef(null);
  const [showTradeDialog, setShowTradeDialog] = useState(false);
  const [userItems, setUserItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loadingUserItems, setLoadingUserItems] = useState(false);
  const [initialTradeMessage, setInitialTradeMessage] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle incoming messages
  const handleNewMessage = useCallback((newMessage) => {
    setMessages(prevMessages => {
      // Check if message already exists to avoid duplicates
      if (prevMessages.some(msg => msg._id === newMessage._id)) {
        return prevMessages;
      }
      return [...prevMessages, newMessage];
    });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Set up message listener when chat is opened
  useEffect(() => {
    if (showChatDialog) {
      const unsubscribe = onMessage(handleNewMessage);
      return () => unsubscribe();
    }
  }, [showChatDialog, onMessage, handleNewMessage]);

  useEffect(() => {
    if (showChatDialog && isConnected && user && item) {
      const initializeChat = async () => {
        try {
          // Create or get existing trade session
          const requestData = {
            itemId: item._id,
            participants: [user._id, item.owner._id]
          };
          console.log('Creating trade session with data:', requestData);
          
          const response = await axios.post('/trade-sessions', requestData, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          const session = response.data;
          setTradeSession(session);
          
          // Join the trade session room
          await joinTradeSession(session._id);
          
          // Fetch existing messages
          const messagesResponse = await axios.get(`/messages/session/${session._id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          setMessages(messagesResponse.data);
        } catch (err) {
          console.error('Error creating trade session:', err.response?.data || err);
          setError(err.response?.data?.message || 'Failed to initialize chat');
          setShowChatDialog(false);
        }
      };
      
      initializeChat();
    }
  }, [showChatDialog, isConnected, user, item, joinTradeSession]);

  // Fetch user's available items when trade dialog opens
  useEffect(() => {
    const fetchUserItems = async () => {
      if (showTradeDialog && user) {
        setLoadingUserItems(true);
        try {
          const response = await axios.get('/items/user/available', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          setUserItems(response.data);
        } catch (err) {
          setError('Failed to load your items');
        } finally {
          setLoadingUserItems(false);
        }
      }
    };

    fetchUserItems();
  }, [showTradeDialog, user]);

  const getImageUrls = (item) => {
    if (!item) return [];
    // Handle new format (imageUrls array)
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      return item.imageUrls;
    }
    // Handle old format (single imageUrl)
    if (item.imageUrl) {
      if (item.imageUrl.startsWith('http')) return [item.imageUrl];
      return [`${process.env.REACT_APP_API_URL || ''}${item.imageUrl}`];
    }
    return [];
  };

  const handleStartChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowChatDialog(true);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !tradeSession) return;
    
    setSending(true);
    try {
      await sendMessage(tradeSession._id, message, user._id);
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTradeRequest = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (item.type === 'barter') {
      setShowTradeDialog(true);
    } else {
      handleStartChat();
    }
  };

  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      return [...prev, itemId];
    });
  };

  // Helper to extract lower bound from priceRange string
  const getLowerBound = (range) => {
    if (!range) return 0;
    if (range === '1000+') return 1000;
    const [min] = range.split('-');
    return parseInt(min.replace(/[^0-9]/g, ''), 10) || 0;
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
      <button className="back-button" onClick={() => navigate(-1)} aria-label="Go back">
        ←
      </button>
      <div className="item-detail-container">
        <div className="item-image">
          <ImageCarousel images={getImageUrls(item)} />
          <div className={`type-badge ${item.category}`}>{item.category}</div>
        </div>
        
        <div className="item-info">
          <h1>{item.title}</h1>
          <p className="item-price">Price Range: {formatPriceRange(item.priceRange)}</p>
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
          <p className="description">{item.description}</p>
          <div className="item-meta">
            <p className="condition">Condition: {item.condition}</p>
            <p className="status">Status: {item.status}</p>
          </div>
          <div className="owner-info">
            <div>
              <p>Posted by: {item.owner.displayName || item.owner.username || 'Unknown'}</p>
              <p>Posted on: {new Date(item.createdAt).toLocaleDateString()}</p>
            </div>
            
            {user && 
             user._id !== item.owner._id && 
             item.status === 'available' && (
              <button 
                className="chat-button"
                onClick={handleTradeRequest}
              >
                Request Trade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trade Request Dialog */}
      {showTradeDialog && (
        <div className="dialog-overlay" onClick={() => setShowTradeDialog(false)}>
          <div className="dialog-content modern-trade-dialog" onClick={e => e.stopPropagation()}>
            <button className="close-dialog-btn" onClick={() => {
              setShowTradeDialog(false);
              setSelectedItems([]);
              setInitialTradeMessage('');
            }} aria-label="Close">
              &times;
            </button>
            <header className="trade-dialog-header">
              <h2>Select Items to Trade</h2>
              <div className="trade-dialog-divider" />
              <div className="trade-dialog-subheading">
                Choose one or more items you want to offer for <b>{item.title}</b> and write a message to the owner.
              </div>
            </header>
            {loadingUserItems ? (
              <div className="loading-container">
                <div className="loading-spinner" />
                <p>Loading your items...</p>
              </div>
            ) : userItems.length === 0 ? (
              <div className="no-items">
                <p>You don't have any items available for trade.</p>
                <button onClick={() => setShowUploadDialog(true)} className="upload-item-btn">
                  Upload an Item
                </button>
              </div>
            ) : (
              (() => {
                const eligibleItems = userItems.filter(userItem => getLowerBound(userItem.priceRange) >= getLowerBound(item.priceRange));
                if (eligibleItems.length === 0) {
                  return (
                    <div className="no-items">
                      <p>You don't have any items with a high enough value to trade for this item.</p>
                      <button onClick={() => setShowUploadDialog(true)} className="upload-item-btn">
                        Upload an Item
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="trade-items-row">
                    {eligibleItems.map(userItem => (
                      <div
                        key={userItem._id}
                        className={`item-card tomato-style${selectedItems.includes(userItem._id) ? ' selected' : ''}`}
                        tabIndex={0}
                        aria-checked={selectedItems.includes(userItem._id)}
                        role="checkbox"
                        onClick={() => handleItemSelect(userItem._id)}
                        onKeyDown={e => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            handleItemSelect(userItem._id);
                          }
                        }}
                      >
                        {/* Selection indicator */}
                        {selectedItems.includes(userItem._id) && (
                          <div className="selected-indicator">
                            <span>✔</span>
                          </div>
                        )}
                        <div className="item-image-container tomato-style">
                          <ImageCarousel images={getImageUrls(userItem)} />
                        </div>
                        <div className="item-info tomato-style">
                          <div className="item-title tomato-style">{userItem.title}</div>
                          <div className="item-price tomato-style">{formatPriceRange(userItem.priceRange)}</div>
                          {/* <div className="item-description tomato-style">
                            {userItem.description}
                          </div> */}
                          {/* <div className="item-tags tomato-style">
                            <span className={`tag tag-type ${userItem.type}`}>
                              {userItem.type === 'barter' ? '🔄' : userItem.type === 'giveaway' ? '🎁' : '❓'}{' '}
                              {userItem.type ? userItem.type.charAt(0).toUpperCase() + userItem.type.slice(1) : 'N/A'}
                            </span>
                            <span className={`tag tag-condition ${userItem.condition?.toLowerCase().replace(/\s/g, '-')}`}> 
                              {userItem.condition === 'New' ? '🆕' :
                               userItem.condition === 'Like New' ? '✨' :
                               userItem.condition === 'Good' ? '👍' :
                               userItem.condition === 'Fair' ? '👌' :
                               userItem.condition === 'Poor' ? '⚠️' : '❓'}{' '}
                              {userItem.condition || 'N/A'}
                            </span>
                            <span className={`tag tag-category ${userItem.category}`}>
                              {userItem.category === 'furniture' ? '🛋️' :
                               userItem.category === 'electronics' ? '💻' :
                               userItem.category === 'books' ? '📚' :
                               userItem.category === 'clothing' ? '👕' :
                               userItem.category === 'sports-equipment' ? '🏀' :
                               userItem.category === 'musical-instruments' ? '🎸' :
                               userItem.category === 'tools' ? '🛠️' :
                               userItem.category === 'art-supplies' ? '🎨' :
                               userItem.category === 'other' ? '❔' : '❓'}{' '}
                              {userItem.category || 'N/A'}
                            </span>
                          </div> */}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
            <textarea
              className="trade-message-input modern-textarea"
              value={initialTradeMessage}
              onChange={e => setInitialTradeMessage(e.target.value)}
              placeholder="Write a message to the owner..."
              rows={5}
              aria-label="Message to owner"
            />
            <div className="dialog-actions modern-actions">
              <button onClick={() => {
                setShowTradeDialog(false);
                setSelectedItems([]);
                setInitialTradeMessage('');
              }} className="modern-cancel-btn">Cancel</button>
              <button
                onClick={async () => {
                  if (selectedItems.length === 0) {
                    setError('Please select at least one item to trade');
                    return;
                  }
                  try {
                    // Create trade session with selected items
                    const requestData = {
                      itemId: item._id,
                      participants: [user._id, item.owner._id],
                      offeredItemIds: selectedItems
                    };
                    const response = await axios.post('/trade-sessions', requestData, {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      }
                    });
                    const session = response.data;
                    setTradeSession(session);
                    setShowTradeDialog(false);
                    // Send initial message if provided
                    if (initialTradeMessage.trim()) {
                      await sendMessage(session._id, initialTradeMessage, user._id);
                    }
                    setInitialTradeMessage('');
                  } catch (err) {
                    setError('Failed to create trade request');
                  }
                }}
                className="modern-submit-btn"
                disabled={selectedItems.length === 0}
              >
                Submit Trade Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Item Dialog for trade dialog */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)} maxWidth="sm" fullWidth>
        <ItemUpload onSuccess={() => {
          setShowUploadDialog(false);
          // Refetch user items after upload
          if (user) {
            axios.get('/items/user/available', {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }).then(res => setUserItems(res.data));
          }
        }} />
      </Dialog>
    </div>
  );
};

export default ItemDetail; 