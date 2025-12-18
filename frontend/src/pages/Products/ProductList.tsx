import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { SearchBar } from '../../components/SearchBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import type { Product } from '../../types';

export const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params = Object.fromEntries(Array.from(searchParams.entries()));
      const response = await productsAPI.list(params);
      setProducts(response.data.products);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    const current = searchParams.get('search') || '';
    const normalized = term?.trim() || '';
    if (normalized === current) return; // avoid update loop
    const next = new URLSearchParams(searchParams);
    if (normalized) {
      next.set('search', normalized);
      next.set('page', '1');
    } else {
      next.delete('search');
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading products..." />;
  }

  if (error) {
    return <ErrorMessage error={error} onDismiss={() => setError('')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        {isOwner && (
          <div className="flex gap-2">
            <Link
              to="/products/stock-adjust"
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Adjust Stock
            </Link>
            <Link
              to="/products/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Product
            </Link>
          </div>
        )}
      </div>

      <SearchBar
        placeholder="Search products by name, SKU, or company..."
        onSearch={handleSearch}
        fetchSuggestions={async (term) => {
          try {
            const res = await productsAPI.list({ search: term, limit: 6 });
            return res.data.products.map((p) => ({ id: p.id, label: p.name }));
          } catch {
            return [];
          }
        }}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className={product.is_low_stock ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.sku}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  <div className="text-sm text-gray-500">{product.finishType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.size}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {Number(product.currentStockBoxes)} boxes
                  </div>
                  <div className="text-xs text-gray-500">{product.total_pieces} pcs</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(() => {
                    const m = (product.size || '').toLowerCase().match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
                    if (!m) return '-';
                    const w = parseFloat(m[1]);
                    const h = parseFloat(m[2]);
                    const area = isFinite(w) && isFinite(h) ? w * h : 0;
                    const feet = (product.total_pieces || 0) * area;
                    return feet ? feet.toFixed(2) : '-';
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{product.sellingPricePerBox || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link to={`/products/${product.id}`} className="text-blue-600 hover:text-blue-900">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
