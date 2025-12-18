import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { purchasesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SearchBar } from '../../components/SearchBar';
import type { Purchase } from '../../types';

export const PurchaseList: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, [search]);

  const fetchPurchases = async () => {
    try {
      const response = await purchasesAPI.list();
      const all = response.data.purchases as Purchase[];
      if (search && search.trim()) {
        const q = search.toLowerCase();
        setPurchases(all.filter((p) =>
          p.supplierName.toLowerCase().includes(q) ||
          p.purchaseNumber.toLowerCase().includes(q) ||
          (p.invoiceNumber || '').toLowerCase().includes(q)
        ));
      } else {
        setPurchases(all);
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
        <h1 className="text-2xl font-bold">Purchases</h1>
        <Link to="/purchases/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Purchase
        </Link>
      </div>
      <SearchBar
        placeholder="Search by supplier, purchase #, invoice #"
        onSearch={(t) => setSearch(t)}
        fetchSuggestions={async (term) => {
          const q = term.toLowerCase();
          return purchases
            .filter((p) => p.supplierName.toLowerCase().includes(q) || p.purchaseNumber.toLowerCase().includes(q))
            .slice(0, 6)
            .map((p) => ({ id: p.id, label: `${p.supplierName} (${p.purchaseNumber})` }));
        }}
      />
      <div className="bg-white rounded-lg shadow overflow-hidden mt-4">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td className="px-6 py-4">
                  <Link to={`/purchases/${purchase.id}`} className="text-blue-600 hover:text-blue-900">
                    {purchase.purchaseNumber}
                  </Link>
                </td>
                <td className="px-6 py-4">{purchase.supplierName}</td>
                <td className="px-6 py-4">{purchase.invoiceNumber}</td>
                <td className="px-6 py-4">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                <td className="px-6 py-4">₹{Number(purchase.totalAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
