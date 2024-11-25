// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaShoppingBag, FaClipboardList, FaChartBar, FaCalendar } from 'react-icons/fa';
import logo from '../Logo-transparent-hvidt.png'; // Adjust the path relative to the component file

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State to control sidebar visibility
  const location = useLocation(); // Get the current path

  // Define an array of routes for the sidebar with icons
  const routes = [
    { path: '/buying-orders', label: 'Buying Orders', icon: <FaShoppingBag className="w-6 h-6" /> },
    { path: '/logs', label: 'Logs', icon: <FaClipboardList className="w-6 h-6" /> },
    { path: '/products-admin', label: 'Products (Admin)', icon: <FaShoppingBag className="w-6 h-6" /> },
    { path: '/top-10', label: 'Top 10', icon: <FaChartBar className="w-6 h-6" /> },
    { path: '/daily-sales', label: 'Daily Sales', icon: <FaCalendar className="w-6 h-6" /> },
  ];

  // Toggle sidebar open/close
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div
      className={`h-full ${isSidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 text-white transition-all duration-300 sticky top-0 left-0 flex flex-col h-screen`}
    >
      <div className="p-4 border-b border-gray-700">
        <Link to="/backend">
          <img src={logo} alt="Logo" className="w-32 h-auto" />
        </Link>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-4 flex-1">
          <li>
            <Link to="/" className="font-semi-bold flex space-x-2">
              <FaHome className="w-6 h-6" />
              {isSidebarOpen && <span>Home</span>}
            </Link>
          </li>
          {routes.map((route) => (
            <li key={route.path}>
              <Link
                to={route.path}
                className={`flex items-center space-x-2 transition ${
                  location.pathname === route.path
                    ? 'text-blue-300 font-semibold'
                    : 'hover:text-gray-300'
                }`}
              >
                <div className="flex-shrink-0">{route.icon}</div>
                {isSidebarOpen && <span>{route.label}</span>} {/* Show label only when sidebar is expanded */}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Floating button to toggle sidebar */}
      <button
        onClick={toggleSidebar}
        className="absolute bottom-6 -right-12 bg-blue-500 text-white p-3 focus:outline-none"
      >
        {isSidebarOpen ? '←' : '→'} {/* Display left arrow when expanded, right arrow when collapsed */}
      </button>
    </div>
  );
};

export default Sidebar;