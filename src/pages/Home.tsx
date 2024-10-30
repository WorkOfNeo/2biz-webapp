// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">2-Biz Web App</h1>
      <p className="text-gray-600 mb-6 text-center">
        This is the starting point of your web app.
      </p>
      <div className="space-x-4">
        <Link
          to="/articles"
          className="px-6 py-2 bg-blue-600 text-white rounded-md transition duration-300 ease-in-out hover:bg-blue-700"
        >
          Go to Articles Page
        </Link>
        <Link
          to="/orders"
          className="px-6 py-2 bg-green-600 text-white rounded-md transition duration-300 ease-in-out hover:bg-green-700"
        >
          Go to Orders Page
        </Link>
      </div>
    </div>
  );
};

export default Home;