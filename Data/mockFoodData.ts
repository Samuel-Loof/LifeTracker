export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string;
}

export const mockFoodDatabase: FoodItem[] = [
  {
    id: '1',
    name: 'Apple',
    calories: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
    barcode: '123456789012',
  },
  {
    id: '2',
    name: 'Banana',
    calories: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    barcode: '987654321098',
  },
  {
    id: '3',
    name: 'Greek Yogurt',
    calories: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    barcode: '456789123045',
  },
];

export const findFoodByBarcode = (barcode: string): FoodItem | undefined => {
  return mockFoodDatabase.find(item => item.barcode === barcode);
};