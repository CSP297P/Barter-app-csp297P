import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ open, title, message, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="ok-btn" onClick={onConfirm}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog; 