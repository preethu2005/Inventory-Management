import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Customer Details</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">Customer ID: {id}</p>
        <button
          onClick={() => navigate('/customers')}
          className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    </div>
  );
};
