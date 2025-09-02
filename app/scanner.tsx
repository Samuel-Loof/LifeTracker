import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import BarcodeScanner from "./components/BarcodeScanner";
import { getFoodData, FoodData } from "./components/FoodDataService"; // Import our food service
import { useRouter } from "expo-router";

export default function ScannerScreen() {
  const router = useRouter();

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
        router.push("/components/screens/ManualFoodEntry"); // Create this screen later
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
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Food Barcode</Text>
      {/* Pass our food processing function to the BarcodeScanner */}
      <BarcodeScanner onFoodScanned={handleFoodScanned} />
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
