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
import { getUserItems, updateTradeSessionOfferedItems, updateTradeSessionRequestedItems, getPublicUserProfile } from '../../services/mongodb';
import ItemDetailDialog from '../Items/ItemDetailDialog';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { joinTradeSession, sendMessage, isConnected, onMessage, onTradeApproved, onTradeCompleted, onNewTradeSession, onTradeSessionDeleted, onTradeSessionStatusUpdated, onTradeSessionItemsUpdated } = useSocket();

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
  const [itemUpdateNotification, setItemUpdateNotification] = useState('');
  const itemUpdateTimeoutRef = useRef(null);
  const lastItemUpdateByMe = useRef(false);

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

  // Fetch all conversations and unread counts
  useEffect(() => {
    const fetchConversationsAndUnreadCounts = async () => {
      try {
        // Fetch conversations
        const conversationsResponse = await axios.get(`${config.API_BASE_URL}/trade-sessions/user`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setConversations(conversationsResponse.data);

        // Fetch unread counts for all conversations
        const unreadCountsResponse = await axios.get(`${config.API_BASE_URL}/messages/unread-counts`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUnreadCounts(unreadCountsResponse.data);

        setLoading(false);
      } catch (err) {
        setError('Failed to load conversations');
        setLoading(false);
      }
    };

    fetchConversationsAndUnreadCounts();
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
        // Check if message already exists
        if (prevMessages.some(msg => String(msg._id) === String(message._id))) {
          return prevMessages;
        }
        const updated = [...prevMessages, message];
        return updated;
      });
    }

    // Update unread count for any message from other users
    const messageSenderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
    if (String(messageSenderId) !== String(user._id)) {
      setUnreadCounts(prev => {
        const currentCount = prev[message.sessionId] || 0;
        // Only increment the count, don't clear it automatically
        return {
          ...prev,
          [message.sessionId]: currentCount + 1
        };
      });
    }
  }, [user._id, selectedConversation]);

  // Set up message listener
  useEffect(() => {
    const unsubscribe = onMessage(handleNewMessage);
    return () => unsubscribe();
  }, [onMessage, handleNewMessage]);

  // Handle new trade session
  useEffect(() => {
    const unsubNewSession = onNewTradeSession((data) => {
      console.log('[SOCKET] new_trade_session event received:', data);
      // Add the new session to the conversations list
      setConversations(prev => {
        // Check if the session already exists in the list
        if (prev.some(conv => conv._id === data.session._id)) {
          return prev;
        }
        // Add the new session at the beginning of the list
        return [data.session, ...prev];
      });
    });

    return () => unsubNewSession();
  }, [onNewTradeSession]);

  // Listen for real-time item updates in the trade session
  useEffect(() => {
    const unsub = onTradeSessionItemsUpdated(async (data) => {
      if (!selectedConversation || data.sessionId !== selectedConversation._id) return;
      
      // Update the conversation state
      setSelectedConversation(prev => ({
        ...prev,
        ...(data.offeredItems ? { offeredItems: data.offeredItems } : {}),
        ...(data.requestedItems ? { itemIds: data.requestedItems } : {})
      }));

      // Only create messages if this client initiated the update
      if (!lastItemUpdateByMe.current) return;

      // Get the other user
      const otherUser = selectedConversation.participants.find(p => p._id !== user._id);
      const listType = data.offeredItems ? 'offer' : 'request';
      
      // Compare old and new items to determine what changed
      const oldItems = data.offeredItems ? selectedConversation.offeredItems : selectedConversation.itemIds;
      const newItems = data.offeredItems ? data.offeredItems : data.requestedItems;
      
      // Find added and removed items
      const addedItems = newItems.filter(newItem => !oldItems.some(oldItem => oldItem._id === newItem._id));
      const removedItems = oldItems.filter(oldItem => !newItems.some(newItem => newItem._id === oldItem._id));
      
      // Create messages for each change
      for (const item of addedItems) {
        try {
          const messageContent = `Added "${item.title}" to the ${listType}ed items`;
          // Send as a regular message
          await sendMessage(selectedConversation._id, messageContent, user._id, true); // true for isSystemMessage
        } catch (err) {
          console.error('Failed to save message:', err);
        }
      }
      
      for (const item of removedItems) {
        try {
          const messageContent = `Removed "${item.title}" from the ${listType}ed items`;
          // Send as a regular message
          await sendMessage(selectedConversation._id, messageContent, user._id, true); // true for isSystemMessage
        } catch (err) {
          console.error('Failed to save message:', err);
        }
      }

      lastItemUpdateByMe.current = false;
    });
    return () => unsub();
  }, [onTradeSessionItemsUpdated, selectedConversation, user, sendMessage]);

  // Join selected conversation
  useEffect(() => {
    if (!selectedConversation || !isConnected) return;
    let cancelled = false;
    const joinRoom = async () => {
      try {
        await joinTradeSession(selectedConversation._id);
        if (cancelled) return;
        // Remove automatic clearing of unread count when joining
        // setUnreadCounts(prev => ({
        //   ...prev,
        //   [selectedConversation._id]: 0
        // }));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to join trade session room:', err);
        }
      }
    };
    joinRoom();
    return () => { cancelled = true; };
  }, [selectedConversation, isConnected, joinTradeSession]);

  // Add function to mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!selectedConversation) return;
    
    try {
      await axios.post(`${config.API_BASE_URL}/messages/mark-read/${selectedConversation._id}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Clear unread count for this conversation
      setUnreadCounts(prev => ({
        ...prev,
        [selectedConversation._id]: 0
      }));

      // Dispatch custom event to notify Navbar
      window.dispatchEvent(new Event('messagesRead'));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [selectedConversation]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    // Remove automatic clearing of notifications on input focus
    // if (selectedConversation) {
    //   markMessagesAsRead();
    //   setUnreadCounts(prev => ({
    //     ...prev,
    //     [selectedConversation._id]: 0
    //   }));
    // }
  }, []);

  // Handle chat area click
  const handleChatAreaClick = useCallback(() => {
    if (selectedConversation) {
      markMessagesAsRead();
      // Reset unread count when user explicitly clicks in the chat area
      setUnreadCounts(prev => ({
        ...prev,
        [selectedConversation._id]: 0
      }));
    }
  }, [markMessagesAsRead, selectedConversation]);

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
              // Only add non-system messages from socket
              if (!msg.isSystemMessage && !all.some(fetched => String(fetched._id) === String(msg._id))) {
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
        // Update local state immediately
        setTradeApproval(prev => ({
          ...prev,
          [data.userId]: true
        }));
        
        // Fetch updated session data
        fetchSession(selectedConversation._id);
        
        // Only show dialog if the approving user is not the current user AND current user has not approved yet
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


  // Listen for real-time item updates in the trade session
  useEffect(() => {
    const unsub = onTradeSessionItemsUpdated((data) => {
      if (!selectedConversation || data.sessionId !== selectedConversation._id) return;
      setSelectedConversation(prev => ({
        ...prev,
        ...(data.offeredItems ? { offeredItems: data.offeredItems } : {}),
        ...(data.requestedItems ? { itemIds: data.requestedItems } : {})
      }));
      let msg = '';
      if (data.offeredItems) {
        msg = lastItemUpdateByMe.current
          ? 'Offered items updated by you.'
          : 'Offered items updated by the other user.';
      }
      if (data.requestedItems) {
        msg = lastItemUpdateByMe.current
          ? 'Requested items updated by you.'
          : 'Requested items updated by the other user.';
      }
      setItemUpdateNotification(msg);
      lastItemUpdateByMe.current = false;
      if (itemUpdateTimeoutRef.current) clearTimeout(itemUpdateTimeoutRef.current);
      itemUpdateTimeoutRef.current = setTimeout(() => setItemUpdateNotification(''), 3000);
    });
    return () => {
      unsub();
      if (itemUpdateTimeoutRef.current) clearTimeout(itemUpdateTimeoutRef.current);
    };
  }, [onTradeSessionItemsUpdated, selectedConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    // Don't allow sending messages if trade is rejected
    if (selectedConversation.status === 'denied') {
      setError('Cannot send messages in a rejected trade session');
      return;
    }

    setSending(true);
    try {
      await sendMessage(selectedConversation._id, newMessage, user._id);
      setNewMessage('');
      // Mark messages as read when sending a message
      markMessagesAsRead();
      // Reset unread count when user sends a message
      setUnreadCounts(prev => ({
        ...prev,
        [selectedConversation._id]: 0
      }));
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

  // Helper to determine user role
  const isRequester = selectedConversation && selectedConversation.participants[0]._id === user._id;
  const isReceiver = selectedConversation && selectedConversation.participants[1]._id === user._id;

  // Determine which list the user can edit
  const editableList = isRequester ? (selectedConversation?.offeredItems || []) : (selectedConversation?.itemIds || []);
  const editableListKey = isRequester ? 'offeredItems' : 'itemIds';
  const updateEditableList = isRequester ? updateTradeSessionOfferedItems : updateTradeSessionRequestedItems;

  // Add/Remove logic for editable list
  const handleToggleSelectItem = (itemId) => {
    setSelectedToAdd(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const handleAddSelectedItems = async () => {
    lastItemUpdateByMe.current = true;
    setUpdatingOfferedItems(true);
    try {
      // Always use the latest selectedConversation for the current list
      const currentIds = isRequester
        ? (selectedConversation.offeredItems || []).map(i => i._id)
        : (selectedConversation.itemIds || []).map(i => i._id);
      const newIds = [
        ...currentIds,
        ...selectedToAdd.filter(id => !currentIds.includes(id))
      ];
      const res = await updateEditableList(selectedConversation._id, newIds);
      setSelectedConversation(prev => ({
        ...prev,
        [editableListKey]: isRequester ? res.offeredItems : res.requestedItems
      }));
      setAddItemsDialogOpen(false);
      setSelectedToAdd([]);
    } catch (err) {
      alert('Failed to update items.');
    } finally {
      setUpdatingOfferedItems(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    lastItemUpdateByMe.current = true;
    setUpdatingOfferedItems(true);
    try {
      const newIds = editableList.filter(i => i._id !== itemId).map(i => i._id);
      const res = await updateEditableList(selectedConversation._id, newIds);
      setSelectedConversation(prev => ({
        ...prev,
        [editableListKey]: isRequester ? res.offeredItems : res.requestedItems
      }));
    } catch (err) {
      alert('Failed to remove item.');
    } finally {
      setUpdatingOfferedItems(false);
    }
  };

  useEffect(() => {
    if (addItemsDialogOpen && user && selectedConversation) {
      setLoadingUserItems(true);
      getUserItems(user._id).then(items => {
        let excludeIds = [];
        if (isRequester) {
          excludeIds = (selectedConversation.offeredItems || []).map(i => i._id);
        } else if (isReceiver) {
          excludeIds = (selectedConversation.itemIds || []).map(i => i._id);
        }
        setAvailableUserItems(items.filter(i => !excludeIds.includes(i._id)));
        setLoadingUserItems(false);
      });
    }
  }, [addItemsDialogOpen, user, selectedConversation, isRequester, isReceiver]);

  useEffect(() => {
    if (isReceiver && selectedConversation) {
      const otherUser = selectedConversation.participants.find(p => p._id !== user._id);
      if (otherUser?._id) {
        getPublicUserProfile(otherUser._id).then(setRequesterProfile).catch(() => setRequesterProfile(null));
      }
    }
  }, [isReceiver, selectedConversation, user._id]);

  const handleApproveTrade = async () => {
    try {
      setHasApprovedLocally(true);
      hasApprovedLocallyRef.current = true;
      justApproved.current = true;  // Set this to prevent showing the dialog to the approver
      
      // Update local state immediately
      setTradeApproval(prev => ({
        ...prev,
        [user._id]: true
      }));

      const response = await axios.post(`${config.API_BASE_URL}/trade-sessions/${selectedConversation._id}/approve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Fetch updated session data to ensure we have the latest state
      const sessionResponse = await axios.get(`${config.API_BASE_URL}/trade-sessions/${selectedConversation._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update the conversation with the latest data
      setSelectedConversation(prev => ({
        ...prev,
        ...sessionResponse.data
      }));
      
      // Update the conversation in the list
      setConversations(prev => prev.map(conv => 
        conv._id === selectedConversation._id 
          ? { ...conv, ...sessionResponse.data }
          : conv
      ));

    } catch (error) {
      console.error('Failed to approve trade:', error);
      // Revert local state if the request failed
      setHasApprovedLocally(false);
      hasApprovedLocallyRef.current = false;
      setTradeApproval(prev => ({
        ...prev,
        [user._id]: false
      }));
    }
  };

  const handleAcceptTrade = async () => {
    if (!selectedConversation) return;
    try {
      await axios.put(`${config.API_BASE_URL}/trade-sessions/${selectedConversation._id}/status`, { status: 'active' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedConversation({ ...selectedConversation, status: 'active' });
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
                      <span className="pending-badge">Trade Pending</span>
                    )}
                    {conv.status === 'denied' && (
                      <span className="denied-badge">Rejected</span>
                    )}
                    {conv.status === 'active' && conv.approvals && Object.keys(conv.approvals).length === 1 && (
                      <span className="approval-pending-badge">
                        {conv.approvals[user._id] ? "You've approved" : "Other user approved"}
                      </span>
                    )}
                    {conv.status === 'active' && conv.approvals && Object.keys(conv.approvals).length === 2 && (
                      <span className="confirmed-badge">Trade Confirmed</span>
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
              {(selectedConversation.status === 'active' || tradeCompleted) && (
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
            <div 
              className="messages-container modern-messages-container"
              onClick={handleChatAreaClick}
            >
              {selectedConversation.status === 'pending' ? (
                selectedConversation.status === 'pending' && selectedConversation.participants[1]._id === user._id ? (
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
              ) : selectedConversation.status === 'denied' ? (
                <div className="denied-info">
                  <p>This trade request was rejected.</p>
                </div>
              ) : ( // Show chat for active or completed
                messages.length === 0 ? (
                  <div className="no-messages">No messages yet. Start the conversation!</div>
                ) : (
                  <>
                    {messages.map(msg => {
                      if (msg.isSystemMessage) {
                        return (
                          <div key={msg._id} className="system-message">
                            <p>{msg.content}</p>
                            <small className="message-date">{new Date(msg.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true
                            })}</small>
                          </div>
                        );
                      }
                      
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
              {(selectedConversation.status === 'active' || tradeCompleted) && (
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
            {/* Only show message input if trade is not rejected */}
            {selectedConversation.status !== 'denied' && (
              <div className="message-input modern-message-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onFocus={handleInputFocus}
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
            )}
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
            {/* Requested from You (editable if receiver) */}
            <div className="item-info">
              <h3>Requested from You</h3>
              <div className="trade-items-row">
                {(isRequester ? selectedConversation.itemIds : selectedConversation.itemIds)?.map((item, idx) => (
                  <div className="trade-item-card" key={item._id || idx}>
                    <img
                      src={item.imageUrls?.[0] || item.imageUrl}
                      alt={item.title}
                      className="trade-item-image"
                    />
                    {isReceiver && (
                      <button
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(item._id)}
                        disabled={updatingOfferedItems}
                      >
                        Remove
                      </button>
                    )}
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
              {isReceiver && (
                <button
                  className="add-more-items-btn"
                  onClick={() => setAddItemsDialogOpen(true)}
                >
                  Add More Items
                </button>
              )}
            </div>
            {/* Offered from Other User (editable if requester) */}
            <div className="item-info">
              <h3>Offered from {isRequester ? 'You' : 'Other User'}</h3>
              <div className="trade-items-row">
                {(isRequester ? selectedConversation.offeredItems : selectedConversation.offeredItems)?.map((item, idx) => (
                  <div className="trade-item-card" key={item._id || idx}>
                    <img
                      src={item.imageUrls?.[0] || item.imageUrl}
                      alt={item.title}
                      className="trade-item-image"
                    />
                    {isRequester && (
                      <button
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(item._id)}
                        disabled={updatingOfferedItems}
                      >
                        Remove
                      </button>
                    )}
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
              {isRequester && (
                <button
                  className="add-more-items-btn"
                  onClick={() => setAddItemsDialogOpen(true)}
                >
                  Add More Items
                </button>
              )}
            </div>
            {/* Add Items Dialog (shared for both roles) */}
            <Dialog open={addItemsDialogOpen} onClose={() => setAddItemsDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogContent>
                <h3>Select items to add</h3>
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