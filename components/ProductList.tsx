'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';
import Link from 'next/link';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDelete = async (productId: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">Product Catalog</h1>
        <Link 
          href="/create" 
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Add New Product
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map(product => (
          <div 
            key={product.id} 
            className="border rounded p-4 flex flex-col"
          >
            {product.images?.[0] && (
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="w-full h-48 object-cover mb-4 rounded"
              />
            )}
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-gray-600 mb-2">{product.description}</p>
            <p className="text-blue-600 font-semibold">${product.price}</p>
            <div className="mt-auto flex justify-between">
              <Link 
                href={`/edit/${product.id}`} 
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Edit
              </Link>
              <button
                onClick={() => product.id && handleDelete(product.id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
              <Link 
                href={`/product/${product.id}`} 
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Preview
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;