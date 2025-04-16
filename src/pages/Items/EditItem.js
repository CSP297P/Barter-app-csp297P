import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { getItemById, updateItem } from '../../services/mongodb';
import './EditItem.css';

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const data = await getItemById(id);
        if (data.owner._id !== user._id) {
          navigate('/marketplace');
          return;
        }
        setItem(data);
      } catch (error) {
        setError('Failed to load item');
        console.error('Error fetching item:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await updateItem(id, {
        title: item.title,
        description: item.description,
        category: item.category,
        condition: item.condition,
        imageUrl: item.imageUrl
      });
      navigate(`/items/${id}`);
    } catch (error) {
      setError('Failed to update item');
      console.error('Error updating item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!item) {
    return <div className="error">Item not found</div>;
  }

  return (
    <div className="edit-item">
      <h2>Edit Item</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={item.title}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={item.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <input
            type="text"
            name="category"
            value={item.category}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Condition</label>
          <select
            name="condition"
            value={item.condition}
            onChange={handleChange}
            required
          >
            <option value="New">New</option>
            <option value="Like New">Like New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Image URL</label>
          <input
            type="url"
            name="imageUrl"
            value={item.imageUrl}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default EditItem; 