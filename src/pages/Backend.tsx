// src/pages/Backend.tsx
import React from 'react';
import Sidebar from '../components/Sidebar';

const Backend: React.FC = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Backend Management</h1>
        <p>Welcome to the admin backend. Use the navigation to manage your data.</p>
      </div>
    </div>
  );
};

export default Backend;