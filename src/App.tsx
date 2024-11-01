import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Articles from './pages/Articles';
import Orders from './pages/OrdersTable';
import Logs from './pages/Logs'; 
import Backend from './pages/Backend';
import ProductsAdmin from './pages/ProductsAdmin';
import Top10 from './pages/Top10';
import BuyingOrders from './pages/BuyingOrders';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/backend" element={<Backend />} />
        <Route path="/buying-orders" element={<BuyingOrders />} />
        <Route path="/products-admin" element={<ProductsAdmin />} />
        <Route path="/top-10" element={<Top10 />} />
      </Routes>
    </Router>
  );
}

export default App;
