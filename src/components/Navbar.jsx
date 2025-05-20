import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import config from '../config';
import { useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import NotificationBell from './NotificationBell';
import FloatingNotification from './FloatingNotification';
import './Navbar.css';
import socketService from '../services/socketService';

const Navbar = ({ onThemeToggle }) => {
  const { user, signOut } = useContext(AuthContext);
  const { onMessage } = useSocket();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(() => {
    const saved = localStorage.getItem('unreadNotifications');
    return saved ? Number(saved) : 0;
  });
  const [floatingNotifications, setFloatingNotifications] = useState([]);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const notificationRef = useRef(null);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user) {
        try {
          const response = await axios.get(`${config.API_BASE_URL}/messages/unread/count`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          setUnreadCount(response.data.count);
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      }
    };

    fetchUnreadCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Listen for trade and message notifications
    const handleNewTradeSession = (data) => {
      // Infer requester as the first participant in the array
      const requester = data.session.participants[0];
      // Only notify if the current user is NOT the requester
      if (requester._id !== user._id) {
        const notif = {
          type: 'trade_request',
          message: `New trade request from ${requester.displayName || 'someone'}`,
          timestamp: new Date(),
          ...data.session
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadNotifications(prev => prev + 1);
        showFloatingNotification(notif);
      }
    };
    const handleTradeApproved = (data) => {
      if (data.userId !== user._id) {
        const notif = {
          type: 'trade_accepted',
          message: `Congratulations! Your trade has been approved.`,
          timestamp: new Date(),
          ...data
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadNotifications(prev => prev + 1);
        showFloatingNotification(notif);
      }
    };
    const handleTradeRequestAccepted = (data) => {
      // Only notify the requester (not the user who accepted)
      if (data.acceptedBy !== user._id) {
        const notif = {
          type: 'trade_request_accepted',
          message: `Your trade request was accepted! You can now chat.`,
          timestamp: new Date(),
          ...data.session
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadNotifications(prev => prev + 1);
        showFloatingNotification(notif);
      }
    };
    const handleNewMessage = (message) => {
      if (window.location.pathname !== '/messages' && message.sender !== user._id) {
        const notif = {
          type: 'message',
          message: `New message from ${message.senderName || 'someone'}`,
          timestamp: new Date(),
          ...message
        };
        setNotifications(prev => [notif, ...prev]);
        setUnreadNotifications(prev => prev + 1);
        showFloatingNotification(notif);
      }
    };
    const unsub1 = onMessage(handleNewMessage);
    const unsub2 = socketService.onTradeApproved(handleTradeApproved);
    const unsub3 = socketService.onNewTradeSession(handleNewTradeSession);
    const unsub4 = socketService.onTradeRequestAccepted(handleTradeRequestAccepted);
    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
      unsub3 && unsub3();
      unsub4 && unsub4();
    };
  }, [user, onMessage]);

  useEffect(() => {
    // Save notifications and unread count to localStorage whenever they change
    localStorage.setItem('notifications', JSON.stringify(notifications));
    localStorage.setItem('unreadNotifications', unreadNotifications.toString());
  }, [notifications, unreadNotifications]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const showFloatingNotification = (notif) => {
    setFloatingNotifications(prev => [
      ...prev,
      { ...notif, id: Date.now() + Math.random() }
    ]);
  };

  // Close notification panel when clicking outside
  useEffect(() => {
    if (!notificationOpen) return;
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Barter!</Link>
      </div>
      <div className="navbar-links">
        <Link to="/marketplace">Marketplace</Link>
        {user ? (
          <>
            <Link to="/messages" className="messages-link">
              Messages
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </Link>
            <Link to="/profile">Profile</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
        <Badge badgeContent={unreadNotifications} color="error">
          <NotificationsIcon
            style={{ cursor: 'pointer', marginLeft: 16 }}
            onClick={() => setNotificationOpen(!notificationOpen)}
            titleAccess="Notifications"
          />
        </Badge>
        {notificationOpen && (
          <div ref={notificationRef}>
            <NotificationBell
              notifications={notifications}
              onClose={() => setNotificationOpen(false)}
              onClear={() => { setNotifications([]); setUnreadNotifications(0); }}
            />
          </div>
        )}
        <FloatingNotification
          notifications={floatingNotifications}
          onRemove={id => setFloatingNotifications(prev => prev.filter(n => n.id !== id))}
        />
        <button
          style={{
            marginLeft: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 24,
            color: theme.palette.text.primary,
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            borderRadius: '50%',
            transition: 'background-color 0.3s',
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            }
          }}
          title="Toggle light/dark mode"
          onClick={onThemeToggle}
        >
          {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 