import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import config from '../config';
import { useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import './Navbar.css';

const Navbar = ({ onThemeToggle }) => {
  const { user, signOut } = useContext(AuthContext);
  const { onMessage } = useSocket();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

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
    if (user) {
      const handleNewMessage = (message) => {
        if (message.sender !== user._id) {
          setUnreadCount(prev => prev + 1);
        }
      };

      const unsubscribe = onMessage(handleNewMessage);
      return () => unsubscribe();
    }
  }, [user, onMessage]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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