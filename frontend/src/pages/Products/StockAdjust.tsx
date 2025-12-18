import React, { useEffect, useState } from 'react';
import { productsAPI } from '../../services/api';
import { SearchBar } from '../../components/SearchBar';
import { ErrorMessage } from '../../components/ErrorMessage';
import type { Product } from '../../types';

export const StockAdjust: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await productsAPI.list(search ? { search, limit: 50 } : { limit: 50 });
      setProducts(res.data.products);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOne = async (p: Product) => {
    const value = pending[p.id];
    if (value === undefined || value === '') return;
    const qty = parseFloat(value);
    if (isNaN(qty) || qty < 0) {
      setError('Enter a valid non-negative number');
      return;
    }
    try {
      setSavingId(p.id);
      await productsAPI.updateStock(p.id, { current_stock_boxes: qty });
      setPending((prev) => ({ ...prev, [p.id]: '' }));
      await fetchProducts();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update stock');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bulk Stock Adjust</h1>
      </div>
      {error && <ErrorMessage error={error} onDismiss={() => setError('')} />}
      <SearchBar
        placeholder="Search products to adjust"
        onSearch={(t) => setSearch(t)}
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
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Boxes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">New Boxes</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-3 text-sm">{p.sku}</td>
                <td className="px-6 py-3 text-sm">{p.name}</td>
                <td className="px-6 py-3 text-sm text-right">{Number(p.currentStockBoxes)}</td>
                <td className="px-6 py-3 text-sm text-right">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={pending[p.id] ?? ''}
                    onChange={(e) => setPending((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-32 px-2 py-1 border rounded text-right"
                    placeholder="Enter qty"
                  />
                </td>
                <td className="px-6 py-3 text-sm text-right">
                  <button
                    onClick={() => updateOne(p)}
                    disabled={savingId === p.id}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingId === p.id ? 'Saving...' : 'Update'}
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No products matched</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


