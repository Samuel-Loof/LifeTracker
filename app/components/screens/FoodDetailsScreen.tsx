import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFood } from "../FoodContext";

const SERVING_UNITS = [
  { label: "Serving", value: "serving" },
  { label: "Gram (g)", value: "gram" },
  { label: "Tablespoon", value: "tablespoon" },
  { label: "Cup", value: "cup" },
  { label: "Piece", value: "piece" },
];

const MEAL_OPTIONS = [
  { label: "breakfast", value: "breakfast" },
  { label: "lunch", value: "lunch" },
  { label: "dinner", value: "dinner" },
  { label: "snack", value: "snack" },
];

export default function FoodDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addFood } = useFood();

  // state variables
  const [selectedUnit, setSelectedUnit] = useState("serving");
  const [amount, setAmount] = useState("1");
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(
    (params.meal as string) || "breakfast"
  );
  const [showMealPicker, setShowMealPicker] = useState(false);

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
        conversionFactor = currentAmount / 100;
        break;
      case "serving":
        const servingSizeStr = String(params.servingSize || "100g");
        const numbers = servingSizeStr.match(/\d+/);
        const servingSizeGrams = numbers ? parseInt(numbers[0]) : 100;
        conversionFactor = (currentAmount * servingSizeGrams) / 100;
        break;
      case "tablespoon":
        conversionFactor = (currentAmount * 15) / 100;
        break;
      case "cup":
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

  const currentNutrition = calculateNutrition();

  // Placeholder percent values (daily goals not implemented yet)
  const macroPercents = {
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const onTrack = () => {
    const foodItem = {
      id: Date.now().toString(),
      name: params.name as string,
      brand: params.brand as string,
      amount: parseFloat(amount),
      unit: selectedUnit,
      nutrition: {
        calories: currentNutrition.calories,
        protein: parseFloat(currentNutrition.protein),
        carbs: parseFloat(currentNutrition.carbs),
        fat: parseFloat(currentNutrition.fat),
      },
      timestamp: new Date(),
      mealType: selectedMeal,
    };

    addFood(foodItem);
    router.push(`/components/screens/DailyIntakeScreen?meal=${selectedMeal}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title: name (brand) */}
        <Text style={styles.title}>
          {params.name}
          {params.brand ? ` (${params.brand})` : ""}
        </Text>

        {/* Amount + Serving row */}
        <View style={styles.cardRow}>
          <Text style={styles.labelInline}>Amount</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.amountInput, { marginRight: 10 }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="1"
            />
            <TouchableOpacity
              style={styles.unitButton}
              onPress={() => setShowUnitPicker(true)}
            >
              <View style={styles.unitButtonContent}>
                <Text style={styles.unitText}>
                  {SERVING_UNITS.find((u) => u.value === selectedUnit)?.label}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Meal row */}
        <View style={styles.cardRow}>
          <Text style={styles.labelInline}>Meal</Text>
          <TouchableOpacity
            style={styles.mealButton}
            onPress={() => setShowMealPicker(true)}
          >
            <View style={styles.unitButtonContent}>
              <Text style={styles.mealText}>{selectedMeal}</Text>
              <Text style={styles.chevron}>▼</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Calories row */}
        <View style={styles.cardRow}>
          <Text style={styles.labelInline}>Calories</Text>
          <Text style={styles.caloriesText}>{currentNutrition.calories}</Text>
        </View>

        {/* Macro circles row */}
        <View style={styles.cardBlock}>
          <Text style={styles.blockTitle}>This food</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <View style={styles.circle}>
                <Text
                  style={styles.circlePercent}
                >{`${macroPercents.protein}%`}</Text>
              </View>
              <Text style={styles.macroLabel}>Protein</Text>
              <Text
                style={styles.macroGrams}
              >{`${currentNutrition.protein} g`}</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={styles.circle}>
                <Text
                  style={styles.circlePercent}
                >{`${macroPercents.carbs}%`}</Text>
              </View>
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text
                style={styles.macroGrams}
              >{`${currentNutrition.carbs} g`}</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={styles.circle}>
                <Text
                  style={styles.circlePercent}
                >{`${macroPercents.fat}%`}</Text>
              </View>
              <Text style={styles.macroLabel}>Fat</Text>
              <Text
                style={styles.macroGrams}
              >{`${currentNutrition.fat} g`}</Text>
            </View>
          </View>
        </View>

        {/* Food Quality (premium gated) */}
        <View style={styles.cardBlock}>
          <Text style={styles.blockTitle}>Food Quality</Text>
          <View style={styles.premiumWrapper}>
            <View style={styles.premiumOverlay} pointerEvents="none" />
            <View style={styles.qualityContent}>
              <Text style={styles.qualityText}>
                Protein quality details (e.g., leucine content)
              </Text>
              <Text style={styles.qualitySubtext}>Premium feature</Text>
            </View>
          </View>
        </View>

        {/* Nutrition information expanded */}
        <View style={styles.cardBlock}>
          <Text style={styles.blockTitle}>Nutrition information</Text>
          <View style={styles.nutriList}>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Calories</Text>
              <Text style={styles.nutriValue}>{currentNutrition.calories}</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Protein</Text>
              <Text style={styles.nutriValue}>
                {currentNutrition.protein} g
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Carbs</Text>
              <Text style={styles.nutriValue}>{currentNutrition.carbs} g</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Fiber</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Sugars</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Fat</Text>
              <Text style={styles.nutriValue}>{currentNutrition.fat} g</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Saturated fat</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Unsaturated fat</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Cholesterol</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Sodium</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Potassium</Text>
              <Text style={styles.nutriValue}>—</Text>
            </View>
          </View>
        </View>

        {/* Spacer to avoid overlap with bottom button */}
        <View style={{ height: 12 }} />

        {/* Track button */}
        <TouchableOpacity style={styles.trackButton} onPress={onTrack}>
          <Text style={styles.trackButtonText}>TRACK</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Unit picker modal */}
      <Modal visible={showUnitPicker} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowUnitPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Unit</Text>
                  <View style={{ width: 24 }} />
                </View>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Meal picker modal */}
      <Modal visible={showMealPicker} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowMealPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowMealPicker(false)}>
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Meal</Text>
                  <View style={{ width: 24 }} />
                </View>
                {MEAL_OPTIONS.map((meal) => (
                  <TouchableOpacity
                    key={meal.value}
                    style={styles.optionButton}
                    onPress={() => {
                      setSelectedMeal(meal.value);
                      setShowMealPicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{meal.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#2c3e50",
  },
  // Card-ish rows
  cardRow: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  labelInline: {
    fontSize: 13,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  caloriesText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  // Inputs and selectors
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  unitButton: {
    flex: 1.4,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  unitButtonContent: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  unitText: {
    color: "#2c3e50",
    fontSize: 16,
    fontWeight: "600",
  },
  chevron: {
    color: "#7f8c8d",
    fontSize: 14,
  },
  mealButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mealText: {
    color: "#2c3e50",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  // Card block
  cardBlock: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#2c3e50",
  },
  // Macro circles
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
    borderColor: "#e6eef4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  circlePercent: {
    fontSize: 14,
    color: "#2c3e50",
    fontWeight: "600",
  },
  macroLabel: {
    fontSize: 13,
    color: "#7f8c8d",
  },
  macroGrams: {
    fontSize: 13,
    color: "#2c3e50",
    fontWeight: "600",
  },
  // Premium gate
  premiumWrapper: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  qualityContent: {
    padding: 16,
    alignItems: "center",
  },
  qualityText: {
    fontSize: 14,
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 4,
  },
  qualitySubtext: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  // Nutrition list
  nutriList: {
    gap: 8,
  },
  nutriRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  nutriLabel: {
    color: "#7f8c8d",
    fontSize: 14,
  },
  nutriValue: {
    color: "#2c3e50",
    fontSize: 14,
    fontWeight: "600",
  },
  // Track button
  trackButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    width: "85%",
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalClose: {
    fontSize: 24,
    color: "#2c3e50",
    width: 24,
    textAlign: "left",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
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
