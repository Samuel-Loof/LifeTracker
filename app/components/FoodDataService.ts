export interface FoodData {
    barcode: string;
    name: string;
    brand: string;
    calories: number; // per 100g
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string; // "78 g", "1 cup", etc.
    caloriesPerServing?: number;
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
        
        return {
        barcode,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || 'Unknown Brand',
        calories: nutriments.energy_kcal_100g || 0,
        protein: nutriments.proteins_100g || 0,
        carbs: nutriments.carbohydrates_100g || 0,
        fat: nutriments.fat_100g || 0,
        // NEW - Extract serving data
        servingSize: product.serving_size || undefined,
        caloriesPerServing: nutriments.energy_kcal_serving || undefined,
    };

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