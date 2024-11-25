// src/components/AddBuyingOrderForm.tsx

import React, { useState } from 'react';
import { BuyingOrder, Product } from './types';

interface AddBuyingOrderFormProps {
  products: Product[];
  onOrderAdded: (newOrder: BuyingOrder) => void; // Update this line to accept a BuyingOrder as an argument
}

const AddBuyingOrderForm: React.FC<AddBuyingOrderFormProps> = ({
  products,
  onOrderAdded,
}) => {
  const [newOrder, setNewOrder] = useState<BuyingOrder>({
    leverandor: '',
    ordreDato: new Date(),
    ordreNr: '',
    style: '',
    farve: '',
    koebtAntal: 0,
    etaDato: new Date(),
    leveringsuge: 0,
    saeson: '',
    productId: '',
    bekraeftet: false,
    leveret: 'Nej',
    kommentarer: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrder((prevOrder) => ({
      ...prevOrder,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOrderAdded(newOrder); // Pass the new order to the parent
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Leverandør:</label>
        <input
          type="text"
          name="leverandor"
          value={newOrder.leverandor}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Ordre Nr:</label>
        <input
          type="text"
          name="ordreNr"
          value={newOrder.ordreNr}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Style:</label>
        <input
          type="text"
          name="style"
          value={newOrder.style}
          onChange={handleInputChange}
        />
      </div>
      {/* Add other fields for Farve, Købt, Solgt, etc. */}
      <div>
        <label>Farve:</label>
        <input
          type="text"
          name="farve"
          value={newOrder.farve}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Købt Antal:</label>
        <input
          type="number"
          name="koebtAntal"
          value={newOrder.koebtAntal}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Leveringsuge:</label>
        <input
          type="number"
          name="leveringsuge"
          value={newOrder.leveringsuge}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Sæson:</label>
        <input
          type="text"
          name="saeson"
          value={newOrder.saeson}
          onChange={handleInputChange}
        />
      </div>

      {/* Submit button */}
      <button type="submit">Add Order</button>
    </form>
  );
};

export default AddBuyingOrderForm;