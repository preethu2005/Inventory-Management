import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types';

export const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stockUpdate, setStockUpdate] = useState({ show: false, value: '', notes: '', saving: false });

  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.get(id!);
      setProduct(response.data);
    } catch (err: any) {
      setError('Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id!);
      navigate('/products');
    } catch (err: any) {
      setError('Failed to delete product');
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorMessage error={error} />;
  if (!product) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {isOwner && (
          <div className="space-x-2">
            <Link to={`/products/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Edit
            </Link>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><strong>SKU:</strong> {product.sku}</div>
          <div><strong>Company:</strong> {product.company}</div>
          <div><strong>Size:</strong> {product.size}</div>
          <div><strong>Finish:</strong> {product.finishType}</div>
          <div>
            <strong>Stock:</strong> {Number(product.currentStockBoxes)} boxes ({product.total_pieces} pcs)
            {isOwner && (
              <button
                onClick={() => setStockUpdate({ show: true, value: String(product.currentStockBoxes), notes: '', saving: false })}
                className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Update Stock
              </button>
            )}
          </div>
          <div><strong>Units per Box:</strong> {product.unitsPerBox}</div>
          <div><strong>Selling Price:</strong> ₹{product.sellingPricePerBox}</div>
          {isOwner && product.purchasePricePerBox && (
            <div><strong>Purchase Price:</strong> ₹{product.purchasePricePerBox}</div>
          )}
        </div>
        {stockUpdate.show && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold mb-3">Update Stock Directly</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">New Stock (boxes)*</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={stockUpdate.value}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter new stock quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={stockUpdate.notes}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Reason for stock adjustment"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!stockUpdate.value || parseFloat(stockUpdate.value) < 0) {
                      setError('Please enter a valid stock quantity');
                      return;
                    }
                    try {
                      setStockUpdate({ ...stockUpdate, saving: true });
                      setError('');
                      await productsAPI.updateStock(id!, {
                        current_stock_boxes: parseFloat(stockUpdate.value),
                        notes: stockUpdate.notes || undefined,
                      });
                      await fetchProduct();
                      setStockUpdate({ show: false, value: '', notes: '', saving: false });
                    } catch (err: any) {
                      setError(err.response?.data?.error || 'Failed to update stock');
                    } finally {
                      setStockUpdate({ ...stockUpdate, saving: false });
                    }
                  }}
                  disabled={stockUpdate.saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {stockUpdate.saving ? 'Updating...' : 'Update Stock'}
                </button>
                <button
                  onClick={() => setStockUpdate({ show: false, value: '', notes: '', saving: false })}
                  disabled={stockUpdate.saving}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
