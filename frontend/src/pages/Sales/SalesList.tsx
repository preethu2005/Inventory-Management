import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SearchBar } from '../../components/SearchBar';
import type { Sale } from '../../types';

export const SalesList: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSales();
  }, [search]);

  const fetchSales = async () => {
    try {
      const response = await salesAPI.list();
      const all = response.data.sales as Sale[];
      if (search && search.trim()) {
        const q = search.toLowerCase();
        setSales(all.filter((s) =>
          s.customerName.toLowerCase().includes(q) ||
          s.saleNumber.toLowerCase().includes(q)
        ));
      } else {
        setSales(all);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Link to="/sales/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Sale
        </Link>
      </div>
      <SearchBar
        placeholder="Search by customer or sale #"
        onSearch={(t) => setSearch(t)}
        fetchSuggestions={async (term) => {
          const q = term.toLowerCase();
          return sales
            .filter((s) => s.customerName.toLowerCase().includes(q) || s.saleNumber.toLowerCase().includes(q))
            .slice(0, 6)
            .map((s) => ({ id: s.id, label: `${s.customerName} (${s.saleNumber})` }));
        }}
      />
      <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-6 py-4">
                  <Link to={`/sales/${sale.id}`} className="text-blue-600 hover:text-blue-900">
                    {sale.saleNumber}
                  </Link>
                </td>
                <td className="px-6 py-4">{sale.customerName}</td>
                <td className="px-6 py-4">{new Date(sale.saleDate).toLocaleDateString()}</td>
                <td className="px-6 py-4">₹{Number(sale.totalAmount).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-sm ${sale.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                    {sale.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
