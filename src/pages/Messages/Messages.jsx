import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import config from '../../config';
import { Dialog, DialogContent, IconButton, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ItemUpload from '../Items/ItemUpload';
import ConfirmDialog from '../../components/ConfirmDialog';
import UserProfileDialog from '../../components/UserProfileDialog';
import { UserRatingDisplay } from '../../components/UserProfileDialog';
import './Messages.css';
import { getUserItems, updateTradeSessionOfferedItems, getPublicUserProfile } from '../../services/mongodb';
import ItemDetailDialog from '../Items/ItemDetailDialog';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { joinTradeSession, sendMessage, isConnected, onMessage, onTradeApproved, onTradeCompleted, onNewTradeSession, onTradeSessionDeleted, onTradeSessionStatusUpdated } = useSocket();

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
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDialogUserId, setProfileDialogUserId] = useState(null);
  const [tradeApproval, setTradeApproval] = useState({});
  const [tradeConfirmation, setTradeConfirmation] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [tradeCompleted, setTradeCompleted] = useState(false);
  const [removeItemsMessage, setRemoveItemsMessage] = useState(false);
  const [approvingUserName, setApprovingUserName] = useState('');
  const justApproved = useRef(false);
  const [hasApprovedLocally, setHasApprovedLocally] = useState(false);
  const hasApprovedLocallyRef = useRef(false);
  const lastApprovedConversationIdRef = useRef(null);
  const [addItemsDialogOpen, setAddItemsDialogOpen] = useState(false);
  const [availableUserItems, setAvailableUserItems] = useState([]);
  const [loadingUserItems, setLoadingUserItems] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [updatingOfferedItems, setUpdatingOfferedItems] = useState(false);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [requesterProfile, setRequesterProfile] = useState(null);

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
    setMessages([]);
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
    if (!selectedConversation || !isConnected) return;
    let cancelled = false;
    const joinRoom = async () => {
      try {
        await joinTradeSession(selectedConversation._id);
        if (cancelled) return;
        setUnreadCounts(prev => ({
          ...prev,
          [selectedConversation._id]: 0
        }));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to join trade session room:', err);
        }
      }
    };
    joinRoom();
    return () => { cancelled = true; };
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

  // Listen for trade approval and completion events
  useEffect(() => {
    const unsubApproved = onTradeApproved((data) => {
      console.log('[SOCKET] trade_approved event received:', data, 'Current user:', user._id, 'tradeApproval:', tradeApproval, 'hasApprovedLocally:', hasApprovedLocally, 'justApproved:', justApproved.current);
      if (selectedConversation && data.sessionId === selectedConversation._id) {
        fetchSession(selectedConversation._id);
        // Only show dialog if the approving user is not the current user AND current user has not approved yet (locally or from backend)
        if (
          String(data.userId) !== String(user._id) &&
          !tradeApproval[user._id] &&
          !hasApprovedLocallyRef.current &&
          !justApproved.current
        ) {
          const approvingUser = selectedConversation.participants.find(p => String(p._id) === String(data.userId));
          setApprovingUserName(approvingUser?.displayName || 'The other user');
          setShowConfirmDialog(true);
        }
        // Reset justApproved after handling
        if (justApproved.current) justApproved.current = false;
      }
    });
    const unsubCompleted = onTradeCompleted((data) => {
      if (selectedConversation && data.sessionId === selectedConversation._id) {
        fetchSession(selectedConversation._id);
        setTradeCompleted(true);
        setRemoveItemsMessage(true);
      }
    });
    return () => {
      unsubApproved();
      unsubCompleted();
    };
  }, [selectedConversation, user ? user._id : null, onTradeApproved, onTradeCompleted]);

  // Fetch approvals/confirmations when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      setTradeApproval(selectedConversation.approvals || {});
      setTradeConfirmation(selectedConversation.confirmations || {});
      setTradeCompleted(selectedConversation.status === 'completed');
      setRemoveItemsMessage(false);
      // Only reset local approval if conversation ID changes
      const backendApproved = !!(selectedConversation.approvals && selectedConversation.approvals[user._id]);
      if (backendApproved) {
        setHasApprovedLocally(true);
        hasApprovedLocallyRef.current = true;
        lastApprovedConversationIdRef.current = selectedConversation._id;
      } else if (lastApprovedConversationIdRef.current !== selectedConversation._id) {
        setHasApprovedLocally(false);
        hasApprovedLocallyRef.current = false;
        lastApprovedConversationIdRef.current = selectedConversation._id;
      }
    }
  }, [selectedConversation, user ? user._id : null]);

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

  const fetchSession = async (id) => {
    const response = await axios.get(`${config.API_BASE_URL}/trade-sessions/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('[FETCH SESSION]', response.data); // Debug log
    setSelectedConversation(response.data);
    setTradeApproval(response.data.approvals || {});
    setTradeConfirmation(response.data.confirmations || {});
  };

  const handleApproveTrade = async () => {
    setHasApprovedLocally(true);
    hasApprovedLocallyRef.current = true;
    await axios.post(`${config.API_BASE_URL}/trade-sessions/${selectedConversation._id}/approve`, {}, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  };

  useEffect(() => {
    const unsub = onNewTradeSession((data) => {
      setConversations(prev => {
        // Avoid duplicates
        if (prev.some(conv => conv._id === data.session._id)) return prev;
        return [data.session, ...prev];
      });
    });
    return () => unsub();
  }, [onNewTradeSession]);

  useEffect(() => {
    const unsub = onTradeSessionDeleted((data) => {
      setConversations(prev => prev.filter(conv => conv._id !== data.sessionId));
      if (selectedConversation && selectedConversation._id === data.sessionId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    });
    return () => unsub();
  }, [onTradeSessionDeleted, selectedConversation]);

  useEffect(() => {
    const unsub = onTradeSessionStatusUpdated((data) => {
      if (!data?.session?._id) return;
      setConversations(prev => prev.map(conv => conv._id === data.session._id ? { ...conv, ...data.session } : conv));
      if (selectedConversation && selectedConversation._id === data.session._id) {
        setSelectedConversation(prev => ({ ...prev, ...data.session }));
      }
    });
    return () => unsub();
  }, [onTradeSessionStatusUpdated, selectedConversation]);

  const handleToggleSelectItem = (itemId) => {
    setSelectedToAdd(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const handleAddSelectedItems = async () => {
    setUpdatingOfferedItems(true);
    try {
      const newOfferedIds = [
        ...((selectedConversation.offeredItems || []).map(i => i._id)),
        ...selectedToAdd.filter(id => !(selectedConversation.offeredItems || []).some(i => i._id === id))
      ];
      const res = await updateTradeSessionOfferedItems(selectedConversation._id, newOfferedIds);
      setSelectedConversation(prev => ({
        ...prev,
        offeredItems: res.offeredItems
      }));
      setAddItemsDialogOpen(false);
      setSelectedToAdd([]);
    } catch (err) {
      alert('Failed to update offered items.');
    } finally {
      setUpdatingOfferedItems(false);
    }
  };

  useEffect(() => {
    if (addItemsDialogOpen && user && selectedConversation) {
      setLoadingUserItems(true);
      getUserItems(user._id).then(items => {
        // Exclude already offered items
        const offeredIds = (selectedConversation.offeredItems || []).map(i => i._id);
        setAvailableUserItems(items.filter(i => !offeredIds.includes(i._id)));
        setLoadingUserItems(false);
      });
    }
  }, [addItemsDialogOpen, user, selectedConversation]);

  useEffect(() => {
    if (isRecipient && isPending && selectedConversation) {
      const otherUser = selectedConversation.participants.find(p => p._id !== user._id);
      if (otherUser?._id) {
        getPublicUserProfile(otherUser._id).then(setRequesterProfile).catch(() => setRequesterProfile(null));
      }
    }
  }, [isRecipient, isPending, selectedConversation, user._id]);

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
            let otherUser = conv.participants.find(p => p._id !== user._id);
            if (!otherUser && conv.participants.length > 0) {
              otherUser = conv.participants[0];
            }
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
                  {/* <div className="conversation-avatar" aria-label={`Avatar for ${otherUser?.displayName || 'User'}`}>{avatarLetter}</div> */}
                  <div className="conversation-info">
                    <h3>{conv.item ? conv.item.title : 'Untitled Item'}</h3>
                    <p>with {otherUser?.displayName || 'User'}</p>
                    {conv.status === 'pending' && (
                      <span className="pending-badge">Pending</span>
                    )}
                    {conv.status === 'denied' && (
                      <span className="denied-badge">Rejected</span>
                    )}
                    <div className="conversation-actions-column">
                      {conv.status === 'completed' && (
                        <span className="confirmed-badge">Confirmed</span>
                      )}
                      <button
                        className="view-profile-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setProfileDialogUserId(otherUser?._id);
                          setProfileDialogOpen(true);
                        }}
                        style={{ fontSize: '0.97em' }}
                        aria-label={`View ${otherUser?.displayName || 'user'}'s profile`}
                      >
                        View Profile
                      </button>
                    </div>
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
            <div className="messages-header modern-messages-header header-relative">
              {selectedConversation ? (
                <>
                  Chatting with {(() => {
                    const otherUser = selectedConversation.participants.find(p => p._id !== user._id);
                    return (
                      <>
                        {otherUser?.displayName || 'User'}
                        {otherUser?._id && (
                          <UserRatingDisplay userId={otherUser._id} className="user-rating-display-inline" showLabel={false} />
                        )}
                      </>
                    );
                  })()}
                </>
              ) : 'Chat'}
              {/* Approve/Confirm Trade buttons absolutely positioned in top right */}
              {(isActive || tradeCompleted) && (
                <span className="trade-approval-bar">
                  {tradeCompleted || Object.keys(tradeApproval).length === 2 ? (
                    <span className="confirmed-message trade-confirmed-text">
                      Trade Confirmed
                    </span>
                  ) : (
                    <>
                      {!tradeApproval[user._id] && (
                        <Button variant="contained" color="primary" size="small" onClick={handleApproveTrade}>
                          Approve Trade
                        </Button>
                      )}
                      {tradeApproval[user._id] && Object.keys(tradeApproval).length < 2 && (
                        <span className="waiting-approval-text">
                          Waiting for approval from the other user.
                        </span>
                      )}
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="messages-container modern-messages-container">
              {isPending ? (
                isRecipient ? (
                  <div className="chat-request-container">
                    <div className="chat-request-message" style={{ marginBottom: 24 }}>
                      <div className="trade-request-header">
                        <div className="trade-request-avatar">
                          {requesterProfile?.photoURL ? (
                            <img src={requesterProfile.photoURL} alt={requesterProfile.displayName} />
                          ) : (
                            <span className="avatar-fallback">{requesterProfile?.displayName?.[0] || '?'}</span>
                          )}
                        </div>
                        <div className="trade-request-userinfo">
                          <span className="trade-request-username" onClick={() => setProfileDialogUserId(requesterProfile?._id)} style={{ cursor: 'pointer', color: '#6366f1', fontWeight: 700 }}>
                            {requesterProfile?.displayName || 'User'}
                          </span>
                          <span className="trade-request-rating">
                            <UserRatingDisplay userId={requesterProfile?._id} style={{ marginLeft: 8, fontSize: 18, verticalAlign: 'middle' }} showLabel={false} />
                          </span>
                          <span className="trade-request-trades" style={{ marginLeft: 12, color: '#a5b4fc', fontWeight: 500, fontSize: 14 }}>
                            {requesterProfile?.totalSuccessfulTrades || 0} successful trades
                          </span>
                        </div>
                      </div>
                      {selectedConversation.tradeMessage && (
                        <div className="trade-request-custom-message">
                          <span style={{ color: '#6366f1', fontWeight: 600 }}>Message:</span> {selectedConversation.tradeMessage}
                        </div>
                      )}
                      <div className="trade-request-items-row">
                        <div className="trade-request-section">
                          <div className="trade-request-section-title">Requested Item(s):</div>
                          <div className="trade-items-row">
                            {selectedConversation.item && (
                              <div className="trade-item-card">
                                <img src={selectedConversation.item.imageUrls?.[0] || selectedConversation.item.imageUrl} alt={selectedConversation.item.title} className="trade-item-image" />
                                <div className="trade-item-title">{selectedConversation.item.title}</div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="trade-request-section">
                          <div className="trade-request-section-title">Offered Item(s):</div>
                          <div className="trade-items-row">
                            {selectedConversation.offeredItems && selectedConversation.offeredItems.map((item, idx) => (
                              <div className="trade-item-card" key={item._id || idx}>
                                <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.title} className="trade-item-image" />
                                <div className="trade-item-title">{item.title}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="accept-reject-actions">
                      <button className="accept-btn" onClick={handleAcceptTrade}>Accept</button>
                      <button className="reject-btn" onClick={handleDenyTrade}>Reject</button>
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
              ) : ( // Show chat for active or completed
                messages.length === 0 ? (
                  <div className="no-messages">No messages yet. Start the conversation!</div>
                ) : (
                  <>
                    {messages.map(msg => {
                      const isSent = (msg.senderId === user._id) ||
                                     (typeof msg.senderId === 'object' && msg.senderId && msg.senderId._id === user._id);
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
                      const sender = selectedConversation.participants.find(p => (typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId) === p._id);
                      const senderAvatar = (sender?.displayName || '?');
                      // Remove all consecutive sender name lines from the start of the content
                      let cleanContent = msg.content;
                      if (!isSent && sender?.displayName && cleanContent) {
                        const senderNameLower = sender.displayName.trim().toLowerCase();
                        const lines = cleanContent.split(/\r?\n/);
                        let i = 0;
                        while (i < lines.length && lines[i].trim().toLowerCase() === senderNameLower) {
                          i++;
                        }
                        cleanContent = lines.slice(i).join('\n');
                      }
                      return (
                        <div
                          key={msg._id}
                          className={`message-bubble modern-message-bubble ${isSent ? 'sent' : 'received'}`}
                        >
                          {/* {!isSent && (
                            <div className="bubble-avatar" aria-label={`Avatar for ${sender?.displayName || 'User'}`}>{senderAvatar}</div>
                          )} */}
                          <div className="bubble-content">
                            {!isSent && (
                              <div className="message-sender-label">{sender?.displayName || 'User'}</div>
                            )}
                            <p className="message-content">{cleanContent}</p>
                            <small className="message-date">{formattedDate}</small>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )
              )}
              {(isActive || tradeCompleted) && (
                <div className="trade-approval-section">
                  {removeItemsMessage && (
                    <div className="remove-items-message">
                      Trade completed! Please remove the related items from your profile.
                    </div>
                  )}
                  {tradeCompleted && (
                    <div className="trade-whisper-message">
                      <em>Please delete the traded items from your portfolio to keep your listings up to date.</em>
                    </div>
                  )}
                </div>
              )}
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
                <div className="trade-items-row">
                  <div className="trade-item-card">
                    <img
                      src={selectedConversation.item.imageUrls?.[0] || selectedConversation.item.imageUrl}
                      alt={selectedConversation.item.title}
                      className="trade-item-image"
                    />
                    <button
                      className="view-item-button"
                      onClick={() => {
                        setSelectedItemId(selectedConversation.item._id);
                        setItemDetailOpen(true);
                      }}
                    >
                      View Item
                    </button>
                  </div>
                </div>
              )}
            </div>
            {selectedConversation.offeredItems && selectedConversation.offeredItems.length > 0 && (
              <div className="item-info">
                <div className="offered-items-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <h3 style={{ margin: 0 }}>Offered Item(s)</h3>
                  <button
                    className="add-more-items-btn"
                    onClick={() => setAddItemsDialogOpen(true)}
                  >
                    Add More Items
                  </button>
                </div>
                <div className="trade-items-row">
                  {selectedConversation.offeredItems.map((item, idx) => (
                    <div className="trade-item-card" key={item._id || idx}>
                      <img
                        src={item.imageUrls?.[0] || item.imageUrl}
                        alt={item.title}
                        className="trade-item-image"
                      />
                      <button
                        className="view-item-button"
                        onClick={() => {
                          setSelectedItemId(item._id);
                          setItemDetailOpen(true);
                        }}
                      >
                        View Item
                      </button>
                    </div>
                  ))}
                </div>
                {/* Add Items Dialog */}
                <Dialog open={addItemsDialogOpen} onClose={() => setAddItemsDialogOpen(false)} maxWidth="sm" fullWidth>
                  <DialogContent>
                    <h3>Select items to add to your offer</h3>
                    {loadingUserItems ? (
                      <div>Loading your items...</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                        {availableUserItems.length === 0 ? (
                          <div>You have no more items to add.</div>
                        ) : availableUserItems.map(item => (
                          <div key={item._id} style={{ border: selectedToAdd.includes(item._id) ? '2px solid #6366f1' : '1px solid #ccc', borderRadius: '8px', padding: '8px', width: '120px', cursor: 'pointer', background: selectedToAdd.includes(item._id) ? '#e0e7ff' : '#fff' }} onClick={() => handleToggleSelectItem(item._id)}>
                            <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.title} style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                            <div style={{ fontWeight: 600, fontSize: '0.95em', marginTop: '4px', textAlign: 'center' }}>{item.title}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <Button onClick={() => setAddItemsDialogOpen(false)} variant="outlined">Cancel</Button>
                      <Button onClick={handleAddSelectedItems} variant="contained" disabled={selectedToAdd.length === 0 || updatingOfferedItems}>
                        {updatingOfferedItems ? 'Adding...' : 'Add Selected'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
          className: 'upload-dialog-paper'
        }}
      >
        <IconButton
          onClick={() => setUploadDialogOpen(false)}
          className="upload-dialog-close-btn"
        >
          <CloseIcon />
        </IconButton>
        <DialogContent className="upload-dialog-content">
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

      <UserProfileDialog
        open={profileDialogOpen}
        userId={profileDialogUserId}
        onClose={() => setProfileDialogOpen(false)}
      />

      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogContent>
          <div className="trade-approve-dialog-content">
            <h3>{approvingUserName} has approved the trade. Do you also approve?</h3>
            <Button variant="contained" color="success" onClick={async () => { await handleApproveTrade(); setShowConfirmDialog(false); }}>
              Confirm
            </Button>
            <Button variant="outlined" onClick={() => setShowConfirmDialog(false)} className="trade-approve-cancel-btn">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ItemDetailDialog open={itemDetailOpen} onClose={() => setItemDetailOpen(false)} itemId={selectedItemId} />
    </div>
  );
};

export default Messages; 