import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import config from '../config';
import './Navbar.css';

const Navbar = () => {
  const { user, signOut } = useContext(AuthContext);
  const { onMessage } = useSocket();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

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
            color: 'var(--color-primary)',
            alignSelf: 'center'
          }}
          title="Toggle light/dark mode"
          onClick={() => document.body.classList.toggle('dark')}
        >
          <span role="img" aria-label="theme">🌗</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 