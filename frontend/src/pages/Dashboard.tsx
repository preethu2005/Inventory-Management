import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, productsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { DashboardStats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage error={error} onDismiss={() => setError('')} />;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sales Amount</span>
              <span className="text-2xl font-bold text-green-600">₹{stats.month_summary.sales_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Purchases Amount</span>
              <span className="text-2xl font-bold text-blue-600">₹{stats.month_summary.purchases_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Net (Sales - Purchases)</span>
              <span className={`text-2xl font-bold ${stats.month_summary.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ₹{stats.month_summary.net.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Overview Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Products</span>
              <span className="text-2xl font-bold text-blue-600">
                {stats.stock_overview.total_products}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">In Stock</span>
              <span className="text-xl font-semibold text-green-600">
                {stats.stock_overview.in_stock_count}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Low Stock Alerts</span>
              <Link
                to="/products?stock_status=low_stock"
                className="text-xl font-semibold text-red-600 hover:text-red-700"
              >
                {stats.stock_overview.low_stock_count}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Low Stock Alerts</h3>
        {stats.low_stock_alerts.length === 0 ? (
          <div className="text-center py-8 text-green-600">
            <span className="text-4xl">✓</span>
            <p className="mt-2 text-lg">All products are well stocked</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.low_stock_alerts.map((alert) => (
              <div
                key={alert.product_id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded hover:bg-red-100"
              >
                <div className="flex-1">
                  <Link
                    to={`/products/${alert.product_id}`}
                    className="font-medium text-gray-800 hover:text-blue-600"
                  >
                    {alert.name}
                  </Link>
                  <p className="text-sm text-gray-600">SKU: {alert.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">
                    Current: {alert.current_stock_boxes} boxes ({alert.total_pieces} pcs)
                  </p>
                  <p className="text-xs text-gray-600">
                    Alert threshold: &lt; 10 boxes
                  </p>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      onClick={async () => {
                        await productsAPI.update(alert.product_id, { low_stock_ignored: true });
                        fetchStats();
                      }}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Ignore
                    </button>
                    <button
                      onClick={async () => {
                        await productsAPI.update(alert.product_id, { low_stock_ignored: false });
                        fetchStats();
                      }}
                      className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50"
                    >
                      Consider
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/sales/new"
            className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 transition-colors"
          >
            <span className="text-4xl mb-2">🛒</span>
            <span className="font-medium text-gray-800">New Sale</span>
          </Link>
          <Link
            to="/purchases/new"
            className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 transition-colors"
          >
            <span className="text-4xl mb-2">📥</span>
            <span className="font-medium text-gray-800">Add Purchase</span>
          </Link>
          <Link
            to="/products/new"
            className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-purple-200 transition-colors"
          >
            <span className="text-4xl mb-2">📦</span>
            <span className="font-medium text-gray-800">Add Product</span>
          </Link>
          <Link
            to="/reports"
            className="flex flex-col items-center justify-center p-6 bg-orange-50 hover:bg-orange-100 rounded-lg border-2 border-orange-200 transition-colors"
          >
            <span className="text-4xl mb-2">📈</span>
            <span className="font-medium text-gray-800">View Reports</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
