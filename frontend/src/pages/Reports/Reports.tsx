import React from 'react';
import { Link } from 'react-router-dom';

export const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Stock Report</h3>
          <p className="text-gray-600 text-sm mb-4">View current inventory status</p>
          <Link to="/products" className="text-blue-600 hover:text-blue-800">
            View Stock →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Sales Report</h3>
          <p className="text-gray-600 text-sm mb-4">View sales performance</p>
          <Link to="/sales" className="text-blue-600 hover:text-blue-800">
            View Sales →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Purchase Report</h3>
          <p className="text-gray-600 text-sm mb-4">View purchase history</p>
          <Link to="/purchases" className="text-blue-600 hover:text-blue-800">
            View Purchases →
          </Link>
        </div>
      </div>
    </div>
  );
};
