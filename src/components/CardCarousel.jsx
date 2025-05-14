import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
// TODO: Consider moving carousel-specific styles to a dedicated CSS file
import '../pages/Messages/Messages.css';

const CardCarousel = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const goToNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };
  const goToPrevious = (e) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };
  const goToIndex = (e, idx) => {
    e?.stopPropagation();
    setCurrentIndex(idx);
  };

  const item = items[currentIndex];
  const fallbackImage = '/default-image.png'; // Place a default image in public/

  return (
    <div className="carousel-container card-carousel-container">
      <div className="carousel-main">
        <button type="button" className="carousel-button prev" onClick={goToPrevious} aria-label="Previous item" disabled={items.length === 1}>‹</button>
        <div className="trade-item-card">
          <img
            src={item?.imageUrls?.[0] || item?.imageUrl || fallbackImage}
            alt={item?.title || 'Item image'}
            onError={e => { e.target.onerror = null; e.target.src = fallbackImage; }}
          />
          <h4>{item?.title || 'Untitled Item'}</h4>
          <p>{item?.description || 'No description available.'}</p>
          <div className="item-meta">
            <p>Condition: {item?.condition || 'Unknown'}</p>
            <p>Status: {item?.status || 'Unknown'}</p>
          </div>
          <button
            type="button"
            className="view-item-button"
            onClick={() => item?._id && navigate(`/item/${item._id}`)}
            disabled={!item?._id}
          >
            View Item
          </button>
        </div>
        <button type="button" className="carousel-button next" onClick={goToNext} aria-label="Next item" disabled={items.length === 1}>›</button>
      </div>
      {items.length > 1 && (
        <div className="carousel-indicators">
          {items.map((_, idx) => (
            <button
              type="button"
              key={idx}
              className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={(e) => goToIndex(e, idx)}
              aria-label={`Go to item ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

CardCarousel.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      imageUrls: PropTypes.arrayOf(PropTypes.string),
      imageUrl: PropTypes.string,
      title: PropTypes.string,
      description: PropTypes.string,
      condition: PropTypes.string,
      status: PropTypes.string,
    })
  ),
};

export default CardCarousel; 