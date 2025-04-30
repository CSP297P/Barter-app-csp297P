import React, { useState } from 'react';
import './ImageCarousel.css';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleCarouselClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const goToNext = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPrevious = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToIndex = (e, index) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return <div className="carousel-container no-image">No images available</div>;
  }

  return (
    <div className="carousel-container" onClick={handleCarouselClick}>
      <div className="carousel-main" onClick={handleCarouselClick}>
        <button 
          className="carousel-button prev" 
          onClick={goToPrevious}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Previous image"
        >
          ‹
        </button>
        <div className="carousel-image-container" onClick={handleCarouselClick}>
          <img 
            src={images[currentIndex]} 
            alt={`Product image ${currentIndex + 1}`}
            className="carousel-image"
            onClick={handleCarouselClick}
          />
        </div>
        <button 
          className="carousel-button next" 
          onClick={goToNext}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label="Next image"
        >
          ›
        </button>
      </div>
      {images.length > 1 && (
        <div className="carousel-indicators" onClick={handleCarouselClick}>
          {images.map((_, index) => (
            <button
              key={index}
              className={`indicator-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={(e) => goToIndex(e, index)}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel; 