import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchasesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

export const PurchaseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await purchasesAPI.get(id!);
        setPurchase(res.data);
      } catch (e) {
        setPurchase(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (!purchase) return <div className="max-w-4xl mx-auto">Purchase not found</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchase #{purchase.purchaseNumber}</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Print</button>
          {user?.role === 'owner' && (
        <button
            onClick={async () => {
              if (!confirm('Delete this purchase? This will decrease stock accordingly.')) return;
              try {
                await purchasesAPI.delete(id!);
                navigate('/purchases');
              } catch (e) {
                // handled by backend; could show toast
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>)}
          <button onClick={() => navigate('/purchases')} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Back</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div><strong>Supplier:</strong> {purchase.supplier?.name || purchase.supplierName}</div>
            <div><strong>Invoice #:</strong> {purchase.invoiceNumber}</div>
          </div>
          <div>
            <div><strong>Invoice Date:</strong> {new Date(purchase.invoiceDate).toLocaleDateString()}</div>
            <div><strong>Purchase Date:</strong> {new Date(purchase.purchaseDate).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-right">Boxes</th>
                <th className="px-3 py-2 text-right">Pieces</th>
                <th className="px-3 py-2 text-right">Price/Box</th>
                <th className="px-3 py-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchase.items.map((it: any) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{it.productName}</div>
                    <div className="text-xs text-gray-600">{it.productSku}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{Number(it.quantityBoxes)}</td>
                  <td className="px-3 py-2 text-right">{Number(it.quantityPieces)}</td>
                  <td className="px-3 py-2 text-right">₹{Number(it.purchasePricePerBox).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">₹{Number(it.totalPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <div className="w-64 bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between"><span className="text-gray-600">Total Amount</span><span className="font-semibold">₹{Number(purchase.totalAmount).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Payment</span><span className="font-semibold">{purchase.paymentStatus}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
