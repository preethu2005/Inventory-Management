import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesAPI, productsAPI, customersAPI } from '../../services/api';
import { ErrorMessage } from '../../components/ErrorMessage';
import type { CreateSaleInput } from '../../types';

export const SaleForm: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    sale_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash' as any,
    payment_status: 'Paid' as any,
    discount_amount: '' as any,
    discount_percentage: '' as any,
    items: [] as Array<{
      product: any;
      unit_type: 'boxes' | 'pieces';
      quantity: number;
      selling_price_per_box?: number;
      selling_price_per_piece?: number;
    }>,
  });
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productsAPI.list({ limit: 20 });
        setProductOptions(res.data.products);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const params = productQuery ? { search: productQuery, limit: 20 } : { limit: 20 };
        const res = await productsAPI.list(params);
        setProductOptions(res.data.products);
      } catch {
        setProductOptions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery]);

  const addItem = (product: any) => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product,
          unit_type: 'boxes',
          quantity: 1,
          selling_price_per_box: Number(product.sellingPricePerBox || 0),
          selling_price_per_piece: Number(product.sellingPricePerPiece || 0),
        },
      ],
    }));
  };

  const updateItem = (idx: number, patch: Partial<(typeof formData.items)[number]>) => {
    setFormData((prev) => ({ ...prev, items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));
  };

  const removeItem = (idx: number) => setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const subtotal = useMemo(() => {
    return formData.items.reduce((sum, it) => {
      const pieces = it.unit_type === 'pieces' ? it.quantity : it.quantity * it.product.unitsPerBox;
      const byBoxes = it.unit_type === 'boxes' ? it.quantity * Number(it.selling_price_per_box || it.product.sellingPricePerBox || 0) : 0;
      const byPieces = it.unit_type === 'pieces' ? pieces * Number(it.selling_price_per_piece || it.product.sellingPricePerPiece || 0) : 0;
      return sum + byBoxes + byPieces;
    }, 0);
  }, [formData.items]);

  const discount = useMemo(() => {
    if (formData.discount_percentage) return (subtotal * Number(formData.discount_percentage)) / 100;
    return Number(formData.discount_amount || 0);
  }, [subtotal, formData.discount_amount, formData.discount_percentage]);

  const total = Math.max(0, subtotal - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: CreateSaleInput = {
        customer: {
          name: formData.customer_name,
          phone: formData.customer_phone,
        },
        sale_date: formData.sale_date,
        discount_amount: formData.discount_amount ? Number(formData.discount_amount) : undefined,
        discount_percentage: formData.discount_percentage ? Number(formData.discount_percentage) : undefined,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        items: formData.items.map((it) => ({
          product_id: it.product.id,
          quantity: Number(it.quantity),
          unit_type: it.unit_type,
          selling_price_per_box: it.selling_price_per_box,
          selling_price_per_piece: it.selling_price_per_piece,
        })),
      };
      await salesAPI.create(payload);
      navigate('/sales');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Sale</h1>
      {error && <ErrorMessage error={error} onDismiss={() => setError('')} />}
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name*</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone*</label>
            <input
              type="tel"
              required
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sale Date*</label>
            <input
              type="date"
              required
              value={formData.sale_date}
              onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method*</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Credit</option>
            </select>
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
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={formData.discount_percentage}
              onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Add Product</label>
          <input
            type="text"
            placeholder="Search by name, SKU, company"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          {productOptions.length > 0 && (
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
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Unit</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Price/Box</th>
                <th className="px-3 py-2 text-right">Price/Piece</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {formData.items.map((it, idx) => {
                const pieces = it.unit_type === 'pieces' ? it.quantity : it.quantity * it.product.unitsPerBox;
                const totalByBoxes = it.unit_type === 'boxes' ? it.quantity * Number(it.selling_price_per_box || it.product.sellingPricePerBox || 0) : 0;
                const totalByPieces = it.unit_type === 'pieces' ? pieces * Number(it.selling_price_per_piece || it.product.sellingPricePerPiece || 0) : 0;
                const lineTotal = totalByBoxes + totalByPieces;
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
                        value={it.selling_price_per_box}
                        onChange={(e) => updateItem(idx, { selling_price_per_box: Number(e.target.value) })}
                        className="w-28 px-2 py-1 border rounded text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.selling_price_per_piece}
                        onChange={(e) => updateItem(idx, { selling_price_per_piece: Number(e.target.value) })}
                        className="w-28 px-2 py-1 border rounded text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">₹{lineTotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => removeItem(idx)} className="px-2 py-1 text-red-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                );
              })}
              {formData.items.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>No items added</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-start justify-between">
          <div className="w-64 bg-gray-50 rounded-lg p-4 space-y-2 ml-auto">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="font-semibold">₹{discount.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="text-gray-800">Total</span><span className="font-semibold">₹{total.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Create Sale'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
