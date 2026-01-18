// Fix: Import React to resolve the 'React' namespace for ReactNode
import React from 'react';

export enum Category {
  ALL = 'All',
  WELLBEING = 'Wellbeing',
  PRODUCTIVITY = 'Productivity',
  ECOMMERCE = 'E-Commerce'
}

export interface Product {
  id: string;
  name: string;
  iconUrl: string;
  category: Category;
  rating: number;
  reviewCount: number;
  description: string;
  priceType: 'Free' | 'Paid' | 'Coming Soon';
  priceLabel?: string;
  ctaLink: string;
}

export interface TrustStat {
  icon: React.ReactNode;
  label: string;
}