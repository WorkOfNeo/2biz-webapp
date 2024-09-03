import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Articles from './pages/Articles';
import Orders from './pages/OrdersTable'; // Import Orders page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/orders" element={<Orders />} /> {/* Add route for Orders */}
      </Routes>
    </Router>
  );
}

export default App;
