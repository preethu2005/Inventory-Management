import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { Login } from './pages/Login';
// Registration removed (admin-only user creation)
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/Products/ProductList';
import { ProductForm } from './pages/Products/ProductForm';
import { ProductDetail } from './pages/Products/ProductDetail';
import { StockAdjust } from './pages/Products/StockAdjust';
import { SalesList } from './pages/Sales/SalesList';
import { SaleForm } from './pages/Sales/SaleForm';
import { SaleDetail } from './pages/Sales/SaleDetail';
import { PurchaseList } from './pages/Purchases/PurchaseList';
import { PurchaseForm } from './pages/Purchases/PurchaseForm';
import { PurchaseDetail } from './pages/Purchases/PurchaseDetail';
import { CustomerList } from './pages/Customers/CustomerList';
import { CustomerDetail } from './pages/Customers/CustomerDetail';
import { SupplierList } from './pages/Customers/SupplierList';
import { Reports } from './pages/Reports/Reports';
import { UserManagement } from './pages/Settings/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Products */}
                    <Route path="/products" element={<ProductList />} />
                    <Route path="/products/new" element={<ProtectedRoute requiredRole="owner"><ProductForm /></ProtectedRoute>} />
                    <Route path="/products/stock-adjust" element={<ProtectedRoute requiredRole="owner"><StockAdjust /></ProtectedRoute>} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/products/:id/edit" element={<ProtectedRoute requiredRole="owner"><ProductForm /></ProtectedRoute>} />

                    {/* Sales */}
                    <Route path="/sales" element={<SalesList />} />
                    <Route path="/sales/new" element={<SaleForm />} />
                    <Route path="/sales/:id" element={<SaleDetail />} />

                    {/* Purchases */}
                    <Route path="/purchases" element={<ProtectedRoute requiredRole="owner"><PurchaseList /></ProtectedRoute>} />
                    <Route path="/purchases/new" element={<ProtectedRoute requiredRole="owner"><PurchaseForm /></ProtectedRoute>} />
                    <Route path="/purchases/:id" element={<ProtectedRoute requiredRole="owner"><PurchaseDetail /></ProtectedRoute>} />

                    {/* Customers & Suppliers */}
                    <Route path="/customers" element={<CustomerList />} />
                    <Route path="/customers/:id" element={<CustomerDetail />} />
                    <Route path="/suppliers" element={<ProtectedRoute requiredRole="owner"><SupplierList /></ProtectedRoute>} />

                    {/* Reports */}
                    <Route path="/reports" element={<Reports />} />

                    {/* Settings */}
                    <Route path="/settings/users" element={<ProtectedRoute requiredRole="owner"><UserManagement /></ProtectedRoute>} />

                    {/* Default dashboard route */}
                    <Route path="" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
