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
import Svg, { Circle, Path } from "react-native-svg";
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
  const {
    addFood,
    updateFood,
    toggleFavorite,
    toggleFavoriteByBarcode,
    dailyFoods,
    findFoodByBarcode,
    findFoodByNameAndBrand,
  } = useFood();

  // state variables
  const [selectedUnit, setSelectedUnit] = useState(
    String(params.unit || "serving")
  );
  const [amount, setAmount] = useState(String(params.amount || "1"));
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(
    (params.meal as string) || "breakfast"
  );
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [isNewFoodFavorite, setIsNewFoodFavorite] = useState(false);

  // Check if current food is a favorite
  const currentFoodId = params.id as string;
  const isEdit = (params.mode as string) === "edit";

  // For existing foods (edit mode), check if it's favorited
  // For new foods, check if any food with same barcode/name+brand is favorited
  const isFavorite = (() => {
    if (isEdit && currentFoodId) {
      const foundFood = dailyFoods.find((food) => food.id === currentFoodId);

      // If this specific food isn't favorited, check if any food with same barcode is favorited
      if (!foundFood?.isFavorite && params.barcode) {
        const favoritedFood = findFoodByBarcode(params.barcode as string);
        if (favoritedFood?.isFavorite) {
          return true;
        }
      }

      return foundFood?.isFavorite || false;
    }

    // For new foods, check if any existing food with same barcode is favorited
    if (params.barcode) {
      const existingFood = findFoodByBarcode(params.barcode as string);
      if (existingFood) {
        return existingFood.isFavorite || false;
      }
    }

    // Fallback: check by name and brand
    const existingFood = findFoodByNameAndBrand(
      params.name as string,
      params.brand as string
    );
    if (existingFood) {
      return existingFood.isFavorite || false;
    }

    // If no existing food found, use local state
    return isNewFoodFavorite;
  })();

  const handleUnitSelect = (unitValue: string) => {
    setSelectedUnit(unitValue);
    setShowUnitPicker(false);
  };

  const handleToggleFavorite = () => {
    if (isEdit && currentFoodId) {
      // For existing foods, if there's a barcode, toggle ALL foods with the same barcode
      if (params.barcode) {
        toggleFavoriteByBarcode(params.barcode as string);
      } else {
        // No barcode, just toggle the current food
        toggleFavorite(currentFoodId);
      }
    } else {
      // For new foods, check if any food with same barcode exists and toggle that
      if (params.barcode) {
        const existingFood = findFoodByBarcode(params.barcode as string);
        if (existingFood) {
          // Toggle the existing food's favorite status
          toggleFavorite(existingFood.id);
        } else {
          // Toggle local state for new food
          setIsNewFoodFavorite(!isNewFoodFavorite);
        }
      } else {
        // Toggle local state for new food without barcode
        setIsNewFoodFavorite(!isNewFoodFavorite);
      }
    }
  };

  // Calculate nutrition based on amount and unit
  const calculateNutrition = () => {
    const isEdit = (params.mode as string) === "edit";
    const origUnit = String(params.unit || "serving");
    const origAmount = parseFloat(String(params.amount || "1")) || 1;
    const baseCalories = parseFloat(String(params.calories || "0")) || 0;
    const baseProtein = parseFloat(String(params.protein || "0")) || 0;
    const baseCarbs = parseFloat(String(params.carbs || "0")) || 0;
    const baseFat = parseFloat(String(params.fat || "0")) || 0;
    const currentAmount = parseFloat(amount) || 1;

    // If editing and unit unchanged, scale linearly by amount ratio (prevents double-scaling)
    if (isEdit && selectedUnit === origUnit) {
      const ratio = currentAmount / (origAmount || 1);
      return {
        calories: Math.round(baseCalories * ratio),
        protein: (baseProtein * ratio).toFixed(1),
        carbs: (baseCarbs * ratio).toFixed(1),
        fat: (baseFat * ratio).toFixed(1),
      };
    }

    // Fallback: convert based on unit assumptions
    let conversionFactor = 1;
    switch (selectedUnit) {
      case "gram":
        conversionFactor = currentAmount / 100;
        break;
      case "serving": {
        const servingSizeStr = String(params.servingSize || "100g");
        const numbers = servingSizeStr.match(/\d+/);
        const servingSizeGrams = numbers ? parseInt(numbers[0]) : 100;
        conversionFactor = (currentAmount * servingSizeGrams) / 100;
        break;
      }
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
  const extraPer100 = {
    fiber: parseFloat((params.fiber as string) || "0") || 0,
    sugars: parseFloat((params.sugars as string) || "0") || 0,
    saturatedFat: parseFloat((params.saturatedFat as string) || "0") || 0,
    unsaturatedFat: parseFloat((params.unsaturatedFat as string) || "0") || 0,
    cholesterol: parseFloat((params.cholesterol as string) || "0") || 0,
    sodium: parseFloat((params.sodium as string) || "0") || 0,
    potassium: parseFloat((params.potassium as string) || "0") || 0,
  };

  // Macro distribution for this food (percentage of total calories)
  const macroPercents = (() => {
    const pCal = parseFloat(currentNutrition.protein) * 4;
    const cCal = parseFloat(currentNutrition.carbs) * 4;
    const fCal = parseFloat(currentNutrition.fat) * 9;
    const total = pCal + cCal + fCal;
    if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
    return {
      protein: Math.round((pCal / total) * 100),
      carbs: Math.round((cCal / total) * 100),
      fat: Math.round((fCal / total) * 100),
    };
  })();

  const onTrack = () => {
    const proteinQuality = lookupProteinQuality(
      `${params.name as string} ${params.brand as string}`
    );
    const isEdit = (params.mode as string) === "edit" && params.id;

    console.log("=== ONTRACK DEBUG ===");
    console.log("Creating food item with:", {
      name: params.name,
      brand: params.brand,
      barcode: params.barcode,
      isFavorite: isFavorite,
      isEdit,
      currentFoodId,
    });

    const foodItem = {
      id: isEdit ? String(params.id) : Date.now().toString(),
      name: params.name as string,
      brand: params.brand as string,
      amount: parseFloat(amount),
      unit: selectedUnit,
      barcode: (params.barcode as string) || undefined,
      nutrition: {
        calories: currentNutrition.calories,
        protein: parseFloat(currentNutrition.protein),
        carbs: parseFloat(currentNutrition.carbs),
        fat: parseFloat(currentNutrition.fat),
        fiber:
          Number(
            (
              (extraPer100.fiber * (parseFloat(amount) || 1)) /
              (selectedUnit === "gram" ? 100 : 1)
            ).toFixed(1)
          ) || undefined,
        sugars:
          Number(
            (
              (extraPer100.sugars * (parseFloat(amount) || 1)) /
              (selectedUnit === "gram" ? 100 : 1)
            ).toFixed(1)
          ) || undefined,
        saturatedFat:
          Number(
            (
              (extraPer100.saturatedFat * (parseFloat(amount) || 1)) /
              (selectedUnit === "gram" ? 100 : 1)
            ).toFixed(1)
          ) || undefined,
        unsaturatedFat:
          Number(
            (
              (extraPer100.unsaturatedFat * (parseFloat(amount) || 1)) /
              (selectedUnit === "gram" ? 100 : 1)
            ).toFixed(1)
          ) || undefined,
        cholesterol:
          Math.round(
            extraPer100.cholesterol *
              (selectedUnit === "gram"
                ? (parseFloat(amount) || 1) / 100
                : parseFloat(amount) || 1)
          ) || undefined,
        sodium:
          Math.round(
            extraPer100.sodium *
              (selectedUnit === "gram"
                ? (parseFloat(amount) || 1) / 100
                : parseFloat(amount) || 1)
          ) || undefined,
        potassium:
          Math.round(
            extraPer100.potassium *
              (selectedUnit === "gram"
                ? (parseFloat(amount) || 1) / 100
                : parseFloat(amount) || 1)
          ) || undefined,
      },
      proteinQuality,
      timestamp: new Date(),
      mealType: selectedMeal,
      isFavorite: isFavorite,
    };

    if (isEdit) {
      updateFood(foodItem as any);
      // When editing, just go back to the previous screen (which should be Daily Intake)
      router.back();
    } else {
      addFood(foodItem as any);
      // If coming from scanner, dismiss all and go to Daily Intake to avoid scanner loop
      if (params.fromScanner === "true") {
        router.dismissAll();
        router.navigate(
          `/components/screens/DailyIntakeScreen?meal=${
            params.targetMeal || selectedMeal
          }`
        );
      } else {
        // For manual add, just replace current screen
        router.replace(
          `/components/screens/DailyIntakeScreen?meal=${selectedMeal}`
        );
      }
    }
  };

  function lookupProteinQuality(name: string): number {
    const n = (name || "").toLowerCase();
    if (/(egg|whey|casein|milk protein|beef|fish)/.test(n)) return 1.0;
    if (/(soy isolate|soy protein isolate)/.test(n)) return 1.0;
    if (/quinoa|pea protein|canola protein|potato protein/.test(n)) return 0.8;
    if (/lentil|chickpea|bean|kidney bean|black bean|navy bean|pinto/.test(n))
      return 0.65;
    if (/oat|wheat|rice|barley|grain/.test(n)) return 0.5;
    if (/almond|peanut|nut|seed/.test(n)) return 0.4;
    return 0.7;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title: name (brand) with heart icon */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {params.name}
            {params.brand ? ` (${params.brand})` : ""}
          </Text>
          <TouchableOpacity
            style={styles.heartButton}
            onPress={handleToggleFavorite}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={isFavorite ? "#E57373" : "none"}
                stroke={isFavorite ? "#E57373" : "#ccc"}
                strokeWidth={2}
              />
            </Svg>
          </TouchableOpacity>
        </View>

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
              <View style={styles.circleSvgWrapper}>
                <Svg width={72} height={72}>
                  {(() => {
                    const r = 28;
                    const cx = 36;
                    const cy = 36;
                    const c = 2 * Math.PI * r;
                    const pct = Math.max(
                      0,
                      Math.min(100, macroPercents.protein)
                    );
                    const offset = c * (1 - pct / 100);
                    return (
                      <>
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#e6eef4"
                          strokeWidth={8}
                          fill="none"
                        />
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#E57373"
                          strokeWidth={8}
                          strokeDasharray={`${c} ${c}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          rotation={-90}
                          originX={cx}
                          originY={cy}
                          fill="none"
                        />
                      </>
                    );
                  })()}
                </Svg>
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
              <View style={styles.circleSvgWrapper}>
                <Svg width={72} height={72}>
                  {(() => {
                    const r = 28;
                    const cx = 36;
                    const cy = 36;
                    const c = 2 * Math.PI * r;
                    const pct = Math.max(0, Math.min(100, macroPercents.carbs));
                    const offset = c * (1 - pct / 100);
                    return (
                      <>
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#e6eef4"
                          strokeWidth={8}
                          fill="none"
                        />
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#FFB74D"
                          strokeWidth={8}
                          strokeDasharray={`${c} ${c}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          rotation={-90}
                          originX={cx}
                          originY={cy}
                          fill="none"
                        />
                      </>
                    );
                  })()}
                </Svg>
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
              <View style={styles.circleSvgWrapper}>
                <Svg width={72} height={72}>
                  {(() => {
                    const r = 28;
                    const cx = 36;
                    const cy = 36;
                    const c = 2 * Math.PI * r;
                    const pct = Math.max(0, Math.min(100, macroPercents.fat));
                    const offset = c * (1 - pct / 100);
                    return (
                      <>
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#e6eef4"
                          strokeWidth={8}
                          fill="none"
                        />
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={r}
                          stroke="#9575CD"
                          strokeWidth={8}
                          strokeDasharray={`${c} ${c}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          rotation={-90}
                          originX={cx}
                          originY={cy}
                          fill="none"
                        />
                      </>
                    );
                  })()}
                </Svg>
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
              <Text style={styles.nutriValue}>
                {extraPer100.fiber
                  ? (
                      extraPer100.fiber *
                      (selectedUnit === "gram"
                        ? (parseFloat(amount) || 1) / 100
                        : parseFloat(amount) || 1)
                    ).toFixed(1) + " g"
                  : "—"}
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Sugars</Text>
              <Text style={styles.nutriValue}>
                {extraPer100.sugars
                  ? (
                      extraPer100.sugars *
                      (selectedUnit === "gram"
                        ? (parseFloat(amount) || 1) / 100
                        : parseFloat(amount) || 1)
                    ).toFixed(1) + " g"
                  : "—"}
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Fat</Text>
              <Text style={styles.nutriValue}>{currentNutrition.fat} g</Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Saturated fat</Text>
              <Text style={styles.nutriValue}>
                {extraPer100.saturatedFat
                  ? (
                      extraPer100.saturatedFat *
                      (selectedUnit === "gram"
                        ? (parseFloat(amount) || 1) / 100
                        : parseFloat(amount) || 1)
                    ).toFixed(1) + " g"
                  : "—"}
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Unsaturated fat</Text>
              <Text style={styles.nutriValue}>
                {extraPer100.unsaturatedFat
                  ? (
                      extraPer100.unsaturatedFat *
                      (selectedUnit === "gram"
                        ? (parseFloat(amount) || 1) / 100
                        : parseFloat(amount) || 1)
                    ).toFixed(1) + " g"
                  : "—"}
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Cholesterol</Text>
              <Text style={styles.nutriValue}>
                {extraPer100.cholesterol
                  ? Math.round(
                      extraPer100.cholesterol *
                        (selectedUnit === "gram"
                          ? (parseFloat(amount) || 1) / 100
                          : parseFloat(amount) || 1)
                    ) + " mg"
                  : "—"}
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Sodium</Text>
              <Text style={styles.nutriValue}>
                {extraPer100.sodium
                  ? Math.round(
                      extraPer100.sodium *
                        (selectedUnit === "gram"
                          ? (parseFloat(amount) || 1) / 100
                          : parseFloat(amount) || 1)
                    ) + " mg"
                  : "—"}
              </Text>
            </View>
            <View style={styles.nutriRow}>
              <Text style={styles.nutriLabel}>Potassium</Text>
              <Text style={styles.nutriValue}>
                {extraPer100.potassium
                  ? Math.round(
                      extraPer100.potassium *
                        (selectedUnit === "gram"
                          ? (parseFloat(amount) || 1) / 100
                          : parseFloat(amount) || 1)
                    ) + " mg"
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer to avoid overlap with bottom button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.trackButton} onPress={onTrack}>
          <Text style={styles.trackButtonText}>
            {(params.mode as string) === "edit" ? "SAVE" : "TRACK"}
          </Text>
        </TouchableOpacity>
      </View>

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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    flex: 1,
    marginRight: 12,
  },
  heartButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  circleSvgWrapper: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  circleFill: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
    borderColor: "#8BC34A",
    top: 0,
    left: 0,
    opacity: 0.5,
  },
  circlePercent: {
    position: "absolute",
    textAlign: "center",
    fontSize: 14,
    color: "#c62828",
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
  fixedButtonContainer: {
    position: "absolute",
    bottom: 40, // Move up to avoid phone navigation buttons
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
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
