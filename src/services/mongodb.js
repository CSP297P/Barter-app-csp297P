import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Add a request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

// Auth functions
export const login = async (email, password) => {
  try {
    const response = await axios.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const signup = async (email, password, displayName) => {
  try {
    const response = await axios.post('/auth/signup', { email, password, displayName });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  const response = await axios.post('/auth/logout');
  return response.data;
};

// Item functions
export const getItems = async () => {
  const response = await axios.get('/items');
  return response.data;
};

export const getItemById = async (id) => {
  const response = await axios.get(`/items/${id}`);
  return response.data;
};

export const createItem = async (itemData) => {
  const response = await axios.post('/items', itemData);
  return response.data;
};

export const updateItem = async (id, itemData) => {
  const response = await axios.put(`/items/${id}`, itemData);
  return response.data;
};

export const deleteItem = async (id) => {
  const response = await axios.delete(`/items/${id}`);
  return response.data;
};

export const getUserItems = async (userId) => {
  const response = await axios.get(`/items/user/${userId}`);
  return response.data;
};

// User functions
export const getUserProfile = async (userId) => {
  const response = await axios.get(`/users/${userId}`);
  return response.data;
};

export const updateUserProfile = async (userId, userData) => {
  const response = await axios.put(`/users/${userId}`, userData);
  return response.data;
};

// Helper function to check if email is UCI email
export const isUciEmail = (email) => {
  return email.endsWith('@uci.edu');
}; 