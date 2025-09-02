import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const SERVING_UNITS = [
  { label: "Serving", value: "serving" },
  { label: "Gram (g)", value: "gram" },
  { label: "Tablespoon", value: "tablespoon" },
  { label: "Cup", value: "cup" },
  { label: "Piece", value: "piece" },
];

export default function FoodDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // state variables
  const [selectedUnit, setSelectedUnit] = useState("serving");
  const [amount, setAmount] = useState("1");
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const handleUnitSelect = (unitValue: string) => {
    setSelectedUnit(unitValue);
    setShowUnitPicker(false);
  };

  // Calculate nutrition based on amount and unit
  const calculateNutrition = () => {
    const baseCalories = parseFloat(params.calories as string) || 0;
    const baseProtein = parseFloat(params.protein as string) || 0;
    const baseCarbs = parseFloat(params.carbs as string) || 0;
    const baseFat = parseFloat(params.fat as string) || 0;
    const currentAmount = parseFloat(amount) || 1;

    let conversionFactor = 1;

    switch (selectedUnit) {
      case "gram":
        // Base values are per 100g, so for X grams: divide by 100 then multiply by X
        conversionFactor = currentAmount / 100;
        break;
      case "serving":
        console.log("Raw servingSize param:", params.servingSize);
        const servingSizeStr = String(params.servingSize || "100g");
        // Extract just the numbers from "175 g" or "175g"
        const numbers = servingSizeStr.match(/\d+/);
        const servingSizeGrams = numbers ? parseInt(numbers[0]) : 100;
        console.log("Parsed servingSizeGrams:", servingSizeGrams);
        conversionFactor = (currentAmount * servingSizeGrams) / 100;
        break;
      case "tablespoon":
        // Assume 1 tablespoon = 15g
        conversionFactor = (currentAmount * 15) / 100;
        break;
      case "cup":
        // Assume 1 cup = 240g (varies by food type)
        conversionFactor = (currentAmount * 240) / 100;
        break;
      default:
        conversionFactor = currentAmount;
    }

    return {
      calories: Math.round(baseCalories * conversionFactor),
      protein: (baseProtein * conversionFactor).toFixed(1),
      carbs: (baseCarbs * conversionFactor).toFixed(1),
      fat: (baseFat * conversionFactor).toFixed(1),
    };
  };

  const currentNutrition = calculateNutrition(); // Calculate the current values

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{params.name}</Text>
      <Text style={styles.brand}>{params.brand}</Text>

      {/* Serving selector section (INSIDE the return) */}
      <View style={styles.servingContainer}>
        <Text style={styles.label}>Amount</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="1"
          />

          <TouchableOpacity
            style={styles.unitButton}
            onPress={() => setShowUnitPicker(true)}
          >
            <Text style={styles.unitText}>
              {SERVING_UNITS.find((u) => u.value === selectedUnit)?.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current nutrition display */}
      <View style={styles.nutritionContainer}>
        <Text style={styles.nutritionTitle}>
          Nutrition ({amount} {selectedUnit})
        </Text>
        <Text>Calories: {currentNutrition.calories}</Text>
        <Text>Protein: {currentNutrition.protein}g</Text>
        <Text>Carbs: {currentNutrition.carbs}g</Text>
        <Text>Fat: {currentNutrition.fat}g</Text>
      </View>

      {/* TODO: Add nutrition circles here */}

      {/* Track button */}
      <TouchableOpacity
        style={styles.trackButton}
        onPress={() => {
          console.log("Tracking:", {
            food: params.name,
            amount: amount,
            unit: selectedUnit,
            nutrition: currentNutrition,
          });
          router.push("/components/screens/DailyIntakeScreen");
        }}
      >
        <Text style={styles.trackButtonText}>TRACK</Text>
      </TouchableOpacity>

      {/* Unit picker modal (INSIDE the return, at the end) */}
      <Modal visible={showUnitPicker} transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            {SERVING_UNITS.map((unit) => (
              <TouchableOpacity
                key={unit.value}
                style={styles.optionButton}
                onPress={() => handleUnitSelect(unit.value)}
              >
                <Text style={styles.optionText}>{unit.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  brand: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  // Serving selector
  servingContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#2c3e50",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
  },
  unitButton: {
    flex: 2,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  unitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Nutrition display
  nutritionContainer: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#2c3e50",
  },
  // Track button
  trackButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: "auto",
  },
  trackButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxHeight: "50%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  optionButton: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: {
    fontSize: 16,
    textAlign: "center",
  },
});
