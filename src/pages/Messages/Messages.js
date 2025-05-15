import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import config from '../../config';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ItemUpload from '../Items/ItemUpload';
import ConfirmDialog from '../../components/ConfirmDialog';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { joinTradeSession, sendMessage, isConnected, onMessage } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, sessionId: null });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Fetch all conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get(`${config.API_BASE_URL}/trade-sessions/user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setConversations(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load conversations');
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Restore selected conversation from localStorage after conversations are loaded
  useEffect(() => {
    if (conversations.length > 0) {
      const storedId = localStorage.getItem('selectedConversationId');
      if (storedId) {
        const found = conversations.find(conv => conv._id === storedId);
        if (found) setSelectedConversation(found);
      }
    }
  }, [conversations]);

  // When a conversation is selected, persist its ID
  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    localStorage.setItem('selectedConversationId', conv._id);
  };

  // Handle incoming messages
  const handleNewMessage = useCallback((message) => {
    if (selectedConversation && String(message.sessionId) === String(selectedConversation._id)) {
      setMessages(prevMessages => {
        if (prevMessages.some(msg => String(msg._id) === String(message._id))) {
          return prevMessages;
        }
        const updated = [...prevMessages, message];
        return updated;
      });
    }
    // Update unread count if message is from other user
    if (String(message.senderId || message.sender) !== String(user._id)) {
      setUnreadCounts(prev => ({
        ...prev,
        [message.sessionId]: (prev[message.sessionId] || 0) + 1
      }));
    }
  }, [user._id, selectedConversation]);

  // Set up message listener
  useEffect(() => {
    const unsubscribe = onMessage(handleNewMessage);
    return () => unsubscribe();
  }, [onMessage, handleNewMessage]);

  // Join selected conversation
  useEffect(() => {
    const joinRoom = async () => {
      if (selectedConversation && isConnected) {
        try {
          await joinTradeSession(selectedConversation._id);
          // Reset unread count when selecting conversation
          setUnreadCounts(prev => ({
            ...prev,
            [selectedConversation._id]: 0
          }));
        } catch (err) {
          console.error('Failed to join trade session room:', err);
        }
      }
    };
    joinRoom();
  }, [selectedConversation, isConnected, joinTradeSession]);

  // Fetch and merge messages for selected conversation when it changes
  useEffect(() => {
    if (selectedConversation) {
      const fetchMessages = async () => {
        try {
          const response = await axios.get(`${config.API_BASE_URL}/messages/session/${selectedConversation._id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          // Merge fetched messages with any already in state (from socket)
          setMessages(prevMessages => {
            const all = [...response.data];
            prevMessages.forEach(msg => {
              if (!all.some(fetched => String(fetched._id) === String(msg._id))) {
                all.push(msg);
              }
            });
            // Sort by timestamp if needed
            all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return all;
          });
          setTimeout(scrollToBottom, 100);
        } catch (err) {
          setError('Failed to load messages');
        }
      };
      fetchMessages();
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      await sendMessage(selectedConversation._id, newMessage, user._id);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = (sessionId) => {
    setConfirmDelete({ open: true, sessionId });
  };

  const handleConfirmDelete = async () => {
    const sessionId = confirmDelete.sessionId;
    setConfirmDelete({ open: false, sessionId: null });
    try {
      await axios.delete(`${config.API_BASE_URL}/trade-sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setConversations(prev => prev.filter(conv => conv._id !== sessionId));
      if (selectedConversation?._id === sessionId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Failed to delete conversation');
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete({ open: false, sessionId: null });
  };

  // Helper to determine if current user is the recipient (User B)
  const isRecipient = selectedConversation && selectedConversation.participants[1]._id === user._id;
  const isPending = selectedConversation && selectedConversation.status === 'pending';
  const isDenied = selectedConversation && selectedConversation.status === 'denied';
  const isActive = selectedConversation && selectedConversation.status === 'active';

  // Accept/Deny handlers
  const handleAcceptTrade = async () => {
    if (!selectedConversation) return;
    try {
      await axios.put(`${config.API_BASE_URL}/trade-sessions/${selectedConversation._id}/status`, { status: 'active' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedConversation({ ...selectedConversation, status: 'active' });
      // Optionally refetch conversations
      setConversations(prev => prev.map(conv => conv._id === selectedConversation._id ? { ...conv, status: 'active' } : conv));
    } catch (err) {
      setError('Failed to accept trade request');
    }
  };
  const handleDenyTrade = async () => {
    if (!selectedConversation) return;
    try {
      await axios.put(`${config.API_BASE_URL}/trade-sessions/${selectedConversation._id}/status`, { status: 'denied' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedConversation({ ...selectedConversation, status: 'denied' });
      setConversations(prev => prev.map(conv => conv._id === selectedConversation._id ? { ...conv, status: 'denied' } : conv));
    } catch (err) {
      setError('Failed to deny trade request');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="messages-page modern-messages-layout">
      {/* Conversations Panel */}
      <div className="conversations-panel modern-conversations-panel">
        <h2>Conversations</h2>
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="no-conversations">No conversations found.</div>
          ) : conversations.map(conv => {
            const otherUser = conv.participants.find(p => p._id !== user._id);
            // Avatar: use first letter of displayName or fallback
            const avatarLetter = (otherUser?.displayName || '?');
            return (
              <div
                key={conv._id}
                className={`conversation-item modern-conversation-item ${selectedConversation?._id === conv._id ? 'selected' : ''}`}
              >
                <div 
                  className="conversation-preview"
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="conversation-avatar" aria-label={`Avatar for ${otherUser?.displayName || 'User'}`}>{avatarLetter}</div>
                  <div className="conversation-info">
                    <h3>{conv.item ? conv.item.title : 'Untitled Item'}</h3>
                    <p>with {otherUser?.displayName || 'User'}</p>
                    {conv.status === 'pending' && (
                      <span className="pending-badge">Pending</span>
                    )}
                    {conv.status === 'denied' && (
                      <span className="denied-badge">Rejected</span>
                    )}
                  </div>
                </div>
                <div className="conversation-actions">
                  {unreadCounts[conv._id] > 0 && (
                    <div className="unread-badge">{unreadCounts[conv._id]}</div>
                  )}
                  <button
                    className="delete-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv._id);
                    }}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages Panel */}
      <div className="messages-panel modern-messages-panel">
        {selectedConversation ? (
          <>
            <div className="messages-header modern-messages-header">
              {selectedConversation
                ? `Chat with ${selectedConversation.participants.find(p => p._id !== user._id)?.displayName || 'User'}`
                : 'Chat'}
            </div>
            <div className="messages-container modern-messages-container">
              {isPending ? (
                isRecipient ? (
                  <div className="chat-request-container">
                    <div className="chat-request-message">
                      This user wants to trade for your item. Accept or reject the request to start chatting.
                    </div>
                    <div className="chat-request-actions">
                      <button className="chat-request-btn accept" onClick={handleAcceptTrade}>Accept</button>
                      <button className="chat-request-btn reject" onClick={handleDenyTrade}>Reject</button>
                    </div>
                  </div>
                ) : (
                  <div className="pending-info">
                    <p>Waiting for the other user to accept or reject your trade request.</p>
                  </div>
                )
              ) : isDenied ? (
                <div className="denied-info">
                  <p>This trade request was rejected.</p>
                </div>
              ) : isActive ? (
                messages.length === 0 ? (
                  <div className="no-messages">No messages yet. Start the conversation!</div>
                ) : (
                  <>
                    {messages.map(msg => {
                      const isSent = msg.senderId === user._id;
                      let formattedDate = 'Just now';
                      if (msg.timestamp) {
                        const dateObj = new Date(msg.timestamp);
                        if (!isNaN(dateObj.getTime())) {
                          formattedDate = dateObj.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          });
                        } else {
                          formattedDate = String(msg.timestamp); // fallback to raw value
                        }
                      }
                      // Avatar for chat bubbles
                      const sender = selectedConversation.participants.find(p => p._id === msg.senderId);
                      const senderAvatar = (sender?.displayName || '?');
                      return (
                        <div
                          key={msg._id}
                          className={`message-bubble modern-message-bubble ${isSent ? 'sent' : 'received'}`}
                        >
                          {!isSent && (
                            <div className="bubble-avatar" aria-label={`Avatar for ${sender?.displayName || 'User'}`}>{senderAvatar}</div>
                          )}
                          <div className="bubble-content">
                            <p className="message-content">{msg.content}</p>
                            <small className="message-date">{formattedDate}</small>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )
              ) : null}
            </div>
            <div className="message-input modern-message-input">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                aria-label="Type your message"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="send-message-button"
                aria-label="Send message"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation-selected">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* Item Details Panel */}
      <div className="item-details-panel modern-item-details-panel">
        {selectedConversation ? (
          <>
            <h2>Trade Details</h2>
            <div className="item-info">
              <h3>Requested Item</h3>
              {selectedConversation.item && (
                <div className="trade-item-card">
                  <img
                    src={selectedConversation.item.imageUrls?.[0] || selectedConversation.item.imageUrl}
                    alt={selectedConversation.item.title}
                    style={{ width: '100%', maxWidth: 180, maxHeight: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                  />
                  <button
                    className="view-item-button"
                    onClick={() => navigate(`/item/${selectedConversation.item._id}`)}
                  >
                    View Item
                  </button>
                </div>
              )}
            </div>
            {selectedConversation.offeredItems && selectedConversation.offeredItems.length > 0 && (
              <div className="item-info">
                <h3>Offered Item(s)</h3>
                {selectedConversation.offeredItems.map((item, idx) => (
                  <div className="trade-item-card" key={item._id || idx}>
                    <img
                      src={item.imageUrls?.[0] || item.imageUrl}
                      alt={item.title}
                      style={{ width: '100%', maxWidth: 180, maxHeight: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }}
                    />
                    <button
                      className="view-item-button"
                      onClick={() => navigate(`/item/${item._id}`)}
                    >
                      View Item
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-item-selected">
            <p>Select a conversation to view item details</p>
          </div>
        )}
      </div>

      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '0',
            maxHeight: '90vh',
            position: 'relative'
          }
        }}
      >
        <IconButton
          onClick={() => setUploadDialogOpen(false)}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: '#666'
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent style={{ padding: 0 }}>
          <ItemUpload onSuccess={() => setUploadDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Messages; 