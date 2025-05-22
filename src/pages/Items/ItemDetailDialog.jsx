import React from 'react';
import Dialog from '@mui/material/Dialog';
import Grow from '@mui/material/Grow';
import ItemDetail from './ItemDetail';

const ItemDetailDialog = ({ open, onClose, itemId }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionComponent={Grow}
      transitionDuration={350}
      PaperProps={{
        style: {
          background: 'none',
          boxShadow: 'none',
          borderRadius: 24,
        }
      }}
    >
      {/* Pass the itemId as a prop to ItemDetail, and let ItemDetail use it instead of useParams */}
      <div style={{ padding: 0 }}>
        <ItemDetail itemId={itemId} onClose={onClose} isDialog />
      </div>
    </Dialog>
  );
};

export default ItemDetailDialog; 