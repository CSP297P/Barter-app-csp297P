import React, { useState } from 'react';
import './ImageCarousel.css';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleCarouselClick = (e) => {};

  const goToNext = (e) => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPrevious = (e) => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToIndex = (e, index) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return <div className="carousel-container no-image">No images available</div>;
  }

  return (
    <div className="carousel-container" onClick={handleCarouselClick}>
      <div className="carousel-main" onClick={handleCarouselClick}>
        {images.length > 1 && (
          <button 
            className="carousel-button prev" 
            onClick={goToPrevious}
            aria-label="Previous image"
          >
            ‹
          </button>
        )}
        <div className="carousel-image-container" onClick={handleCarouselClick}>
          <img 
            src={images[currentIndex]} 
            alt={`Product image ${currentIndex + 1}`}
            className="carousel-image"
            onClick={handleCarouselClick}
          />
        </div>
        {images.length > 1 && (
          <button 
            className="carousel-button next" 
            onClick={goToNext}
            aria-label="Next image"
          >
            ›
          </button>
        )}
      </div>
      {images.length > 1 && (
        <div className="carousel-indicators" onClick={handleCarouselClick}>
          {images.map((_, index) => (
            <button
              key={index}
              className={`indicator-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={(e) => goToIndex(e, index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel; 