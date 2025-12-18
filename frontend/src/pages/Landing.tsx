import React from 'react';
import { Link } from 'react-router-dom';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-3xl w-full p-8 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Inventory Management</h1>
        <p className="text-gray-600 mb-8">Simple, fast, and reliable stock, sales, and purchase tracking for your shop.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Login</Link>
        </div>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <h3 className="font-semibold mb-1">Products</h3>
            <p className="text-sm text-gray-600">Manage your catalog with sizes, companies, and pricing.</p>
          </div>
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <h3 className="font-semibold mb-1">Sales & Purchases</h3>
            <p className="text-sm text-gray-600">Record transactions and keep stock accurate automatically.</p>
          </div>
          <div className="p-4 bg-white border rounded-lg shadow-sm">
            <h3 className="font-semibold mb-1">Reports & Alerts</h3>
            <p className="text-sm text-gray-600">Insights and low stock alerts to stay ahead.</p>
          </div>
        </div>
      </div>
    </div>
  );
};



