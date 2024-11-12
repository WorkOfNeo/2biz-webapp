// src/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation(); // Get the current path

  // Define an array of routes for the sidebar
  const routes = [
    { path: '/buying-orders', label: 'Buying Orders' },
    { path: '/logs', label: 'Logs' },
    { path: '/products-admin', label: 'Products (Admin)' },
    { path: '/top-10', label: 'Top 10' },
    { path: '/daily-sales', label: 'Daily Sales' },
  ];

  return (
    <div className="h-full w-64 bg-gray-800 text-white fixed top-0 left-0 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Link to="/backend">
          <h2 className="text-2xl font-bold">Admin Panel</h2>
        </Link>
      </div>
      <nav className="flex-1 p-4">
        
        <ul className="space-y-4 flex-1">
          {routes.map((route) => (
            <li key={route.path}>
              <Link
                to={route.path}
                className={`transition ${
                  location.pathname === route.path
                    ? 'text-blue-300 font-semibold'
                    : 'hover:text-gray-300'
                }`}
              >
                {route.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
            to="/"
            className="font-semi-bold flex-0"
          >Home</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;