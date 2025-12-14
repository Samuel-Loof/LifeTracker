import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import BarcodeScanner from "./components/BarcodeScanner";
import { getFoodData, FoodData } from "./components/FoodDataService";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useFood } from "./components/FoodContext";

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealParam = params.meal;
  const modeParam = params.mode; // Check if we're in recipe mode
  const [resetKey, setResetKey] = useState(0);
  const { findFoodByBarcode } = useFood();

  //Function to handle when a barcode is scanned and process the food data
  const handleFoodScanned = async (barcode: string) => {
    console.log("Processing barcode:", barcode);

    try {
      // First check if we already have this food in local storage (manually added)
      const existingFood = findFoodByBarcode(barcode);
      if (existingFood) {
        // Food found locally - navigate directly to FoodDetailsScreen
        console.log("Food found in local storage:", existingFood);
        const foodData: FoodData = {
          barcode: existingFood.barcode || "",
          name: existingFood.name,
          brand: existingFood.brand,
          calories: existingFood.nutrition.calories,
          protein: existingFood.nutrition.protein,
          carbs: existingFood.nutrition.carbs,
          fat: existingFood.nutrition.fat,
          fiber: existingFood.nutrition.fiber,
          sugars: existingFood.nutrition.sugars,
          saturatedFat: existingFood.nutrition.saturatedFat,
          sodium: existingFood.nutrition.sodium,
          potassium: existingFood.nutrition.potassium,
        };
        addFoodToIntake(foodData);
        return;
      }

      // If not found locally, check API
      const foodData: FoodData | null = await getFoodData(barcode);

      if (foodData) {
        // Food found - navigate directly to FoodDetailsScreen
        console.log("Food found:", foodData);
        addFoodToIntake(foodData); // Direct navigation, no alert
      } else {
        // Food not found - navigate directly to manual entry screen
        console.log("Food not found in database");
        Alert.alert(
          "Product not found",
          "This product isn't in our database yet. Would you like to add it manually?",
          [
            {
              text: "No",
              style: "cancel",
              onPress: () => {
                console.log("User chose not to add manually");
                // Reset scanner UI (no extra button lingering)
                setResetKey((k) => k + 1);
              },
            },
            {
              text: "Yes",
              onPress: () => {
                console.log("User chose to add manually");
                router.push({
                  pathname: "/manual",
                  params: {
                    barcode: barcode,
                    meal: mealParam || "breakfast",
                    mode: modeParam || undefined,
                  },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      // Handle network errors - could show a brief toast or navigate to error screen
      console.error("Error processing barcode:", error);
      // For now, just log it - can improve error handling later
    }
  };

  //Function to save food to today's intake
  const addFoodToIntake = async (foodData: FoodData) => {
    console.log("Navigating to food details with:", foodData);

    // Navigate to FoodDetails.tsx
    const categoriesParam = foodData.categories
      ? foodData.categories.join(",")
      : "";

    router.push({
      pathname: "/components/screens/FoodDetailsScreen",
      params: {
        name: foodData.name,
        brand: foodData.brand,
        calories: foodData.calories.toString(),
        protein: foodData.protein.toString(),
        carbs: foodData.carbs.toString(),
        fat: foodData.fat.toString(),
        barcode: foodData.barcode,
        servingSize: foodData.servingSize || "100g",
        meal: mealParam || "breakfast",
        // Pass a flag to indicate this came from scanner
        fromScanner: "true",
        // Pass the meal param so we can navigate directly to Daily Intake after tracking
        targetMeal: mealParam || "breakfast",
        // Pass context about the navigation flow
        fromAddFood: "true",
        // Pass recipe mode if we're in recipe mode
        mode: modeParam || undefined,
        // Pass micronutrients
        fiber: (foodData.fiber || 0).toString(),
        sugars: (foodData.sugars || 0).toString(),
        saturatedFat: (foodData.saturatedFat || 0).toString(),
        unsaturatedFat: (foodData.unsaturatedFat || 0).toString(),
        cholesterol: (foodData.cholesterol || 0).toString(),
        sodium: (foodData.sodium || 0).toString(),
        potassium: (foodData.potassium || 0).toString(),
        // Pass category information for protein quality detection
        category: foodData.category || "",
        categories: categoriesParam,
      },
    });
  };

  // Reset scanner when focusing (in case user navigated back)
  useFocusEffect(
    React.useCallback(() => {
      // Reset scanner state when screen comes into focus
      setResetKey((k) => k + 1);
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* Scanner content - Only barcode mode available */}
      <BarcodeScanner onFoodScanned={handleFoodScanned} resetKey={resetKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
