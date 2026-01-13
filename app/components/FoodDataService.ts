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
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    servingSize?: string;
    caloriesPerServing?: number;
    category?: string; // Main category from OpenFoodFacts
    categories?: string[];
}

const USER_AGENT = 'LifeTrack3r/1.0 (learning.project@gmail.com)';

export const getFoodData = async (barcode: string): Promise<FoodData | null> => {
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
            {
                headers: {
                    'User-Agent': USER_AGENT
                }
            }
        );
        
        const data = await response.json();
        
        if (data.status === 0) {
            console.log('Product not found for barcode:', barcode);
            return null;
        }

        const product = data.product;
        const nutriments = product.nutriments || {};
        
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
        sodium: nutriments.sodium_100g ? Math.round(nutriments.sodium_100g * 1000) : 0,
        potassium: nutriments.potassium_100g ? Math.round(nutriments.potassium_100g * 1000) : 0,
        servingSize: product.serving_size || undefined,
        caloriesPerServing: nutriments.energy_kcal_serving || undefined,
        category: product.categories || product.categories_en || undefined,
        categories: categories.length > 0 ? categories : undefined,
    };

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
        console.error('Error fetching food data:', error);
        return null;
    }
};

export const isValidBarcode = (barcode: string): boolean => {
    const cleanBarcode = barcode.replace(/[^0-9]/g, '');
    return cleanBarcode.length >= 8 && cleanBarcode.length <= 13;
};

export const searchFoodByName = async (query: string): Promise<FoodData[]> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`,
        {
          headers: {
            'User-Agent': USER_AGENT
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`OpenFoodFacts API returned status ${response.status}`);
        return [];
      }

      const responseText = await response.text();
      
      if (responseText.trim().startsWith('<')) {
        console.warn('OpenFoodFacts API returned HTML instead of JSON, likely rate limited or error page');
        return [];
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        if (responseText.trim().startsWith('<')) {
          console.warn('OpenFoodFacts API returned HTML instead of JSON');
        } else {
          console.warn('Failed to parse response as JSON:', parseError);
        }
        return [];
      }

      // Check if we got results
      if (!data || !data.products || data.products.length === 0) {
        console.log('No products found for query:', query);
        return [];
      }

      console.log(`Found ${data.products.length} products for query: ${query}`);

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
    } catch (error: any) {
        // Handle different error types
        if (error.name === 'AbortError') {
          console.warn('Search request timed out');
        } else if (error instanceof SyntaxError) {
          console.warn('Failed to parse JSON response from OpenFoodFacts API');
        } else {
          console.error('Error searching food by name:', error);
        }
        return [];
    }
};