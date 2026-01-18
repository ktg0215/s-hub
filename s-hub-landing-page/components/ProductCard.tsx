
import React from 'react';
import { Star, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const isComingSoon = product.priceType === 'Coming Soon';

  return (
    <div className={`group relative bg-[#1a1a1a] border border-[#27272a] hover:border-blue-500/50 rounded-xl p-6 transition-all duration-300 flex flex-col h-full hover:-translate-y-1 ${isComingSoon ? 'opacity-70 grayscale-[0.3]' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <img 
          src={product.iconUrl} 
          alt={`${product.name} Icon`} 
          className="w-16 h-16 rounded-xl object-cover bg-zinc-800 shadow-lg"
          loading="lazy"
        />
        {product.reviewCount > 0 && (
          <div className="flex items-center space-x-1 bg-zinc-800/80 px-2 py-1 rounded text-xs font-semibold text-yellow-500">
            <Star className="w-3.5 h-3.5 fill-yellow-500" />
            <span>{product.rating.toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold mb-1 text-white group-hover:text-blue-400 transition-colors">
        {product.name}
      </h3>
      <div className="text-[10px] text-zinc-500 mb-3 uppercase tracking-[0.2em] font-bold">
        {product.category}
      </div>
      
      <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-grow">
        {product.description}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-[#27272a] pt-5">
        <div className="flex flex-col">
          {product.priceType === 'Free' ? (
            <span className="text-[11px] font-black text-green-400 px-2.5 py-1 bg-green-500/10 rounded-md border border-green-500/20 uppercase tracking-wider">
              {product.priceLabel ? `FREE / ${product.priceLabel}` : 'FREE'}
            </span>
          ) : product.priceType === 'Paid' ? (
            <span className="text-[11px] font-black text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded-md border border-blue-500/20 uppercase tracking-wider">
              {product.priceLabel}
            </span>
          ) : (
            <span className="text-[11px] font-black text-zinc-400 px-2.5 py-1 bg-zinc-800 rounded-md border border-zinc-700 uppercase tracking-wider">
              COMING SOON
            </span>
          )}
        </div>

        <button 
          disabled={isComingSoon}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
            isComingSoon 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
              : product.priceType === 'Free'
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-95'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-95'
          }`}
        >
          <span>{isComingSoon ? 'Notify Me' : product.priceType === 'Free' ? 'Get Free' : 'Get Now'}</span>
          {!isComingSoon && <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
