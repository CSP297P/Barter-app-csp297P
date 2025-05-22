import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
// TODO: Consider moving carousel-specific styles to a dedicated CSS file
import '../pages/Messages/Messages.css';
import '../components/CardCarousel.css';

const CardCarousel = ({ items }) => {
  const navigate = useNavigate();
  if (!items || items.length === 0) return null;
  const fallbackImage = '/default-image.png';

  return (
    <div className="card-carousel-container">
      {items.map((item, idx) => (
        <div
          className={`trade-item-card${item.selected ? ' selected' : ''}`}
          key={item._id || idx}
          onClick={() => {
            if (item.onClick) item.onClick();
            else if (item?._id) navigate(`/item/${item._id}`);
          }}
        >
          {item.selected && (
            <div className="selected-indicator">
              <span>✔</span>
            </div>
          )}
          <img
            src={item?.imageUrls?.[0] || item?.imageUrl || fallbackImage}
            alt={item?.title || 'Item image'}
            onError={e => { e.target.onerror = null; e.target.src = fallbackImage; }}
          />
          <h4>{item?.title || 'Untitled Item'}</h4>
          <p>{item?.description || 'No description available.'}</p>
          <p>{item?.priceRange || 'No price range available.'}</p>
        </div>
      ))}
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