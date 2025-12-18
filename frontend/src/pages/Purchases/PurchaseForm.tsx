import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { suppliersAPI, productsAPI, purchasesAPI } from '../../services/api';
import { ErrorMessage } from '../../components/ErrorMessage';
import type { CreatePurchaseInput, Product, Supplier } from '../../types';

export const PurchaseForm: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierSuggestions, setSupplierSuggestions] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState<Product[]>([]);

  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    purchase_date: new Date().toISOString().split('T')[0],
    payment_status: 'Paid' as any,
    payment_amount: '' as any,
    notes: '',
    items: [] as Array<{
      product: Product;
      unit_type: 'boxes' | 'pieces';
      quantity: number;
      purchase_price_per_box: number;
    }>,
  });

  // Do not pre-load products; only fetch when searching

  // Supplier autocomplete
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!supplierQuery) return setSupplierSuggestions([]);
      try {
        const res = await suppliersAPI.autocomplete(supplierQuery);
        setSupplierSuggestions(res.data.suggestions);
      } catch (e) {
        setSupplierSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [supplierQuery]);

  // Product search (only when query present)
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!productQuery || productQuery.trim().length < 2) {
        setProductOptions([]);
        return;
      }
      try {
        const res = await productsAPI.list({ search: productQuery.trim(), limit: 20 });
        setProductOptions(res.data.products);
      } catch (e) {
        setProductOptions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [productQuery]);

  const subtotal = useMemo(() => {
    return formData.items.reduce((sum, it) => {
      const boxes = it.unit_type === 'boxes' ? it.quantity : it.quantity / it.product.unitsPerBox;
      return sum + boxes * (it.purchase_price_per_box || 0);
    }, 0);
  }, [formData.items]);

  const canSubmit = selectedSupplier && formData.items.length > 0 && formData.invoice_number;

  const addItem = (product: Product) => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product,
          unit_type: 'boxes',
          quantity: 1,
          purchase_price_per_box: Number(product.purchasePricePerBox || 0),
        },
      ],
    }));
  };

  const updateItem = (idx: number, patch: Partial<(typeof formData.items)[number]>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };

  const removeItem = (idx: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setError('');
    setIsSubmitting(true);
    try {
      const payload: CreatePurchaseInput = {
        supplier_id: selectedSupplier.id,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        purchase_date: formData.purchase_date,
        payment_status: formData.payment_status,
        payment_amount: formData.payment_amount ? Number(formData.payment_amount) : undefined,
        notes: formData.notes || undefined,
        items: formData.items.map((it) => ({
          product_id: it.product.id,
          quantity: Number(it.quantity),
          unit_type: it.unit_type,
          purchase_price_per_box: Number(it.purchase_price_per_box || 0),
        })),
      };
      await purchasesAPI.create(payload);
      navigate('/purchases');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Purchase</h1>
      {error && <ErrorMessage error={error} onDismiss={() => setError('')} />}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supplier*</label>
            <input
              type="text"
              placeholder={selectedSupplier ? selectedSupplier.name : 'Search supplier by name'}
              value={supplierQuery}
              onChange={(e) => {
                setSelectedSupplier(null);
                setSupplierQuery(e.target.value);
              }}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {supplierSuggestions.length > 0 && !selectedSupplier && (
              <div className="mt-1 border rounded-lg max-h-40 overflow-auto bg-white z-10">
                {supplierSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSupplier(s);
                      setSupplierQuery('');
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {selectedSupplier && (
              <div className="text-sm text-gray-600 mt-1">Selected: {selectedSupplier.name}</div>
            )}
          </div>
          {/* Supplier quick add intentionally removed. Use Suppliers tab to create suppliers. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice #*</label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Date*</label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Purchase Date*</label>
            <input
              type="date"
              required
              value={formData.purchase_date}
              onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Status*</label>
            <select
              value={formData.payment_status}
              onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option>Paid</option>
              <option>Pending</option>
              <option>Partial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount</label>
            <input
              type="number"
              min={0}
              value={formData.payment_amount}
              onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Add Product</label>
              <input
                type="text"
                placeholder="Search by name, SKU, company"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          {productQuery && productQuery.trim().length >= 2 && productOptions.length > 0 && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {productOptions.slice(0, 8).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="px-3 py-2 border rounded hover:bg-gray-50 text-left"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-600">{p.sku} • {p.company}</div>
                </button>
              ))}
            </div>
          )}
          {(!productQuery || productQuery.trim().length < 2) && (
            <div className="mt-2 text-sm text-gray-500">Type at least 2 characters to search products.</div>
          )}
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Unit</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Price/Box</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {formData.items.map((it, idx) => {
                const boxes = it.unit_type === 'boxes' ? it.quantity : it.quantity / it.product.unitsPerBox;
                const total = boxes * (it.purchase_price_per_box || 0);
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{it.product.name}</div>
                      <div className="text-xs text-gray-600">{it.product.sku}</div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={it.unit_type}
                        onChange={(e) => updateItem(idx, { unit_type: e.target.value as any })}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="boxes">Boxes</option>
                        <option value="pieces">Pieces</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        className="w-24 px-2 py-1 border rounded text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.purchase_price_per_box}
                        onChange={(e) => updateItem(idx, { purchase_price_per_box: Number(e.target.value) })}
                        className="w-28 px-2 py-1 border rounded text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">₹{total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="px-2 py-1 text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
              {formData.items.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No items added</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1 mr-6">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="w-64 bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Create Purchase'}
          </button>
        <button
            type="button"
          onClick={() => navigate('/purchases')}
          className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
            Cancel
        </button>
      </div>
      </form>
    </div>
  );
};
