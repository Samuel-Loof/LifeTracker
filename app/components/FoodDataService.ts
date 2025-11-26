export interface FoodData {
    barcode: string;
    name: string;
    brand: string;
    calories: number; // per 100g
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugars?: number;
    saturatedFat?: number;
    unsaturatedFat?: number;
    cholesterol?: number; // mg per 100g if available
    sodium?: number; // mg per 100g
    potassium?: number; // mg per 100g
    servingSize?: string; // "78 g", "1 cup", etc.
    caloriesPerServing?: number;
    category?: string; // Main category from OpenFoodFacts
    categories?: string[]; // All categories from OpenFoodFacts
}

// User-Agent required by OpenFoodFacts API
const USER_AGENT = 'LifeTrack3r/1.0 (learning.project@gmail.com)';

export const getFoodData = async (barcode: string): Promise<FoodData | null> => {
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
            {
                headers: {
                    'User-Agent': USER_AGENT // Required to avoid being blocked
                }
            }
        );
        
        // Parse the JSON response
        const data = await response.json();
        
        // Check if product exists (status 0 = not found, 1 = found)
        if (data.status === 0) {
            console.log('Product not found for barcode:', barcode);
            return null;
        }

        // Extract nutrition data from the complex API response
        const product = data.product;
        const nutriments = product.nutriments || {}; // Handle case where nutrition data is missing
        
        // Extract categories
        const categories: string[] = [];
        if (product.categories) categories.push(product.categories);
        if (product.categories_en) categories.push(product.categories_en);
        if (product.categories_tags && Array.isArray(product.categories_tags)) {
            categories.push(...product.categories_tags);
        }
        if (product.categories_hierarchy && Array.isArray(product.categories_hierarchy)) {
            categories.push(...product.categories_hierarchy);
        }
        
        const foodData: FoodData = {
        barcode,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || 'Unknown Brand',
        calories: nutriments.energy ? Math.round(nutriments.energy * 0.239) : 0,
        protein: nutriments.proteins_100g || 0,
        carbs: nutriments.carbohydrates_100g || 0,
        fat: nutriments.fat_100g || 0,
        fiber: nutriments.fiber_100g || nutriments['fiber_100g'] || 0,
        sugars: nutriments.sugars_100g || 0,
        saturatedFat: nutriments['saturated-fat_100g'] || nutriments.saturated_fat_100g || 0,
        unsaturatedFat: (nutriments.fat_100g || 0) - (nutriments['saturated-fat_100g'] || 0),
        cholesterol: nutriments.cholesterol_100g || 0,
        sodium: nutriments.sodium_100g ? Math.round(nutriments.sodium_100g * 1000) : 0, // g -> mg
        potassium: nutriments.potassium_100g ? Math.round(nutriments.potassium_100g * 1000) : 0,
        servingSize: product.serving_size || undefined,
        caloriesPerServing: nutriments.energy_kcal_serving || undefined,
        category: product.categories || product.categories_en || undefined,
        categories: categories.length > 0 ? categories : undefined,
    };

    // Debug logging for micronutrients
    console.log('Food data micronutrients:', {
        fiber: foodData.fiber,
        sugars: foodData.sugars,
        saturatedFat: foodData.saturatedFat,
        unsaturatedFat: foodData.unsaturatedFat,
        cholesterol: foodData.cholesterol,
        sodium: foodData.sodium,
        potassium: foodData.potassium
    });

    return foodData;

    } catch (error) {
        // Handle network errors, parsing errors, etc.
        console.error('Error fetching food data:', error);
        return null;
    }
};

// Helper function to validate barcode format
export const isValidBarcode = (barcode: string): boolean => {
    // Remove any non-digit characters and check length
    const cleanBarcode = barcode.replace(/[^0-9]/g, '');
    return cleanBarcode.length >= 8 && cleanBarcode.length <= 13;
};

export const searchFoodByName = async (query: string): Promise<FoodData[]> => {
    try {
      // OpenFoodFacts search endpoint
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20`,
        {
          headers: {
            'User-Agent': USER_AGENT
          }
        }
      );

      const data = await response.json();

      // Check if we got results
      if (!data.products || data.products.length === 0) {
        console.log('No products found for query:', query);
        return [];
      }

      // Convert API results to our FoodData format
      return data.products.map((product: any) => {
        const nutriments = product.nutriments || {};
        
        // Extract categories
        const categories: string[] = [];
        if (product.categories) categories.push(product.categories);
        if (product.categories_en) categories.push(product.categories_en);
        if (product.categories_tags && Array.isArray(product.categories_tags)) {
            categories.push(...product.categories_tags);
        }
        if (product.categories_hierarchy && Array.isArray(product.categories_hierarchy)) {
            categories.push(...product.categories_hierarchy);
        }
        
        return {
            barcode: product.code || '',
        name: product.product_name || 'Unknown Product',
        brand: product.brands || 'Unknown Brand',
        calories: nutriments.energy ? Math.round(nutriments.energy * 0.239) : 0,
        protein: nutriments.proteins_100g || 0,
        carbs: nutriments.carbohydrates_100g || 0,
        fat: nutriments.fat_100g || 0,
        fiber: nutriments.fiber_100g || 0,
        sugars: nutriments.sugars_100g || 0,
        saturatedFat: nutriments['saturated-fat_100g'] || nutriments.saturated_fat_100g || 0,
        unsaturatedFat: (nutriments.fat_100g || 0) - (nutriments['saturated-fat_100g'] || 0),
        cholesterol: nutriments.cholesterol_100g || 0,
        sodium: nutriments.sodium_100g ? Math.round(nutriments.sodium_100g * 1000) : 0,
        potassium: nutriments.potassium_100g ? Math.round(nutriments.potassium_100g * 1000) : 0,
        servingSize: product.serving_size || undefined,
        caloriesPerServing: nutriments.energy_kcal_serving || undefined,
        category: product.categories || product.categories_en || undefined,
        categories: categories.length > 0 ? categories : undefined,
        };
      }) .filter((food: FoodData) => food.name  !== 'Unknown Product'); // Filter out invalid results
    } catch (error) {
        console.error('Error searching food by name:', error);
        return [];
    }
};