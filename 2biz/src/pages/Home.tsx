// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div>
      <h1>Welcome to the Homepage</h1>
      <p>This is the starting point of your web app.</p>
      {/* Add a link to the Articles page */}
      <Link to="/articles">Go to Articles Page</Link>
      <Link to="/orders">Go to Orders Page</Link>
    </div>
  );
};

export default Home;
