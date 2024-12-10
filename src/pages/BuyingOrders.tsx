// src/pages/BuyingOrders.tsx

import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import OrderTable from '../components/OrderTable';
import UploadCSVModal from '../components/UploadCSVModal';

const BuyingOrders: React.FC = () => {
  // State to control the visibility of the Upload CSV Modal
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  // Function to handle actions after a successful upload
  const handleUploadComplete = () => {
    // This function can be used to trigger a refresh of the OrderTable if needed
    // For example, you might pass a callback to OrderTable to re-fetch data
    // Currently, it's left empty as OrderTable handles its own data fetching
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Buying Orders</h1>

        {/* Button to open the CSV Upload Modal */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Upload CSV
          </button>
        </div>

        {/* Render the OrderTable component */}
        <OrderTable />

        {/* Upload CSV Modal */}
        <UploadCSVModal
          isOpen={isCSVModalOpen}
          onClose={() => setIsCSVModalOpen(false)}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    </div>
  );
};

export default BuyingOrders;