// src/components/AddBuyingOrderForm.tsx

import React, { useState } from 'react';
import { db } from '../firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { BuyingOrder, Product } from './types';

interface AddBuyingOrderFormProps {
  products: Product[];
  onOrderAdded: () => void;
}

const AddBuyingOrderForm: React.FC<AddBuyingOrderFormProps> = ({ products, onOrderAdded }) => {
  const [formData, setFormData] = useState<Partial<BuyingOrder>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Convert "koebtAntal" to a number if it is in the input field
    setFormData({
      ...formData,
      [name]: name === 'koebtAntal' ? (value ? parseInt(value, 10) : undefined) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: (keyof BuyingOrder)[] = [
      'leverandor',
      'ordreDato',
      'ordreNr',
      'style',
      'farve',
      'koebtAntal',
      'etaDato',
      'saeson',
      'productId',
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill in the ${field} field.`);
        return;
      }
    }

    try {
      const etaDato = formData.etaDato as Date;
      const ordreDato = formData.ordreDato as Date;

      const newOrder: BuyingOrder = {
        leverandor: formData.leverandor as string,
        ordreDato,
        ordreNr: formData.ordreNr as string,
        style: formData.style as string,
        farve: formData.farve as string,
        koebtAntal: formData.koebtAntal as number,
        etaDato,
        saeson: formData.saeson as string,
        productId: formData.productId as string,
        leveringsuge: 0, // Default delivery week
        bekraeftet: false, // Default confirmation status
        leveret: 'Nej', // Default delivery status
        kommentarer: [], // Default empty comments array
      };

      const orderWithTimestamps = {
        ...newOrder,
        ordreDato: Timestamp.fromDate(newOrder.ordreDato),
        etaDato: Timestamp.fromDate(newOrder.etaDato),
      };

      await addDoc(collection(db, 'buyingOrders'), orderWithTimestamps);
      setFormData({});
      onOrderAdded();

      alert('Ordre tilføjet succesfuldt.');
    } catch (error) {
      console.error('Error adding order:', error);
      alert('Der opstod en fejl under tilføjelse af ordren.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-8">
      <div>
        <label className="block text-sm font-medium text-gray-700">Leverandør</label>
        <input
          type="text"
          name="leverandor"
          value={formData.leverandor || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Ordre Dato</label>
        <input
          type="date"
          name="ordreDato"
          value={
            formData.ordreDato
              ? formData.ordreDato.toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              ordreDato: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Ordre Nr</label>
        <input
          type="text"
          name="ordreNr"
          value={formData.ordreNr || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Style</label>
        <input
          type="text"
          name="style"
          value={formData.style || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Farve</label>
        <input
          type="text"
          name="farve"
          value={formData.farve || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Købt Antal</label>
        <input
          type="number"
          name="koebtAntal"
          value={String(formData.koebtAntal ?? '')} // Ensure it's a string for the input
          onChange={handleChange}
          required
          min="1"
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">ETA Dato</label>
        <input
          type="date"
          name="etaDato"
          value={
            formData.etaDato
              ? formData.etaDato.toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            setFormData({
              ...formData,
              etaDato: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Sæson</label>
        <input
          type="text"
          name="saeson"
          value={formData.saeson || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Produkt</label>
        <select
          name="productId"
          value={formData.productId || ''}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
        >
          <option value="">Vælg et produkt...</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.productName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <button type="submit" className="w-full bg-green-500 text-white px-4 py-2 rounded-md">
          Tilføj Ordre
        </button>
      </div>
    </form>
  );
};

export default AddBuyingOrderForm;