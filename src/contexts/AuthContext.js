import React, { createContext, useState, useEffect } from 'react';
import { login, signup, logout, getUserProfile } from '../services/mongodb';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const response = await login(email, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.user._id);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      const response = await signup(email, password, displayName);
      localStorage.setItem('token', response.token);
      localStorage.setItem('userId', response.user._id);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await logout();
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}; 