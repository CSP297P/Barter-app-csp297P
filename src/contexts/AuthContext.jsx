import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';

// Create axios instance with base URL
const api = axios.create({
  baseURL: config.API_BASE_URL
});

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUserProfile = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const userId = localStorage.getItem('userId');
      getUserProfile(userId)
        .then(userData => {
          setUser(userData);
        })
        .catch(error => {
          console.error('Error fetching user profile:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email, password) => {
    try {
      // Regular login without 2FA
      const response = await api.post('/auth/login', {
        email,
        password
      });

      // Store token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user._id);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      // Step 1: Initial signup request
      const response = await api.post('/auth/signup', {
        email,
        password,
        displayName
      });
      // Only return email for verification step
      return { email };
    } catch (error) {
      throw error;
    }
  };

  const verifySignup = async (email, code) => {
    try {
      const response = await api.post('/auth/verify-signup', {
        email,
        code
      });
      // Store token and user data after successful verification
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user._id);
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await api.post('/auth/request-password-reset', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        code,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp,
      verifySignup,
      signOut,
      requestPasswordReset,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 