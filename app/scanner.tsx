import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import BarcodeScanner from "./components/BarcodeScanner";
import { getFoodData, FoodData } from "./components/FoodDataService";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AICameraScreen from "./components/screens/AICameraScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ScannerMode = "barcode" | "ai";

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealParam = params.meal;
  const modeParam = params.mode; // Check if we're in recipe mode
  const [resetKey, setResetKey] = useState(0);
  const [scannerMode, setScannerMode] = useState<ScannerMode>("barcode"); // Default to barcode

  // Load saved scanner mode preference
  useEffect(() => {
    const loadScannerMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("scannerMode");
        if (savedMode === "barcode" || savedMode === "ai") {
          setScannerMode(savedMode);
        }
      } catch (error) {
        console.error("Error loading scanner mode:", error);
      }
    };
    loadScannerMode();
  }, []);

  // Save scanner mode preference when it changes
  const handleModeChange = async (mode: ScannerMode) => {
    setScannerMode(mode);
    try {
      await AsyncStorage.setItem("scannerMode", mode);
    } catch (error) {
      console.error("Error saving scanner mode:", error);
    }
  };

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
      {/* Mode switcher */}
      <View style={styles.modeSwitcher}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            scannerMode === "barcode" && styles.modeButtonActive,
          ]}
          onPress={() => handleModeChange("barcode")}
        >
          <Text
            style={[
              styles.modeButtonText,
              scannerMode === "barcode" && styles.modeButtonTextActive,
            ]}
          >
            📷 Barcode
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            scannerMode === "ai" && styles.modeButtonActive,
          ]}
          onPress={() => handleModeChange("ai")}
        >
          <Text
            style={[
              styles.modeButtonText,
              scannerMode === "ai" && styles.modeButtonTextActive,
            ]}
          >
            🤖 AI Scanner
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scanner content */}
      {scannerMode === "barcode" ? (
        <>
          <Text style={styles.title}>Scan Food Barcode</Text>
          <BarcodeScanner onFoodScanned={handleFoodScanned} resetKey={resetKey} />
        </>
      ) : (
        <AICameraScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    margin: 20,
    color: "#2c3e50",
  },
  tempText: {
    fontSize: 16,
    textAlign: "center",
    margin: 20,
    color: "#7f8c8d",
  },
});
