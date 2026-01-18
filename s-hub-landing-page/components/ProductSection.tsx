
import React, { useState } from 'react';
import { PRODUCTS } from '../constants';
import { Category } from '../types';
import ProductCard from './ProductCard';

const ProductSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>(Category.ALL);

  const categories = Object.values(Category);

  const filteredProducts = PRODUCTS.filter(p => 
    activeCategory === Category.ALL || p.category === activeCategory
  );

  return (
    <section id="products" className="py-24 px-6 max-w-7xl mx-auto">
      {/* Product Hunt Placeholder */}
      <div className="flex justify-center mb-16 opacity-40 hover:opacity-100 transition-opacity">
        <div className="px-6 py-2 rounded-full border border-dashed border-zinc-800 flex items-center space-x-3 text-sm text-zinc-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-orange-600"></span>
          <span>Featured on Product Hunt (Coming Soon)</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-white">Our Extension Lineup</h2>
          <p className="text-zinc-400 text-lg">
            High-utility tools built to solve specific digital friction. Lightweight, private, and powerful.
          </p>
        </div>
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20' 
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
          <p className="text-zinc-500 font-medium italic">More tools are being developed in this category...</p>
        </div>
      )}
    </section>
  );
};

export default ProductSection;
