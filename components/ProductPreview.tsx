'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Carousel } from 'react-responsive-carousel';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

const ProductPreview: React.FC = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Validate product ID from URL params
        const productId = params.id ? Number(params.id) : null;
        
        if (!productId) {
          throw new Error('Invalid product ID');
        }

        // Fetch product from Supabase
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error || !data) {
          throw error || new Error('Product not found');
        }

        setProduct(data);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id]);

  const handleAddToCart = () => {
    // Placeholder for future cart functionality
    alert('Add to cart functionality to be implemented');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          {error}
        </h2>
        <button 
          onClick={() => router.push('/')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Back to Products
        </button>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      {/* Navigation Back Button */}
      <button 
        onClick={() => router.push('/')} 
        className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Image Carousel */}
      <div className="w-full">
        {product.images.length > 0 ? (
          <Carousel 
            showArrows 
            infiniteLoop 
            showThumbs={false}
            selectedItem={selectedImageIndex}
            onChange={(index) => setSelectedImageIndex(index)}
          >
            {product.images.map((imageUrl, index) => (
              <div key={index} className="h-[500px] flex items-center justify-center">
                <img 
                  src={imageUrl} 
                  alt={`${product.name} - Image ${index + 1}`} 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </Carousel>
        ) : (
          <div className="h-[500px] bg-gray-200 flex items-center justify-center">
            <p>No images available</p>
          </div>
        )}

        {/* Image Thumbnails */}
        {product.images.length > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {product.images.map((imageUrl, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`w-16 h-16 border-2 ${
                  index === selectedImageIndex 
                    ? 'border-blue-500' 
                    : 'border-transparent'
                }`}
              >
                <img 
                  src={imageUrl} 
                  alt={`Thumbnail ${index + 1}`} 
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        
        <div className="text-2xl font-semibold text-blue-600">
          ${product.price.toFixed(2)}
        </div>

        <p className="text-gray-700 leading-relaxed">
          {product.description}
        </p>

        <div className="flex space-x-4">
          <button 
            onClick={handleAddToCart}
            className="flex items-center justify-center w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition"
          >
            <ShoppingCart className="mr-2" />
            Add to Cart
          </button>
        </div>

        {product.created_at && (
          <div className="text-sm text-gray-500">
            Listed on: {new Date(product.created_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPreview;