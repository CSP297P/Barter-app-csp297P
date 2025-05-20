import React from 'react';
import './NotificationBell.css';

const NotificationBell = ({ notifications, onClose, onClear }) => {
  return (
    <div className="notification-bell-dropdown">
      <div className="notification-bell-header">
        <span>Notifications</span>
        <button className="notification-bell-clear" onClick={onClear}>Clear All</button>
        <button className="notification-bell-close" onClick={onClose}>×</button>
      </div>
      <div className="notification-bell-list">
        {notifications.length === 0 ? (
          <div className="notification-bell-empty">No notifications</div>
        ) : (
          notifications.map((notif, idx) => (
            <div key={idx} className={`notification-bell-item notification-${notif.type}`}>
              <div className="notification-bell-message">{notif.message}</div>
              <div className="notification-bell-time">{notif.timestamp instanceof Date ? notif.timestamp.toLocaleTimeString() : notif.timestamp}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationBell; 