import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Divider } from '@mui/material';
import ImageUploader from './ImageUploader';

const typeOptions = [
  { value: 'barter', label: 'Barter' },
  { value: 'giveaway', label: 'Giveaway' }
];
const conditionOptions = [
  'New', 'Like New', 'Good', 'Fair', 'Poor'
];
const categoryOptions = [
  'gaming-console', 'sports-equipment', 'electronics', 'books', 'clothing', 'furniture', 'musical-instruments', 'tools', 'art-supplies', 'other'
];

function EditItemDialog({ open, item, onClose, onSave }) {
  const [form, setForm] = useState(item);
  const [images, setImages] = useState(item.imageUrls || []);

  useEffect(() => {
    setForm(item);
    setImages(item.imageUrls || []);
  }, [item]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave({ ...form, imageUrls: images });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ style: { borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,60,0.18)' } }}>
      <DialogTitle style={{ fontWeight: 700, fontSize: 24, letterSpacing: 0.5, paddingBottom: 0 }}>Edit Item</DialogTitle>
      <DialogContent style={{ background: '#f8fafc', borderRadius: 12, padding: '32px 24px 16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <TextField
            margin="dense"
            label="Title"
            name="title"
            value={form.title}
            onChange={handleChange}
            fullWidth
            InputProps={{ style: { borderRadius: 8, background: '#fff' } }}
          />
          <TextField
            margin="dense"
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            InputProps={{ style: { borderRadius: 8, background: '#fff' } }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <TextField
              margin="dense"
              label="Type"
              name="type"
              value={form.type}
              onChange={handleChange}
              select
              fullWidth
              InputProps={{ style: { borderRadius: 8, background: '#fff' } }}
            >
              {typeOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              label="Category"
              name="category"
              value={form.category}
              onChange={handleChange}
              select
              fullWidth
              InputProps={{ style: { borderRadius: 8, background: '#fff' } }}
            >
              {categoryOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <TextField
              margin="dense"
              label="Condition"
              name="condition"
              value={form.condition}
              onChange={handleChange}
              select
              fullWidth
              InputProps={{ style: { borderRadius: 8, background: '#fff' } }}
            >
              {conditionOptions.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              margin="dense"
              label="Estimated Value Range"
              name="priceRange"
              value={form.priceRange}
              onChange={handleChange}
              fullWidth
              InputProps={{ style: { borderRadius: 8, background: '#fff' } }}
            />
          </div>
        </div>
        <Divider style={{ margin: '28px 0 18px 0' }} />
        <div style={{ margin: '1.5rem 0', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(60,60,60,0.07)', padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#1976d2', letterSpacing: 0.2 }}>Images</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Rearrange, remove, or add more images for your item.</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, overflowX: 'auto' }}>
            {images.map((img, idx) => (
              <div key={`img-${idx}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90, marginBottom: 8 }}>
                <img src={img} alt={`item-img-${idx}`} style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, border: '2px solid #eee', marginBottom: 4, boxShadow: '0 1px 4px rgba(60,60,60,0.07)' }} />
                <button
                  type="button"
                  title="Remove image"
                  onClick={() => {
                    const newImages = images.filter((_, i) => i !== idx);
                    setImages(newImages);
                  }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#ffebee',
                    color: '#c62828',
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(60,60,60,0.10)',
                    opacity: 0.85,
                    transition: 'opacity 0.2s',
                    zIndex: 2,
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = 1}
                  onMouseOut={e => e.currentTarget.style.opacity = 0.85}
                  aria-label="Remove image"
                >✕</button>
                <div style={{ display: 'flex', flexDirection: 'row', gap: 4, marginTop: 2 }}>
                  <button
                    type="button"
                    title="Move left"
                    onClick={() => {
                      if (idx === 0) return;
                      const newImages = [...images];
                      [newImages[idx - 1], newImages[idx]] = [newImages[idx], newImages[idx - 1]];
                      setImages(newImages);
                    }}
                    disabled={idx === 0}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: 'none',
                      background: idx === 0 ? '#f0f0f0' : '#e3f2fd',
                      color: idx === 0 ? '#bdbdbd' : '#1976d2',
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                      marginRight: 2
                    }}
                    aria-label="Move left"
                  >&larr;</button>
                  <button
                    type="button"
                    title="Move right"
                    onClick={() => {
                      if (idx === images.length - 1) return;
                      const newImages = [...images];
                      [newImages[idx + 1], newImages[idx]] = [newImages[idx], newImages[idx + 1]];
                      setImages(newImages);
                    }}
                    disabled={idx === images.length - 1}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: 'none',
                      background: idx === images.length - 1 ? '#f0f0f0' : '#e3f2fd',
                      color: idx === images.length - 1 ? '#bdbdbd' : '#1976d2',
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                      marginRight: 2
                    }}
                    aria-label="Move right"
                  >&rarr;</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <ImageUploader
              onUploadComplete={(uploaded) => {
                // uploaded is an array of { file, url }
                setImages(uploaded.map(img => img.url));
              }}
              maxFiles={10}
              initialImages={images.map((url, i) => ({ file: `img-${i}`, url }))}
            />
          </div>
        </div>
      </DialogContent>
      <DialogActions style={{ padding: '18px 32px 24px 32px' }}>
        <Button onClick={onClose} style={{ color: '#888', fontWeight: 500, fontSize: 16, borderRadius: 8, padding: '8px 20px' }}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary" style={{ fontWeight: 600, fontSize: 16, borderRadius: 8, padding: '8px 28px', boxShadow: '0 2px 8px rgba(60,60,60,0.10)' }}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditItemDialog; 