'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { X, ZoomIn } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

interface ProductFormProps {
  initialProduct?: Product;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div 
        ref={modalRef}
        className="relative max-w-[90%] max-h-[90%] overflow-hidden"
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-60 bg-white/50 rounded-full p-1"
        >
          <X className="text-black" size={24} />
        </button>
        <img 
          src={imageUrl} 
          alt="Enlarged preview" 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
};

const ProductForm: React.FC<ProductFormProps> = ({ initialProduct }) => {
  const router = useRouter();
  const [name, setName] = useState(initialProduct?.name || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [price, setPrice] = useState(initialProduct?.price || 0);
  
  // Track new image files to upload with their preview URLs
  const [newImageFiles, setNewImageFiles] = useState<{
    file: File, 
    preview: string
  }[]>([]);
  
  // Track existing images
  const [existingImages, setExistingImages] = useState<string[]>(initialProduct?.images || []);
  
  // Track images to be deleted
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);

  // State for image preview modal
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Dropzone hook
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Create previews for new files
    const newImagePreviews = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    // Add new files with previews to the list
    setNewImageFiles(prev => [...prev, ...newImagePreviews]);
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.jpg', '.webp']
    },
    multiple: true
  });

  const removeNewImage = (indexToRemove: number) => {
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(newImageFiles[indexToRemove].preview);

    // Remove the image from new images
    const newImages = newImageFiles.filter((_, index) => index !== indexToRemove);
    setNewImageFiles(newImages);
  };

  const removeExistingImage = (indexToRemove: number) => {
    const imageToRemove = existingImages[indexToRemove];
    
    // Mark this image for deletion
    setImagesToDelete(prev => [...prev, imageToRemove]);

    // Remove from existing images
    const newImages = existingImages.filter((_, index) => index !== indexToRemove);
    setExistingImages(newImages);
  };

  const uploadImages = async () => {
    const uploadPromises = newImageFiles.map(async ({ file }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    });

    const uploadedUrls = (await Promise.all(uploadPromises))
      .filter((url): url is string => url !== null);

    return uploadedUrls;
  };

  const deleteOldImages = async () => {
    const deletePromises = imagesToDelete.map(async (imageUrl) => {
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error } = await supabase.storage
          .from('product-images')
          .remove([`products/${fileName}`]);
        
        if (error) {
          console.error('Delete error:', error);
        }
      }
    });

    await Promise.all(deletePromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, delete marked images
      await deleteOldImages();

      // Then upload new images
      const newUploadedUrls = await uploadImages();

      // Combine existing images with newly uploaded ones
      const finalImages = [...existingImages, ...newUploadedUrls];

      const productData: Omit<Product, 'id'> = {
        name,
        description,
        price,
        images: finalImages
      };

      if (initialProduct?.id) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({...productData})
          .eq('id', initialProduct.id);

        if (error){
          console.log('Error updating product:', error);
          throw error;
        }
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
      }

      router.push('/');
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      // Clean up object URLs
      newImageFiles.forEach(image => URL.revokeObjectURL(image.preview));
      
      setIsLoading(false);
      // Reset image-related states
      setNewImageFiles([]);
      setImagesToDelete([]);
    }
  };

  return (
    <>
      {/* Image Preview Modal */}
      {selectedImageUrl && (
        <ImageModal 
          imageUrl={selectedImageUrl} 
          onClose={() => setSelectedImageUrl(null)} 
        />
      )}

      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl mb-4">
          {initialProduct ? 'Edit Product' : 'Create Product'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full p-2 border rounded"
            required
          />

          {/* Dropzone Section */}
          <div 
            {...getRootProps()} 
            className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              isDragActive ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 border-gray-300'
            }`}
          >
            <input {...getInputProps()} disabled={isLoading} />
            {isDragActive ? (
              <p className="text-blue-500">Drop the files here ...</p>
            ) : (
              <p className="text-gray-600">
                Drag 'n' drop some files here, or click to select files
              </p>
            )}
          </div>
          
          {/* Image Previews */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {/* Existing Images Preview */}
            {existingImages.map((url, index) => (
              <div 
                key={url} 
                className="relative group cursor-pointer"
                onClick={() => setSelectedImageUrl(url)}
              >
                <img 
                  src={url} 
                  alt={`Product ${index}`} 
                  className="w-full h-24 object-cover rounded transition-opacity group-hover:opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="text-white" size={24} />
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExistingImage(index);
                  }}
                  className="absolute top-0 right-0 bg-slate-800/75 text-white p-1 rounded-full text-xs px-2"
                  disabled={isLoading}
                >
                  X
                </button>
              </div>
            ))}

            {/* New Images Preview */}
            {newImageFiles.map(({ preview }, index) => (
              <div 
                key={preview} 
                className="relative group cursor-pointer"
                onClick={() => setSelectedImageUrl(preview)}
              >
                <img 
                  src={preview} 
                  alt={`New Product ${index}`} 
                  className="w-full h-24 object-cover rounded transition-opacity group-hover:opacity-70"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="text-white" size={24} />
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNewImage(index);
                  }}
                  className="absolute top-0 right-0 bg-slate-800/75 text-white p-1 rounded-full text-xs px-2"
                  disabled={isLoading}
                >
                  X
                </button>
              </div>
            ))}
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-500 text-white p-2 rounded"
            disabled={isLoading}
          >
            {isLoading 
              ? 'Processing...' 
              : (initialProduct ? 'Update Product' : 'Create Product')
            }
          </button>
        </form>
      </div>
    </>
  );
};

export default ProductForm;