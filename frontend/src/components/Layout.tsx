import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'owner', 'staff'] },
    { path: '/products', label: 'Products', icon: '📦', roles: ['admin', 'owner', 'staff'] },
    { path: '/sales', label: 'Sales', icon: '🛒', roles: ['admin', 'owner', 'staff'] },
    { path: '/purchases', label: 'Purchases', icon: '📥', roles: ['admin', 'owner', 'staff'] },
    { path: '/customers', label: 'Customers', icon: '👥', roles: ['admin', 'owner', 'staff'] },
    { path: '/suppliers', label: 'Suppliers', icon: '🏢', roles: ['admin', 'owner'] },
    { path: '/reports', label: 'Reports', icon: '📈', roles: ['admin', 'owner', 'staff'] },
    { path: '/settings/users', label: 'User Management', icon: '⚙️', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role || 'staff'));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`bg-blue-900 text-white transition-all duration-300 relative ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          {isSidebarOpen && <h1 className="text-xl font-bold">Inventory</h1>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-white hover:bg-blue-800 p-2 rounded"
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="mt-8">
          {filteredMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 hover:bg-blue-800 transition-colors ${
                location.pathname === item.path ? 'bg-blue-800' : ''
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              {isSidebarOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4">
          {isSidebarOpen && (
            <div className="mb-4 text-sm">
              <p className="font-semibold">{user?.name}</p>
              <p className="text-blue-300 capitalize">{user?.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 hover:bg-blue-800 rounded transition-colors"
          >
            <span className="text-2xl">🚪</span>
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              {menuItems.find((item) => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
