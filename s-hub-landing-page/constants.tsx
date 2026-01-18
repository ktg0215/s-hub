
import React from 'react';
import { ShieldCheck, LayoutGrid, Package } from 'lucide-react';
import { Category, Product, TrustStat } from './types';

export const TRUST_STATS: TrustStat[] = [
  {
    icon: <ShieldCheck className="w-5 h-5 text-green-500" />,
    label: "Available on Chrome Web Store"
  },
  {
    icon: <LayoutGrid className="w-5 h-5 text-blue-500" />,
    label: "Available on Edge Add-ons"
  },
  {
    icon: <Package className="w-5 h-5 text-purple-500" />,
    label: "5 Extensions Released"
  }
];

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Shorts Killer',
    iconUrl: 'https://picsum.photos/seed/shorts/128/128',
    category: Category.WELLBEING,
    rating: 5.0,
    reviewCount: 8,
    description: 'Hide YouTube Shorts completely to reclaim your attention and focus.',
    priceType: 'Free',
    ctaLink: '#'
  },
  {
    id: '2',
    name: 'X Detox',
    iconUrl: 'https://picsum.photos/seed/xdtox/128/128',
    category: Category.WELLBEING,
    rating: 4.8,
    reviewCount: 15,
    description: 'Clean up your X/Twitter experience by removing ads and unwanted noise.',
    priceType: 'Free',
    priceLabel: 'Pro $3',
    ctaLink: '#'
  },
  {
    id: '3',
    name: 'PromptStash',
    iconUrl: 'https://picsum.photos/seed/prompt/128/128',
    category: Category.PRODUCTIVITY,
    rating: 4.9,
    reviewCount: 12,
    description: 'Save and manage your AI prompts for maximum efficiency across all platforms.',
    priceType: 'Paid',
    priceLabel: '$5 One-time',
    ctaLink: '#'
  },
  {
    id: '4',
    name: 'Rakuten Sellers Analytics',
    iconUrl: 'https://picsum.photos/seed/rakuten/128/128',
    category: Category.ECOMMERCE,
    rating: 4.7,
    reviewCount: 22,
    description: 'Powerful analytics tool specifically designed for Rakuten marketplace sellers.',
    priceType: 'Paid',
    priceLabel: '$12.99/mo',
    ctaLink: '#'
  },
  {
    id: '5',
    name: 'Arbitra',
    iconUrl: 'https://picsum.photos/seed/arbitra/128/128',
    category: Category.ECOMMERCE,
    rating: 0,
    reviewCount: 0,
    description: 'Price comparison across marketplaces to find the best arbitrage deals. $9.99/mo or $34 lifetime.',
    priceType: 'Coming Soon',
    ctaLink: '#'
  }
];
