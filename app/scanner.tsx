import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import BarcodeScanner from "./components/BarcodeScanner";
import { getFoodData, FoodData } from "./components/FoodDataService"; // Import our food service
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealParam = params.meal;
  const [resetKey, setResetKey] = useState(0);

  //Function to handle when a barcode is scanned and process the food data
  const handleFoodScanned = async (barcode: string) => {
    console.log("Processing barcode:", barcode);

    try {
      // Call our API service to get food information
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
                router.push("/components/screens/ManualFoodEntry");
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
        // Pass micronutrients
        fiber: (foodData.fiber || 0).toString(),
        sugars: (foodData.sugars || 0).toString(),
        saturatedFat: (foodData.saturatedFat || 0).toString(),
        unsaturatedFat: (foodData.unsaturatedFat || 0).toString(),
        cholesterol: (foodData.cholesterol || 0).toString(),
        sodium: (foodData.sodium || 0).toString(),
        potassium: (foodData.potassium || 0).toString(),
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
      <Text style={styles.title}>Scan Food Barcode</Text>
      {/* Pass our food processing function to the BarcodeScanner */}
      <BarcodeScanner onFoodScanned={handleFoodScanned} resetKey={resetKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    margin: 20,
    color: "#2c3e50",
  },
});
