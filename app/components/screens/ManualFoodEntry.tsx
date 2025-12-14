import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFood } from "../FoodContext";
import { FoodData } from "../FoodDataService";

const SERVING_UNITS = [
  { label: "Gram (g)", value: "gram" },
  { label: "Serving", value: "serving" },
  { label: "Tablespoon", value: "tablespoon" },
  { label: "Cup", value: "cup" },
  { label: "Piece", value: "piece" },
];

export default function ManualFoodEntry() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFood } = useFood();

  // Get barcode from params if available (from scanner)
  const scannedBarcode = (params.barcode as string) || "";
  const mealParam = (params.meal as string) || "breakfast";
  const modeParam = params.mode; // Check if we're in recipe mode
  const isRecipeMode = modeParam === "recipe";

  // Form state
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [servingAmount, setServingAmount] = useState("100");
  const [servingUnit, setServingUnit] = useState("gram");
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  
  // Nutrition values (per 100g or per serving, depending on servingSize)
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugars, setSugars] = useState("");
  const [saturatedFat, setSaturatedFat] = useState("");
  const [sodium, setSodium] = useState("");
  const [potassium, setPotassium] = useState("");

  const handleUnitSelect = (unitValue: string) => {
    setServingUnit(unitValue);
    setShowUnitPicker(false);
  };

  const handleSave = () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a food name");
      return;
    }

    if (!brand.trim()) {
      Alert.alert("Error", "Please enter a brand");
      return;
    }

    if (!servingAmount.trim()) {
      Alert.alert("Error", "Please enter a serving size amount");
      return;
    }

    if (!calories && !protein && !carbs && !fat) {
      Alert.alert("Error", "Please enter at least one nutrition value");
      return;
    }

    // Parse serving size
    const servingSizeValue = parseFloat(servingAmount) || 100;
    const isPer100g = servingUnit === "gram" && servingSizeValue === 100;

    // Convert nutrition values to numbers
    const caloriesNum = parseFloat(calories) || 0;
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatNum = parseFloat(fat) || 0;
    const fiberNum = parseFloat(fiber) || 0;
    const sugarsNum = parseFloat(sugars) || 0;
    const saturatedFatNum = parseFloat(saturatedFat) || 0;
    const sodiumNum = parseFloat(sodium) || 0;
    const potassiumNum = parseFloat(potassium) || 0;

    // Normalize to per 100g for consistency with API data
    // If unit is "gram" and not 100g, normalize
    // For other units (serving, cup, etc.), we'll store as-is but normalize to 100g equivalent
    let normalizedCalories = caloriesNum;
    let normalizedProtein = proteinNum;
    let normalizedCarbs = carbsNum;
    let normalizedFat = fatNum;
    let normalizedFiber = fiberNum;
    let normalizedSugars = sugarsNum;
    let normalizedSaturatedFat = saturatedFatNum;
    let normalizedSodium = sodiumNum;
    let normalizedPotassium = potassiumNum;

    if (servingUnit === "gram" && !isPer100g && servingSizeValue > 0) {
      // Normalize grams to per 100g
      const multiplier = 100 / servingSizeValue;
      normalizedCalories = caloriesNum * multiplier;
      normalizedProtein = proteinNum * multiplier;
      normalizedCarbs = carbsNum * multiplier;
      normalizedFat = fatNum * multiplier;
      normalizedFiber = fiberNum * multiplier;
      normalizedSugars = sugarsNum * multiplier;
      normalizedSaturatedFat = saturatedFatNum * multiplier;
      normalizedSodium = sodiumNum * multiplier;
      normalizedPotassium = potassiumNum * multiplier;
    }
    // For non-gram units (serving, cup, etc.), we keep values as-is
    // They represent per-serving values, not per-100g

    // Create FoodData object (similar to what the API returns)
    const foodData: FoodData = {
      barcode: scannedBarcode.trim() || "",
      name: name.trim(),
      brand: brand.trim(),
      calories: Math.round(normalizedCalories),
      protein: parseFloat(normalizedProtein.toFixed(2)),
      carbs: parseFloat(normalizedCarbs.toFixed(2)),
      fat: parseFloat(normalizedFat.toFixed(2)),
      fiber: fiberNum > 0 ? parseFloat(normalizedFiber.toFixed(2)) : undefined,
      sugars: sugarsNum > 0 ? parseFloat(normalizedSugars.toFixed(2)) : undefined,
      saturatedFat: saturatedFatNum > 0 ? parseFloat(normalizedSaturatedFat.toFixed(2)) : undefined,
      sodium: sodiumNum > 0 ? Math.round(normalizedSodium) : undefined,
      potassium: potassiumNum > 0 ? Math.round(normalizedPotassium) : undefined,
      servingSize: servingUnit === "gram" 
        ? `${servingAmount}g` 
        : servingUnit === "serving" 
        ? `${servingAmount} serving${parseFloat(servingAmount) !== 1 ? "s" : ""}`
        : `${servingAmount} ${servingUnit}`,
    };

    // Navigate to FoodDetailsScreen (similar to scanned foods)
    const categoriesParam = "";

    router.push({
      pathname: "/components/screens/FoodDetailsScreen",
      params: {
        name: foodData.name,
        brand: foodData.brand,
        calories: foodData.calories.toString(),
        protein: foodData.protein.toString(),
        carbs: foodData.carbs.toString(),
        fat: foodData.fat.toString(),
        barcode: foodData.barcode || "",
        servingSize: foodData.servingSize || (servingUnit === "gram" 
          ? `${servingAmount}g` 
          : servingUnit === "serving" 
          ? `${servingAmount} serving${parseFloat(servingAmount) !== 1 ? "s" : ""}`
          : `${servingAmount} ${servingUnit}`),
        meal: mealParam,
        fromScanner: "false",
        fromManualEntry: "true",
        targetMeal: mealParam,
        fromAddFood: "true",
        mode: modeParam || undefined,
        fiber: (foodData.fiber || 0).toString(),
        sugars: (foodData.sugars || 0).toString(),
        saturatedFat: (foodData.saturatedFat || 0).toString(),
        unsaturatedFat: ((foodData.fat || 0) - (foodData.saturatedFat || 0)).toString(),
        cholesterol: "0",
        sodium: (foodData.sodium || 0).toString(),
        potassium: (foodData.potassium || 0).toString(),
        category: "",
        categories: categoriesParam,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Food Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor="#9aa3aa"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand *</Text>
            <TextInput
              style={styles.input}
              value={brand}
              onChangeText={setBrand}
              placeholderTextColor="#9aa3aa"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Serving Size *</Text>
            <View style={styles.servingSizeRow}>
              <TextInput
                style={[styles.input, styles.servingAmountInput]}
                value={servingAmount}
                onChangeText={setServingAmount}
                placeholder="100"
                placeholderTextColor="#9aa3aa"
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.unitPicker}
                onPress={() => setShowUnitPicker(true)}
              >
                <Text style={styles.unitPickerText}>
                  {SERVING_UNITS.find((u) => u.value === servingUnit)?.label}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Nutrition Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Information</Text>
          <Text style={styles.sectionSubtitle}>
            Enter values for the serving size specified above
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calories (kcal)</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          {/* Fiber and Sugars under Carbs */}
          <View style={[styles.inputGroup, styles.subInputGroup]}>
            <Text style={styles.label}>Fiber (g) - Optional</Text>
            <TextInput
              style={styles.input}
              value={fiber}
              onChangeText={setFiber}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, styles.subInputGroup]}>
            <Text style={styles.label}>Sugars (g) - Optional</Text>
            <TextInput
              style={styles.input}
              value={sugars}
              onChangeText={setSugars}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fat (g)</Text>
            <TextInput
              style={styles.input}
              value={fat}
              onChangeText={setFat}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          {/* Saturated Fat under Fat */}
          <View style={[styles.inputGroup, styles.subInputGroup]}>
            <Text style={styles.label}>Saturated Fat (g) - Optional</Text>
            <TextInput
              style={styles.input}
              value={saturatedFat}
              onChangeText={setSaturatedFat}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sodium (mg) - Optional</Text>
            <TextInput
              style={styles.input}
              value={sodium}
              onChangeText={setSodium}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Potassium (mg) - Optional</Text>
            <TextInput
              style={styles.input}
              value={potassium}
              onChangeText={setPotassium}
              placeholder="0"
              placeholderTextColor="#9aa3aa"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Unit Picker Modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding to avoid phone navigation buttons
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#7f8c8d",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#2c3e50",
  },
  helperText: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
    fontStyle: "italic",
  },
  subInputGroup: {
    marginLeft: 16,
    marginBottom: 12,
  },
  servingSizeRow: {
    flexDirection: "row",
    gap: 12,
  },
  servingAmountInput: {
    flex: 1,
  },
  unitPicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 8,
    padding: 12,
  },
  unitPickerText: {
    fontSize: 15,
    color: "#2c3e50",
  },
  chevron: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalClose: {
    fontSize: 24,
    color: "#2c3e50",
    width: 24,
    textAlign: "left",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#2c3e50",
  },
  optionButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  optionText: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40, // Extra margin to avoid phone navigation buttons
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
