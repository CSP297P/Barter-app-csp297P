import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import './Marketplace.css';
import ItemUpload from './ItemUpload';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { user } = useContext(AuthContext);

  const filterOptions = [
    { value: 'all', label: 'All Items' },
    { value: 'barter', label: 'Barter' },
    { value: 'giveaway', label: 'Giveaway' }
  ];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        console.log("API URL: " + process.env.REACT_APP_API_URL);
        const response = await axios.get('/items');
        console.log('Fetched items:', response.data);
        setItems(response.data);
        setError('');
      } catch (error) {
        console.error('Error fetching items:', error);
        setError('Failed to load items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    console.log("API PORT: " + process.env.REACT_APP_API_PORT);
    return `http://localhost:${process.env.REACT_APP_API_PORT}${imageUrl}`;
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || item.category === filter;
    return matchesSearch && matchesFilter;
  });

  const handleUploadSuccess = (newItem) => {
    setItems(prevItems => [...prevItems, newItem]);
    setShowUploadDialog(false);
  };

  const handleDialogClick = (e) => {
    if (e.target.classList.contains('dialog-overlay')) {
      setShowUploadDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading items...</p>
      </div>
    );
  }

  return (
    <div className="marketplace">
      <div className="marketplace-header">
        <h1>Marketplace</h1>
        {user && (
          <button 
            className="upload-button"
            onClick={() => setShowUploadDialog(true)}
          >
            Upload Item
          </button>
        )}
      </div>

      <div className="marketplace-filters">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="category-filter"
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredItems.length === 0 ? (
        <div className="no-items">
          <p>No items found matching your criteria.</p>
        </div>
      ) : (
        <div className="items-grid">
          {filteredItems.map((item) => (
            <Link to={`/item/${item._id}`} key={item._id} className="item-card">
              <div className="item-image-container">
                <img src={getImageUrl(item.imageUrl)} alt={item.title} />
                {item.status !== 'available' && (
                  <div className={`status-badge ${item.status}`}>
                    {item.status}
                  </div>
                )}
                <div className={`type-badge ${item.category}`}>
                  {item.category}
                </div>
              </div>
              <div className="item-info">
                <h3>{item.title}</h3>
                <p className="condition">{item.condition}</p>
                <p className="owner">Posted by: {item.owner?.displayName || 'Anonymous'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showUploadDialog && (
        <div className="dialog-overlay" onClick={handleDialogClick}>
          <div className="dialog-content">
            <button 
              className="close-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadDialog(false);
              }}
            >
              ×
            </button>
            <ItemUpload onSuccess={handleUploadSuccess} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace; 