// app/edit/[id]/page.tsx
import { supabase } from '@/lib/supabase';
import ProductForm from '@/components/ProductForm';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single();

  return <ProductForm initialProduct={data || undefined} />;
}