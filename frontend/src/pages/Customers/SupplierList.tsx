import React, { useEffect, useState } from 'react';
import { suppliersAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SearchBar } from '../../components/SearchBar';
import type { Supplier } from '../../types';

export const SupplierList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list();
      setSuppliers(response.data.suppliers);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Suppliers</h1>
        <button
          onClick={() => {
            setForm({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
            setError('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Supplier
        </button>
      </div>
      <SearchBar
        placeholder="Search suppliers by name"
        onSearch={(t) => setSearch(t)}
        fetchSuggestions={async (term) => {
          const q = term.toLowerCase();
          return suppliers
            .filter((s) => s.name.toLowerCase().includes(q))
            .slice(0, 6)
            .map((s) => ({ id: s.id, label: s.name }));
        }}
      />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(search ? suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : suppliers).map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-6 py-4">{supplier.name}</td>
                <td className="px-6 py-4">{supplier.contactPerson || '-'}</td>
                <td className="px-6 py-4">{supplier.phone || '-'}</td>
                <td className="px-6 py-4">{supplier.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Supplier</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Name*</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  setError('');
                  if (!form.name.trim()) {
                    setError('Name is required');
                    return;
                  }
                  try {
                    setSaving(true);
                    await suppliersAPI.create(form);
                    setIsModalOpen(false);
                    setIsLoading(true);
                    await fetchSuppliers();
                  } catch (e: any) {
                    setError(e.response?.data?.error || 'Failed to create supplier');
                  } finally {
                    setSaving(false);
                    setIsLoading(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
