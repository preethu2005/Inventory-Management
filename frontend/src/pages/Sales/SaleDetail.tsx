import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

export const SaleDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sale, setSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSale();
  }, [id]);

  const fetchSale = async () => {
    try {
      const response = await salesAPI.get(id!);
      setSale(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (!sale) return <div>Sale not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sale Details</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Print</button>
          {user?.role === 'owner' && (
          <button
            onClick={async () => {
              if (!confirm('Delete this sale? This will restore stock.')) return;
              try {
                await salesAPI.delete(id!);
                navigate('/sales');
              } catch (e) {
                // noop; surface error via network overlay or console
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>)}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Sale #:</strong> {sale.saleNumber}</div>
          <div><strong>Customer:</strong> {sale.customerName}</div>
          <div><strong>Phone:</strong> {sale.customerPhone}</div>
          <div><strong>Date:</strong> {new Date(sale.saleDate).toLocaleDateString()}</div>
          <div><strong>Total:</strong> ₹{Number(sale.totalAmount).toLocaleString()}</div>
          <div><strong>Payment:</strong> {sale.paymentMethod} - {sale.paymentStatus}</div>
        </div>
        <div className="overflow-auto mt-4">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-right">Boxes</th>
                <th className="px-3 py-2 text-right">Pieces</th>
                <th className="px-3 py-2 text-right">Price/Box</th>
                <th className="px-3 py-2 text-right">Price/Piece</th>
                <th className="px-3 py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sale.items?.map((it: any) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-xs text-gray-600">{it.productSku}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{Number(it.quantityBoxes)}</td>
                  <td className="px-3 py-2 text-right">{Number(it.quantityPieces)}</td>
                  <td className="px-3 py-2 text-right">{it.sellingPricePerBox ? `₹${Number(it.sellingPricePerBox).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right">{it.sellingPricePerPiece ? `₹${Number(it.sellingPricePerPiece).toFixed(2)}` : '-'}</td>
                  <td className="px-3 py-2 text-right">₹{Number(it.totalPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
