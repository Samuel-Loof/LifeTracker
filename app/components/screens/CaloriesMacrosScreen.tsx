import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useFood } from "../FoodContext";

type Sex = "male" | "female";
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";
type GoalStrategy = "maintain" | "gain" | "lose";
type GoalPace = "slow" | "moderate" | "custom";
type MacroPreset = "health" | "fitness" | "custom";

export default function CaloriesMacrosScreen() {
  const router = useRouter();
  const { userGoals, setUserGoals } = useFood();

  // Basic info (read-only, from userGoals)
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState<number>(30);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [activity, setActivity] = useState<ActivityLevel>("moderate");

  // Goal settings
  const [strategy, setStrategy] = useState<GoalStrategy>("maintain");
  const [pace, setPace] = useState<GoalPace>("moderate");
  const [customDelta, setCustomDelta] = useState<string>("0");
  const [isEditingCalories, setIsEditingCalories] = useState(false);
  const [tempCalories, setTempCalories] = useState<string>("");

  // Macro settings
  const [useManualMacros, setUseManualMacros] = useState(false);
  const [macroPreset, setMacroPreset] = useState<MacroPreset>("health");
  const [manualProtein, setManualProtein] = useState<string>("");
  const [manualCarbs, setManualCarbs] = useState<string>("");
  const [manualFat, setManualFat] = useState<string>("");

  // Load data from context
  useEffect(() => {
    if (userGoals) {
      setSex(userGoals.sex);
      setAge(userGoals.age);
      setHeightCm(userGoals.heightCm);
      setWeightKg(userGoals.weightKg);
      setActivity(userGoals.activity);
      setStrategy(userGoals.strategy);
      setPace(userGoals.pace);
      setCustomDelta((userGoals.manualCalorieDelta || 0).toString());
      setUseManualMacros(userGoals.useManualMacros);
      setManualProtein(userGoals.manualProtein?.toString() || "");
      setManualCarbs(userGoals.manualCarbs?.toString() || "");
      setManualFat(userGoals.manualFat?.toString() || "");
    }
  }, [userGoals]);

  // Calculate BMR using Mifflin-St Jeor equation
  const bmr = useMemo(() => {
    if (sex === "male") {
      return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
  }, [sex, weightKg, heightCm, age]);

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  // Calculate TDEE
  const tdee = useMemo(() => {
    return Math.round(bmr * activityMultipliers[activity]);
  }, [bmr, activity]);

  // Calculate target calories
  const targetCalories = useMemo(() => {
    let delta = 0;
    if (strategy === "gain") {
      delta =
        pace === "moderate"
          ? 500
          : pace === "slow"
          ? 250
          : parseInt(customDelta) || 0;
    } else if (strategy === "lose") {
      delta =
        pace === "moderate"
          ? -500
          : pace === "slow"
          ? -250
          : -(parseInt(customDelta) || 0);
    }

    return Math.max(0, tdee + delta);
  }, [tdee, strategy, pace, customDelta]);

  // Get macro recommendations based on preset and goal
  const getMacroRecommendations = () => {
    const calories = targetCalories;
    const proteinPerKg = 1.6; // Default protein per kg
    const proteinGrams = Math.round(proteinPerKg * weightKg);
    const proteinCalories = proteinGrams * 4;

    let carbPercent, fatPercent;

    if (macroPreset === "health") {
      // Health authority recommendations
      if (strategy === "lose") {
        carbPercent = 0.3; // 30%
        fatPercent = 0.275; // 27.5%
      } else if (strategy === "gain") {
        carbPercent = 0.5; // 50%
        fatPercent = 0.25; // 25%
      } else {
        carbPercent = 0.55; // 55%
        fatPercent = 0.275; // 27.5%
      }
    } else if (macroPreset === "fitness") {
      // Fitness recommendations
      if (strategy === "lose") {
        carbPercent = 0.3; // 30%
        fatPercent = 0.275; // 27.5%
      } else if (strategy === "gain") {
        carbPercent = 0.5; // 50%
        fatPercent = 0.25; // 25%
      } else {
        carbPercent = 0.5; // 50%
        fatPercent = 0.3; // 30%
      }
    } else {
      // Custom - use manual values
      return {
        protein: parseInt(manualProtein) || proteinGrams,
        carbs: parseInt(manualCarbs) || Math.round((calories * 0.5) / 4),
        fat: parseInt(manualFat) || Math.round((calories * 0.25) / 9),
      };
    }

    const remainingCalories = calories - proteinCalories;
    const carbCalories = remainingCalories * carbPercent;
    const fatCalories = remainingCalories * fatPercent;

    return {
      protein: proteinGrams,
      carbs: Math.round(carbCalories / 4),
      fat: Math.round(fatCalories / 9),
    };
  };

  const recommendedMacros = getMacroRecommendations();

  const handleSave = async () => {
    const goals = {
      sex,
      age,
      heightCm,
      weightKg,
      activity,
      strategy,
      pace,
      manualCalorieDelta: parseInt(customDelta) || 0,
      useManualCalories: false,
      manualCalories: undefined,
      cuttingKeepMuscle: false,
      useManualMacros,
      manualProtein: useManualMacros
        ? parseInt(manualProtein) || undefined
        : undefined,
      manualCarbs: useManualMacros
        ? parseInt(manualCarbs) || undefined
        : undefined,
      manualFat: useManualMacros ? parseInt(manualFat) || undefined : undefined,
      minAverageProteinQuality: undefined,
      minHighQualityProteinPercent: undefined,
    } as const;
    await setUserGoals(goals);
    router.back();
  };

  const handleCalorieEdit = () => {
    setTempCalories(targetCalories.toString());
    setIsEditingCalories(true);
  };

  const handleCalorieSave = () => {
    const newCalories = parseInt(tempCalories);
    if (newCalories && newCalories > 0) {
      // Calculate the delta from TDEE
      const delta = newCalories - tdee;
      setCustomDelta(delta.toString());
      setPace("custom");
    }
    setIsEditingCalories(false);
  };

  const handleCalorieCancel = () => {
    setIsEditingCalories(false);
    setTempCalories("");
  };

  const getCalorieWarning = () => {
    const delta = Math.abs(parseInt(customDelta) || 0);
    if (delta > 750) {
      return "⚠️ Extreme calorie adjustment may be unhealthy";
    }
    return null;
  };

  const getActivityDescription = () => {
    const activityMap = {
      sedentary: "Sedentary",
      light: "Light Activity",
      moderate: "Moderate Activity",
      active: "Active",
      veryActive: "Very Active",
    };
    return activityMap[activity] || "Moderate Activity";
  };

  const getGoalDescription = () => {
    if (strategy === "maintain") return "Maintain Weight";
    if (strategy === "gain") {
      if (pace === "slow") return "Slow Bulk (+250 kcal)";
      if (pace === "moderate") return "Normal Bulk (+500 kcal)";
      return `Custom Bulk (+${customDelta} kcal)`;
    }
    if (strategy === "lose") {
      if (pace === "slow") return "Slow Cut (-250 kcal)";
      if (pace === "moderate") return "Normal Cut (-500 kcal)";
      return `Custom Cut (-${customDelta} kcal)`;
    }
    return "Maintain Weight";
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
        >
          <Text style={styles.headerBackText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calories & Macros</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>{weightKg} kg</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>{heightCm} cm</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>{age} years</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            BMR: {bmr} kcal • TDEE: {tdee} kcal
          </Text>
        </View>

        {/* Goal Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal</Text>

          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                strategy === "maintain" && styles.segmentedOptionActive,
              ]}
              onPress={() => setStrategy("maintain")}
            >
              <Text
                style={[
                  styles.segmentedText,
                  strategy === "maintain" && styles.segmentedTextActive,
                ]}
              >
                Maintain
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                strategy === "gain" && styles.segmentedOptionActive,
              ]}
              onPress={() => setStrategy("gain")}
            >
              <Text
                style={[
                  styles.segmentedText,
                  strategy === "gain" && styles.segmentedTextActive,
                ]}
              >
                Gain
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                strategy === "lose" && styles.segmentedOptionActive,
              ]}
              onPress={() => setStrategy("lose")}
            >
              <Text
                style={[
                  styles.segmentedText,
                  strategy === "lose" && styles.segmentedTextActive,
                ]}
              >
                Lose
              </Text>
            </TouchableOpacity>
          </View>

          {(strategy === "gain" || strategy === "lose") && (
            <View style={styles.paceContainer}>
              <TouchableOpacity
                style={[
                  styles.paceOption,
                  pace === "slow" && styles.paceOptionActive,
                ]}
                onPress={() => setPace("slow")}
              >
                <Text
                  style={[
                    styles.paceText,
                    pace === "slow" && styles.paceTextActive,
                  ]}
                >
                  Slow ({strategy === "gain" ? "+250" : "-250"} kcal)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paceOption,
                  pace === "moderate" && styles.paceOptionActive,
                ]}
                onPress={() => setPace("moderate")}
              >
                <Text
                  style={[
                    styles.paceText,
                    pace === "moderate" && styles.paceTextActive,
                  ]}
                >
                  Normal ({strategy === "gain" ? "+500" : "-500"} kcal)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Calorie Display */}
          <View style={styles.calorieDisplayContainer}>
            {isEditingCalories ? (
              <View style={styles.calorieEditContainer}>
                <TextInput
                  style={styles.calorieInput}
                  value={tempCalories}
                  onChangeText={setTempCalories}
                  keyboardType="numeric"
                  autoFocus
                />
                <View style={styles.calorieEditButtons}>
                  <TouchableOpacity
                    style={styles.calorieEditButton}
                    onPress={handleCalorieSave}
                  >
                    <Text style={styles.calorieEditButtonText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calorieEditButton}
                    onPress={handleCalorieCancel}
                  >
                    <Text style={styles.calorieEditButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.calorieDisplay}
                onPress={handleCalorieEdit}
              >
                <Text style={styles.calorieNumber}>{targetCalories}</Text>
                <Text style={styles.calorieUnit}>kcal/day</Text>
              </TouchableOpacity>
            )}
            {getCalorieWarning() && (
              <Text style={styles.warningText}>{getCalorieWarning()}</Text>
            )}
          </View>
        </View>

        {/* Activity Level */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity Level</Text>
          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() =>
              router.push("/components/screens/ActivityLevelScreen")
            }
          >
            <Text style={styles.rowLabel}>Current Activity</Text>
            <View style={styles.activityLevelContainer}>
              <Text style={styles.rowValue}>{getActivityDescription()}</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Macro Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macros</Text>

          <View style={styles.presetContainer}>
            <Text style={styles.presetLabel}>Macro Preset:</Text>
            <View style={styles.presetButtons}>
              <TouchableOpacity
                style={[
                  styles.presetButton,
                  macroPreset === "health" && styles.presetButtonActive,
                ]}
                onPress={() => setMacroPreset("health")}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    macroPreset === "health" && styles.presetButtonTextActive,
                  ]}
                >
                  Health
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.presetButton,
                  macroPreset === "fitness" && styles.presetButtonActive,
                ]}
                onPress={() => setMacroPreset("fitness")}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    macroPreset === "fitness" && styles.presetButtonTextActive,
                  ]}
                >
                  Fitness
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.macroSummary}>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Protein:</Text>
              <Text style={styles.macroValue}>
                {recommendedMacros.protein}g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Carbs:</Text>
              <Text style={styles.macroValue}>{recommendedMacros.carbs}g</Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Fat:</Text>
              <Text style={styles.macroValue}>{recommendedMacros.fat}g</Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.manualMacroLabelContainer}>
              <Text style={styles.switchLabel}>Manual macros?</Text>
              <Text style={styles.switchSubtext}>Adjust individual macros</Text>
            </View>
            <Switch
              value={useManualMacros}
              onValueChange={setUseManualMacros}
            />
          </View>

          {useManualMacros && (
            <View style={styles.manualMacroContainer}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Protein (g):</Text>
                <TextInput
                  style={styles.numberInput}
                  value={manualProtein}
                  onChangeText={setManualProtein}
                  keyboardType="numeric"
                  placeholder={recommendedMacros.protein.toString()}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Carbs (g):</Text>
                <TextInput
                  style={styles.numberInput}
                  value={manualCarbs}
                  onChangeText={setManualCarbs}
                  keyboardType="numeric"
                  placeholder={recommendedMacros.carbs.toString()}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Fat (g):</Text>
                <TextInput
                  style={styles.numberInput}
                  value={manualFat}
                  onChangeText={setManualFat}
                  keyboardType="numeric"
                  placeholder={recommendedMacros.fat.toString()}
                />
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackText: {
    fontSize: 24,
    color: "#2c3e50",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  segmentedOptionActive: {
    backgroundColor: "#2c3e50",
  },
  segmentedText: {
    fontSize: 16,
    color: "#666",
  },
  segmentedTextActive: {
    color: "white",
    fontWeight: "600",
  },
  paceContainer: {
    gap: 8,
    marginBottom: 16,
  },
  paceOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  paceOptionActive: {
    backgroundColor: "#2c3e50",
    borderColor: "#2c3e50",
  },
  paceText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  paceTextActive: {
    color: "white",
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    color: "#2c3e50",
    flex: 1,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    width: 100,
    textAlign: "center",
  },
  calorieDisplayContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  calorieDisplay: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9ecef",
  },
  calorieNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: "#2c3e50",
  },
  calorieUnit: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  calorieEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
  },
  calorieInput: {
    fontSize: 32,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
    minWidth: 120,
    borderBottomWidth: 2,
    borderBottomColor: "#2c3e50",
  },
  calorieEditButtons: {
    flexDirection: "row",
    marginLeft: 16,
  },
  calorieEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2c3e50",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  calorieEditButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  warningText: {
    fontSize: 14,
    color: "#e74c3c",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  clickableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  rowLabel: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  activityLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrow: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#2c3e50",
    fontWeight: "500",
  },
  switchSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  presetContainer: {
    marginBottom: 16,
  },
  presetLabel: {
    fontSize: 16,
    color: "#2c3e50",
    marginBottom: 12,
    fontWeight: "500",
  },
  presetButtons: {
    flexDirection: "row",
    gap: 8,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: "#2c3e50",
    borderColor: "#2c3e50",
  },
  presetButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  presetButtonTextActive: {
    color: "white",
    fontWeight: "600",
  },
  macroSummary: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  manualMacroLabelContainer: {
    flex: 1,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 16,
    color: "#666",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  manualMacroContainer: {
    marginTop: 16,
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  saveButton: {
    backgroundColor: "#2c3e50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
