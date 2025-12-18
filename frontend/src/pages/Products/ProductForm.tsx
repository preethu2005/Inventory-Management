import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ErrorMessage } from '../../components/ErrorMessage';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    company: '',
    finish_type: 'Glossy',
    units_per_box: 1,
    selling_price_per_box: 0,
  });
  const [sizeW, setSizeW] = useState<number | ''>('');
  const [sizeH, setSizeH] = useState<number | ''>('');

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.get(id!);
      setFormData(response.data as any);
      const m = (response.data.size || '').toLowerCase().match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
      if (m) {
        setSizeW(parseFloat(m[1]));
        setSizeH(parseFloat(m[2]));
      }
    } catch (err: any) {
      setError('Failed to load product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      // Derive size from dropdowns if provided
      let payload = { ...formData } as any;
      if (sizeW !== '' && sizeH !== '') {
        payload.size = `${sizeW}x${sizeH}`;
      }
      if (id) {
        await productsAPI.update(id, payload);
      } else {
        await productsAPI.create(payload);
      }
      navigate('/products');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{id ? 'Edit' : 'Add'} Product</h1>
      {error && <ErrorMessage error={error} onDismiss={() => setError('')} />}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Product Name*</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Size*</label>
            <div className="flex items-center gap-2">
              <select
                value={sizeW}
                onChange={(e) => setSizeW(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">W</option>
                {Array.from({ length: 16 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>×</span>
              <select
                value={sizeH}
                onChange={(e) => setSizeH(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="">H</option>
                {Array.from({ length: 16 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            <input
              type="text"
                placeholder="or type e.g. 4x4"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg"
            />
            </div>
            <div className="text-xs text-gray-600 mt-1">Select width and height (0–15) or type a custom size like 4x4.</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Company*</label>
            <input
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Finish Type*</label>
            <select
              value={formData.finish_type}
              onChange={(e) => setFormData({ ...formData, finish_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option>Glossy</option>
              <option>Matt</option>
              <option>Semi-gloss</option>
              <option>Rustic</option>
              <option>Polished</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Units per Box*</label>
            <input
              type="number"
              required
              min="1"
              value={formData.units_per_box}
              onChange={(e) => setFormData({ ...formData, units_per_box: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Selling Price per Box</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.selling_price_per_box}
            onChange={(e) => setFormData({ ...formData, selling_price_per_box: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? <LoadingSpinner size="sm" /> : id ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
