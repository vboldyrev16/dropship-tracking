interface Product {
  id: string;
  title: string;
  quantity: number;
  imageUrl?: string | null;
}

interface Props {
  products: Product[];
}

export function ProductList({ products }: Props) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Items in this order</h3>
      <div className="space-y-4">
        {products.map(product => (
          <div key={product.id} className="flex items-center">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-16 h-16 object-cover rounded mr-4"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{product.title}</p>
              <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
