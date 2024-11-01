// src/pages/BuyingOrders.tsx
import React from 'react';
import Sidebar from '../components/Sidebar';

const BuyingOrders: React.FC = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8 ml-64">
        <h1 className="text-3xl font-bold mb-6">Buying Orders</h1>
        {/* Content for managing buying orders */}
        <p>Manage your buying orders here.</p>
      </div>
    </div>
  );
};

export default BuyingOrders;