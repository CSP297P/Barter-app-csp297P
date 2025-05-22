import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import axios from 'axios';
import './Marketplace.css';
import ItemUpload from './ItemUpload';
import ImageCarousel from '../../components/ImageCarousel';
import Dialog from '@mui/material/Dialog';
import { UserRatingDisplay } from '../../components/UserProfileDialog';
import ItemDetailDialog from './ItemDetailDialog';

const Marketplace = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 1000]);

  const [ownerPhotoUrls, setOwnerPhotoUrls] = useState({});

  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

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

  const priceMarks = [0, 50, 100, 250, 500, 1000];

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        console.log("API URL: " + process.env.REACT_APP_API_URL);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/items`);
        console.log('Fetched items:', response.data);
        // Map through items to ensure owner information is properly structured
        const processedItems = response.data.map(item => ({
          ...item,
          owner: {
            _id: item.owner?._id || item.ownerId,
            displayName: item.ownerName || item.owner?.displayName || 'Anonymous',
            photoURL: item.owner?.photoURL
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

  useEffect(() => {
    const fetchOwnerPhotoUrls = async () => {
      const urls = {};
      const uniqueOwners = Array.from(new Set(items.map(item => item.owner?._id).filter(Boolean)));
      await Promise.all(uniqueOwners.map(async (ownerId) => {
        const owner = items.find(item => item.owner?._id === ownerId)?.owner;
        if (owner && owner.photoKey) {
          try {
            const res = await axios.get(`/users/${ownerId}/profile-photo-url`);
            urls[ownerId] = res.data.url;
          } catch {
            urls[ownerId] = '';
          }
        } else if (owner && owner.photoURL) {
          urls[ownerId] = owner.photoURL;
        } else {
          urls[ownerId] = '';
        }
      }));
      setOwnerPhotoUrls(urls);
    };
    if (items.length > 0) fetchOwnerPhotoUrls();
  }, [items]);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.REACT_APP_API_URL}${imageUrl}`;
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

  const handlePriceChange = (e, idx) => {
    const value = Number(e.target.value);
    setPriceRange(prev => {
      const newRange = [...prev];
      newRange[idx] = value;
      // Ensure min <= max
      if (newRange[0] > newRange[1]) {
        if (idx === 0) newRange[1] = value;
        else newRange[0] = value;
      }
      return newRange;
    });
  };

  const priceRangeMatch = (itemRange, selectedRange) => {
    if (!itemRange) return false;
    if (itemRange === '1000+') return selectedRange[1] >= 1000;
    const [itemMin, itemMax] = itemRange.split('-').map(Number);
    if (isNaN(itemMin) || isNaN(itemMax)) return false;
    // Overlap: itemMax >= selectedMin && itemMin <= selectedMax
    return itemMax >= selectedRange[0] && itemMin <= selectedRange[1];
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(item.type);
    const matchesPrice = priceRangeMatch(item.priceRange, priceRange);
    return matchesSearch && matchesCategory && matchesType && matchesPrice;
  });

  const handleUploadSuccess = (newItem) => {
    // Ensure the new item has the correct owner structure
    const processedNewItem = {
      ...newItem,
      owner: {
        _id: newItem.owner?._id || newItem.ownerId,
        displayName: newItem.ownerName || newItem.owner?.displayName || 'Anonymous',
        photoURL: newItem.owner?.photoURL
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

          <div className="filter-section">
            <h3>Price</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 32, fontSize: 13, color: '#888', marginRight: 4 }}>Min</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={1}
                  value={priceRange[0]}
                  onChange={e => handlePriceChange(e, 0)}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 40, fontSize: 13 }}>${priceRange[0]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 32, fontSize: 13, color: '#888', marginRight: 4 }}>Max</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={1}
                  value={priceRange[1]}
                  onChange={e => handlePriceChange(e, 1)}
                  style={{ flex: 1 }}
                />
                <span style={{ minWidth: 40, fontSize: 13 }}>{priceRange[1] === 1000 ? '$1000+' : `$${priceRange[1]}`}</span>
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                Selected: ${priceRange[0]} - {priceRange[1] === 1000 ? '$1000+' : `$${priceRange[1]}`}
              </div>
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
                <Link
                  to={`/item/${item._id}`}
                  key={item._id}
                  className="item-card tomato-style"
                  onClick={e => {
                    if (
                      e.target.closest('.carousel-button') ||
                      e.target.closest('.indicator-dot')
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    e.preventDefault();
                    setSelectedItemId(item._id);
                    setItemDetailOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
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
                          src={ownerPhotoUrls[item.owner._id] || item.owner.photoURL}
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
                        {item.owner?._id && (
                          <UserRatingDisplay userId={item.owner._id} style={{ marginLeft: 8, fontSize: 13 }} showLabel={false} />
                        )}
                      </span>
                    </div>
                    <div className="item-title tomato-style" style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{item.title}</div>
                    {/* <div className="item-price tomato-style">{formatPriceRange(item.priceRange)}</div>
                    <div className="item-description tomato-style">{item.description}</div> */}
                    <div className="item-tags tomato-style">
                      {item.type === 'giveaway' && (
                      <span className={`tag tag-type ${item.type}`}>
                          🎁 Giveaway
                      </span>
                      )}
                      <span className={`tag tag-condition ${item.condition?.toLowerCase().replace(/\s/g, '-')}`}> 
                        {item.condition === 'New' ? '🆕' :
                         item.condition === 'Like New' ? '✨' :
                         item.condition === 'Good' ? '👍' :
                         item.condition === 'Fair' ? '👌' :
                         item.condition === 'Poor' ? '⚠️' : '❓'}{' '}
                        {item.condition || 'N/A'}
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

      <ItemDetailDialog open={itemDetailOpen} onClose={() => setItemDetailOpen(false)} itemId={selectedItemId} />
    </div>
  );
};

export default Marketplace; 