// pages/admin.tsx

import React from 'react';
import ProductsAdmin from '../components/ProductsAdmin';
import Sidebar from '../components/Sidebar';

const AdminPage: React.FC = () => {
  return (
    <div className="flex">
    <Sidebar />
    <div className="flex-1 mx-auto px-2 py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <ProductsAdmin />
    </div>
    </div>
  );
};

export default AdminPage;