
export type Category = 'Digital Wellbeing' | 'Productivity' | 'E-commerce Tools';

export interface Extension {
  id: string;
  name: string;
  description: string;
  category: Category;
  price: string;
  isFree: boolean;
  storeUrl: string;
}
