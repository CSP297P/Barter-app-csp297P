import React, { useEffect } from 'react';
import './FloatingNotification.css';

const FloatingNotification = ({ notifications, onRemove }) => {
  useEffect(() => {
    if (notifications.length === 0) return;
    const timers = notifications.map((notif, idx) =>
      setTimeout(() => onRemove(notif.id), 4000 + idx * 200)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, onRemove]);

  return (
    <div className="floating-notification-container">
      {notifications.map((notif) => (
        <div key={notif.id} className={`floating-notification notification-${notif.type}`}>
          <div className="floating-notification-message">{notif.message}</div>
        </div>
      ))}
    </div>
  );
};

export default FloatingNotification; 