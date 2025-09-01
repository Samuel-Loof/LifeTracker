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

    // Show loading state (optional - you could add a loading indicator here)
    console.log("Fetching food data from OpenFoodFacts...");

    try {
      // Call our API service to get food information
      const foodData: FoodData | null = await getFoodData(barcode);

      if (foodData) {
        // Food was found in the database
        console.log("Food found:", foodData);

        // Show confirmation with food details
        Alert.alert(
          "Food Found!",
          `Name: ${foodData.name}\nBrand: ${
            foodData.brand || "Unknown"
          }\nCalories: ${foodData.calories} per 100g`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Add to Today's Intake",
              onPress: () => addFoodToIntake(foodData), //Function we'll create next
            },
          ]
        );
      } else {
        // NEW - Product not found in OpenFoodFacts database
        console.log("Food not found in database");

        Alert.alert(
          "Product Not Found",
          "This product isn't in our database yet. You can add it manually or try scanning a different product.",
          [
            {
              text: "OK",
              style: "default",
            },
            {
              text: "Add Manually",
              onPress: () => {
                // TODO: Navigate to manual food entry screen
                console.log("Navigate to manual food entry");
              },
            },
          ]
        );
      }
    } catch (error) {
      // Handle any errors (network issues, etc.)
      console.error("Error processing barcode:", error);

      Alert.alert(
        "Error",
        "Failed to fetch food data. Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
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
