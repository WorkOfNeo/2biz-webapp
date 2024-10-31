// src/pages/Backend.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Backend = () => {
  return (
    <div>
      <h1>Backend Management</h1>
      <Link to="/logs" className="text-blue-500 underline">
        View Sync Logs
      </Link>
    </div>
  );
};

export default Backend;