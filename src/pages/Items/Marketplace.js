import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import './Marketplace.css';
import ItemUpload from './ItemUpload';
import ImageCarousel from '../../components/ImageCarousel';
import Dialog from '@mui/material/Dialog';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { user } = useContext(AuthContext);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);

  const categoryOptions = [
    { value: 'gaming-console', label: 'Gaming Console' },
    { value: 'sports-equipment', label: 'Sports Equipment' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'books', label: 'Books' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'musical-instruments', label: 'Musical Instruments' },
    { value: 'tools', label: 'Tools' },
    { value: 'art-supplies', label: 'Art Supplies' },
    { value: 'other', label: 'Other' }
  ];

  const typeOptions = [
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
        // Map through items to ensure owner information is properly structured
        const processedItems = response.data.map(item => ({
          ...item,
          owner: {
            displayName: item.ownerName || item.owner?.displayName || 'Anonymous'
          }
        }));
        console.log('Processed items:', processedItems);
        setItems(processedItems);
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
    return `http://localhost:${process.env.REACT_APP_API_PORT}${imageUrl}`;
  };

  const getImageUrls = (item) => {
    // Handle new format (imageUrls array)
    if (item.imageUrls && Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
      return item.imageUrls;
    }
    // Handle old format (single imageUrl)
    if (item.imageUrl) {
      return [getImageUrl(item.imageUrl)];
    }
    return [];
  };

  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  const handleTypeChange = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleUploadSuccess = (newItem) => {
    // Ensure the new item has the correct owner structure
    const processedNewItem = {
      ...newItem,
      owner: {
        displayName: newItem.ownerName || newItem.owner?.displayName || 'Anonymous'
      }
    };
    setItems(prevItems => [...prevItems, processedNewItem]);
    setShowUploadDialog(false);
  };

  const handleDialogClick = (e) => {
    if (e.target.classList.contains('dialog-overlay')) {
      setShowUploadDialog(false);
    }
  };

  const formatPriceRange = (range) => {
    if (!range) return 'N/A';
    if (range === '1000+') return '$1000+';
    if (range.startsWith('$')) return range; // already formatted
    if (range.includes('/')) return range; // e.g. "$5.99 / lb"
    const [min, max] = range.split('-');
    if (min && max) return `$${min} - $${max}`;
    return `$${range}`;
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
            className="profile-button success upload-item-button"
            onClick={() => setShowUploadDialog(true)}
          >
            Upload Item
          </button>
        )}
      </div>

      <div className="marketplace-content">
        <div className="filter-pane">
          <div className="filter-section">
            <h3>Categories</h3>
            <div className="checkbox-group">
              {categoryOptions.map(category => (
                <label key={category.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.value)}
                    onChange={() => handleCategoryChange(category.value)}
                  />
                  {category.label}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Type</h3>
            <div className="checkbox-group">
              {typeOptions.map(type => (
                <label key={type.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.value)}
                    onChange={() => handleTypeChange(type.value)}
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="marketplace-main">
          <div className="marketplace-filters">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          {filteredItems.length === 0 ? (
            <div className="no-items">
              <p>No items found matching your criteria.</p>
            </div>
          ) : (
            <div className="user-items-grid">
              {filteredItems.map((item) => (
                <Link to={`/item/${item._id}`} key={item._id} className="item-card tomato-style">
                  <div className="item-image-container tomato-style">
                    <ImageCarousel images={getImageUrls(item)} />
                    {item.status !== 'available' && (
                      <div className={`status-badge ${item.status}`}>{item.status}</div>
                    )}
                  </div>
                  <div className="item-info tomato-style">
                    {/* Owner Avatar */}
                    <div className="item-owner-avatar" style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      {item.owner?.photoURL ? (
                        <img
                          src={item.owner.photoURL}
                          alt={item.owner.displayName}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            marginRight: 10,
                            border: '2px solid var(--color-primary)'
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'var(--color-bg-card)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 18,
                            marginRight: 10,
                            border: '2px solid var(--color-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.owner?.displayName && item.owner.displayName.trim() !== ''
                            ? item.owner.displayName
                                .split(' ')
                                .map(n => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()
                            : <i className="fa fa-user" />}
                        </span>
                      )}
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', margin: 0, padding: 0 }}>
                        {item.owner?.displayName || 'Anonymous'}
                      </span>
                    </div>
                    <div className="item-title tomato-style">{item.title}</div>
                    <div className="item-price tomato-style">{formatPriceRange(item.priceRange)}</div>
                    <div className="item-description tomato-style">{item.description}</div>
                    <div className="item-tags tomato-style">
                      <span className={`tag tag-type ${item.type}`}>
                        {item.type === 'barter' ? '🤝' : item.type === 'giveaway' ? '🎁' : '❓'}{' '}
                        {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'N/A'}
                      </span>
                      <span className={`tag tag-condition ${item.condition?.toLowerCase().replace(/\s/g, '-')}`}> 
                        {item.condition === 'New' ? '🆕' :
                         item.condition === 'Like New' ? '✨' :
                         item.condition === 'Good' ? '👍' :
                         item.condition === 'Fair' ? '👌' :
                         item.condition === 'Poor' ? '⚠️' : '❓'}{' '}
                        {item.condition || 'N/A'}
                      </span>
                      <span className={`tag tag-category ${item.category}`}>
                        {item.category === 'furniture' ? '🛋️' :
                         item.category === 'electronics' ? '💻' :
                         item.category === 'books' ? '📚' :
                         item.category === 'clothing' ? '👕' :
                         item.category === 'sports-equipment' ? '🏀' :
                         item.category === 'musical-instruments' ? '🎸' :
                         item.category === 'tools' ? '🛠️' :
                         item.category === 'art-supplies' ? '🎨' :
                         item.category === 'other' ? '❔' : '❓'}{' '}
                        {item.category || 'N/A'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Upload (mobile only) */}
      {user && (
        <button
          className="fab-upload-btn"
          title="Upload Item"
          onClick={() => setShowUploadDialog(true)}
        >
          +
        </button>
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