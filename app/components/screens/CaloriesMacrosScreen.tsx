import React, { useEffect, useState, useMemo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useFood } from "../FoodContext";
import MacroExplanationModal from "../helpers/MacroExplanationModal";

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
  const scrollViewRef = useRef<ScrollView>(null);

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
  const [macroUpdateKey, setMacroUpdateKey] = useState(0);
  const [calculatedMacros, setCalculatedMacros] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [showMacroExplanation, setShowMacroExplanation] = useState(false);

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

  // Reload user goals when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("Screen focused, reloading user goals...");

      // Directly read from AsyncStorage to ensure we get the latest data
      const loadUserGoals = async () => {
        try {
          const stored = await AsyncStorage.getItem("userGoals");
          if (stored) {
            const goals = JSON.parse(stored);
            console.log("Loaded goals from AsyncStorage:", goals);

            setSex(goals.sex);
            setAge(goals.age);
            setHeightCm(goals.heightCm);
            setWeightKg(goals.weightKg);
            setActivity(goals.activity);
            setStrategy(goals.strategy);
            setPace(goals.pace);
            setCustomDelta((goals.manualCalorieDelta || 0).toString());
            setUseManualMacros(goals.useManualMacros || false);
            setManualProtein(goals.manualProtein?.toString() || "");
            setManualCarbs(goals.manualCarbs?.toString() || "");
            setManualFat(goals.manualFat?.toString() || "");

            console.log("Manual macros reloaded from AsyncStorage:", {
              useManualMacros: goals.useManualMacros,
              manualProtein: goals.manualProtein,
              manualCarbs: goals.manualCarbs,
              manualFat: goals.manualFat,
            });
            console.log("State updated to:", {
              useManualMacros: goals.useManualMacros || false,
              manualProtein: goals.manualProtein?.toString() || "",
              manualCarbs: goals.manualCarbs?.toString() || "",
              manualFat: goals.manualFat?.toString() || "",
            });

            // Force a re-render after state is updated
            setTimeout(() => {
              setMacroUpdateKey((prev) => prev + 1);
            }, 100);
          }
        } catch (error) {
          console.error("Error loading user goals from AsyncStorage:", error);
        }
      };

      loadUserGoals();
    }, [])
  );

  // Initialize calculated macros
  useEffect(() => {
    const initialMacros = calculateMacros();
    setCalculatedMacros(initialMacros);
  }, []);

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

  // Calculate macro recommendations
  const calculateMacros = () => {
    console.log(
      "Calculating macros with preset:",
      macroPreset,
      "strategy:",
      strategy
    );

    const calories = targetCalories;

    // Define macro constraints based on preset and strategy
    let minProteinPerKg,
      maxProteinPerKg,
      minFatPercent,
      maxFatPercent,
      minCarbPercent,
      maxCarbPercent,
      minCarbGrams;

    if (macroPreset === "health") {
      minProteinPerKg = 1.2;
      maxProteinPerKg = 1.6;
      minFatPercent = 0.15;
      maxFatPercent = 0.35;
      minCarbPercent = 0.45;
      maxCarbPercent = 0.65;
      minCarbGrams = 0;
    } else if (macroPreset === "fitness") {
      if (strategy === "lose") {
        minProteinPerKg = 2.0;
        maxProteinPerKg = 2.6;
        minFatPercent = 0.15;
        maxFatPercent = 0.3;
        minCarbPercent = 0;
        maxCarbPercent = 0.45;
        minCarbGrams = 100; // Minimum 100g for workouts
      } else {
        minProteinPerKg = 1.6;
        maxProteinPerKg = 2.2;
        minFatPercent = 0.15;
        maxFatPercent = 0.25;
        minCarbPercent = 0;
        maxCarbPercent = 0.6;
        minCarbGrams = 100; // Minimum 100g for workouts
      }
    } else {
      minProteinPerKg = 1.2;
      maxProteinPerKg = 1.6;
      minFatPercent = 0.15;
      maxFatPercent = 0.35;
      minCarbPercent = 0.45;
      maxCarbPercent = 0.65;
      minCarbGrams = 0;
    }

    // Calculate minimum fat required (0.8g/kg or 15% of calories, whichever is higher)
    const minFatPerKg = 0.8;
    const minFatGrams = Math.ceil(minFatPerKg * weightKg);
    const minFatCalories = minFatGrams * 9;
    const minFatCaloriesByPercent = calories * minFatPercent;
    const actualMinFatCalories = Math.max(
      minFatCalories,
      minFatCaloriesByPercent
    );
    const actualMinFatGrams = Math.ceil(actualMinFatCalories / 9);

    // Step 1: Set protein to maximum target for fitness users
    let proteinPerKg;
    if (macroPreset === "fitness") {
      proteinPerKg = maxProteinPerKg; // Use maximum for fitness
    } else {
      proteinPerKg = minProteinPerKg; // Use minimum for health
    }

    const proteinGrams = Math.round(proteinPerKg * weightKg);
    const proteinCalories = proteinGrams * 4;

    // Step 2: Set fat to minimum requirement
    const fatGrams = actualMinFatGrams;
    const fatCalories = fatGrams * 9;

    // Step 3: Fill remaining calories with carbs
    const remainingCalories = calories - proteinCalories - fatCalories;
    let carbGrams = Math.floor(remainingCalories / 4);

    // Ensure carbs meet minimum requirements
    carbGrams = Math.max(carbGrams, minCarbGrams);

    // Check if carbs exceed maximum percentage
    const carbCalories = carbGrams * 4;
    const carbPercent = carbCalories / calories;

    if (carbPercent > maxCarbPercent) {
      // If carbs hit maximum, distribute remaining calories between fat and protein
      const maxCarbCalories = calories * maxCarbPercent;
      const excessCalories = carbCalories - maxCarbCalories;

      // Reduce carbs to maximum
      carbGrams = Math.floor(maxCarbCalories / 4);

      // Distribute excess calories between fat and protein (60% fat, 40% protein)
      const fatIncrease = Math.floor((excessCalories * 0.6) / 9);
      const proteinIncrease = Math.floor((excessCalories * 0.4) / 4);

      // Update fat and protein
      const newFatGrams = fatGrams + fatIncrease;
      const newProteinGrams = proteinGrams + proteinIncrease;

      return {
        protein: newProteinGrams,
        carbs: carbGrams,
        fat: newFatGrams,
      };
    }

    const result = {
      protein: proteinGrams,
      carbs: carbGrams,
      fat: fatGrams,
    };

    console.log("Macro result:", result);
    console.log(
      `Fat calculation: ${fatGrams}g fat (${(fatGrams / weightKg).toFixed(
        2
      )}g/kg) for ${weightKg}kg user`
    );
    return result;
  };

  // Get macro recommendations based on preset and goal
  const recommendedMacros = useMemo(() => {
    return calculateMacros();
  }, [
    targetCalories,
    weightKg,
    macroPreset,
    strategy,
    manualProtein,
    manualCarbs,
    manualFat,
    macroUpdateKey,
  ]);

  // Get the current macros to display (manual if enabled, otherwise calculated)
  const currentMacros = useMemo(() => {
    console.log("=== CALCULATING CURRENT MACROS ===");
    console.log("useManualMacros:", useManualMacros);
    console.log("manualProtein:", manualProtein, "type:", typeof manualProtein);
    console.log("manualCarbs:", manualCarbs, "type:", typeof manualCarbs);
    console.log("manualFat:", manualFat, "type:", typeof manualFat);

    if (useManualMacros) {
      const result = {
        protein: parseInt(manualProtein) || 0,
        carbs: parseInt(manualCarbs) || 0,
        fat: parseInt(manualFat) || 0,
      };
      console.log("Using manual macros:", result);
      return result;
    }
    console.log("Using recommended macros:", recommendedMacros);
    return recommendedMacros;
  }, [
    useManualMacros,
    manualProtein,
    manualCarbs,
    manualFat,
    recommendedMacros,
    macroUpdateKey, // Add this to force recalculation
  ]);

  const handleSave = async () => {
    console.log("=== SAVE DEBUG ===");
    console.log("useManualMacros:", useManualMacros);
    console.log("manualProtein:", manualProtein);
    console.log("manualCarbs:", manualCarbs);
    console.log("manualFat:", manualFat);
    console.log("targetCalories:", targetCalories);

    // Validate manual macros if enabled
    if (useManualMacros) {
      const proteinGrams = parseInt(manualProtein) || 0;
      const carbGrams = parseInt(manualCarbs) || 0;
      const fatGrams = parseInt(manualFat) || 0;

      const totalCalories = proteinGrams * 4 + carbGrams * 4 + fatGrams * 9;

      console.log("Calculated total calories:", totalCalories);
      console.log("Target calories:", targetCalories);
      console.log("Exceeds target?", totalCalories > targetCalories);

      // Check if macros exceed target
      if (totalCalories > 0 && totalCalories > targetCalories) {
        alert(
          `Macro calories (${totalCalories}) exceed your calorie goal (${targetCalories}). Please adjust your macros.`
        );
        return;
      }

      // Check if macros are too low (less than 80% of target)
      if (totalCalories > 0 && totalCalories < targetCalories * 0.8) {
        const deficit = targetCalories - totalCalories;

        // Get target percentages based on preset and strategy
        let targetProteinPercent, targetCarbPercent, targetFatPercent;

        if (macroPreset === "health") {
          if (strategy === "lose") {
            targetProteinPercent = 0.25;
            targetCarbPercent = 0.5;
            targetFatPercent = 0.25;
          } else {
            targetProteinPercent = 0.2;
            targetCarbPercent = 0.55;
            targetFatPercent = 0.25;
          }
        } else if (macroPreset === "fitness") {
          if (strategy === "lose") {
            targetProteinPercent = 0.35;
            targetCarbPercent = 0.45;
            targetFatPercent = 0.2;
          } else {
            targetProteinPercent = 0.25;
            targetCarbPercent = 0.55;
            targetFatPercent = 0.2;
          }
        } else {
          targetProteinPercent = 0.2;
          targetCarbPercent = 0.55;
          targetFatPercent = 0.25;
        }

        // Calculate how much to add to each macro based on target percentages
        const proteinCaloriesToAdd = deficit * targetProteinPercent;
        const carbCaloriesToAdd = deficit * targetCarbPercent;
        const fatCaloriesToAdd = deficit * targetFatPercent;

        const proteinGramsToAdd = Math.floor(proteinCaloriesToAdd / 4);
        const carbGramsToAdd = Math.floor(carbCaloriesToAdd / 4);
        const fatGramsToAdd = Math.floor(fatCaloriesToAdd / 9);

        Alert.alert(
          "Low Macro Calories",
          `Your macros are quite low (${totalCalories}/${targetCalories} calories). Would you like to fill the remaining ${deficit} calories according to your preset? (Protein: +${proteinGramsToAdd}g, Carbs: +${carbGramsToAdd}g, Fat: +${fatGramsToAdd}g)`,
          [
            {
              text: "No",
              style: "cancel",
            },
            {
              text: "Yes",
              onPress: () => {
                setManualProtein((proteinGrams + proteinGramsToAdd).toString());
                setManualCarbs((carbGrams + carbGramsToAdd).toString());
                setManualFat((fatGrams + fatGramsToAdd).toString());

                // Recalculate with new macros
                const newTotalCalories =
                  (proteinGrams + proteinGramsToAdd) * 4 +
                  (carbGrams + carbGramsToAdd) * 4 +
                  (fatGrams + fatGramsToAdd) * 9;
                console.log(
                  "Auto-filled macros. New total calories:",
                  newTotalCalories
                );
              },
            },
          ]
        );
      }
    }

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
      useImperialUnits: userGoals?.useImperialUnits || false,
    } as const;

    console.log("Saving goals:", goals);
    console.log("Manual macros enabled:", useManualMacros);
    console.log("Manual protein:", manualProtein);
    console.log("Manual carbs:", manualCarbs);
    console.log("Manual fat:", manualFat);

    try {
      console.log("About to call setUserGoals with:", goals);
      await setUserGoals(goals);
      console.log("Goals saved successfully!");
      console.log("About to navigate back");
      router.back();
      console.log("Navigation called");
    } catch (error) {
      console.error("Error saving goals:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  const handleCalorieEdit = () => {
    setTempCalories(targetCalories.toString());
    setIsEditingCalories(true);

    // Scroll to make the calorie input visible
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 400, // Scroll down to show the calorie section
        animated: true,
      });
    }, 100);
  };

  const handleCalorieSave = () => {
    const newCalories = parseInt(tempCalories);
    if (newCalories && newCalories > 0) {
      // Calculate the delta from TDEE
      const delta = newCalories - tdee;

      // Validate delta is within reasonable bounds
      const maxDelta = 1000; // Maximum 1000 calorie surplus/deficit
      const minDelta = -1000; // Minimum -1000 calorie deficit

      if (delta > maxDelta) {
        alert(
          `Calorie adjustment too high. Maximum allowed: +${maxDelta} calories`
        );
        return;
      }

      if (delta < minDelta) {
        alert(
          `Calorie deficit too high. Maximum allowed: ${minDelta} calories`
        );
        return;
      }

      setCustomDelta(delta.toString());
      setPace("custom");
    }
    setIsEditingCalories(false);
  };

  const handleCalorieCancel = () => {
    setIsEditingCalories(false);
    setTempCalories("");
  };

  // Check for low fat warning
  const getFatWarning = () => {
    const fatGrams = useManualMacros
      ? parseInt(manualFat) || calculatedMacros.fat
      : calculatedMacros.fat;

    const fatPerKg = fatGrams / weightKg;
    const fatPercent = (fatGrams * 9) / targetCalories;
    const minFatPerKg = 0.8; // Minimum 0.8g/kg for hormonal health
    const minFatPercent = 0.15; // Minimum 15% of total calories

    if (fatPerKg < minFatPerKg || fatPercent < minFatPercent) {
      return `⚠️ Low fat intake: ${fatPerKg.toFixed(1)}g/kg (${(
        fatPercent * 100
      ).toFixed(1)}%) - minimum 0.8g/kg or 15% recommended for hormonal health`;
    }
    return null;
  };

  // Smart macro balancing functions with proper constraints
  const balanceMacros = (
    changedMacro: "protein" | "carbs" | "fat",
    newValue: number
  ) => {
    const currentProtein = parseInt(manualProtein) || calculatedMacros.protein;
    const currentCarbs = parseInt(manualCarbs) || calculatedMacros.carbs;
    const currentFat = parseInt(manualFat) || calculatedMacros.fat;

    // Define constraints based on preset and strategy
    let minProteinPerKg,
      maxProteinPerKg,
      minFatPercent,
      maxFatPercent,
      minCarbPercent,
      maxCarbPercent,
      minCarbGrams;

    if (macroPreset === "health") {
      minProteinPerKg = 1.2;
      maxProteinPerKg = 1.6;
      minFatPercent = 0.15;
      maxFatPercent = 0.35;
      minCarbPercent = 0.45;
      maxCarbPercent = 0.65;
      minCarbGrams = 0;
    } else if (macroPreset === "fitness") {
      if (strategy === "lose") {
        minProteinPerKg = 2.0;
        maxProteinPerKg = 2.6;
        minFatPercent = 0.15;
        maxFatPercent = 0.3;
        minCarbPercent = 0;
        maxCarbPercent = 0.45;
        minCarbGrams = 100;
      } else {
        minProteinPerKg = 1.6;
        maxProteinPerKg = 2.2;
        minFatPercent = 0.15;
        maxFatPercent = 0.25;
        minCarbPercent = 0;
        maxCarbPercent = 0.6;
        minCarbGrams = 100;
      }
    } else {
      minProteinPerKg = 1.2;
      maxProteinPerKg = 1.6;
      minFatPercent = 0.15;
      maxFatPercent = 0.35;
      minCarbPercent = 0.45;
      maxCarbPercent = 0.65;
      minCarbGrams = 0;
    }

    // Calculate constraints in grams
    const minProtein = Math.ceil(minProteinPerKg * weightKg);
    const maxProtein = Math.floor(maxProteinPerKg * weightKg);
    const minFat = Math.ceil(
      Math.max(0.8 * weightKg, (targetCalories * minFatPercent) / 9)
    );
    const maxFat = Math.floor((targetCalories * maxFatPercent) / 9);
    const minCarbs = Math.max(
      minCarbGrams,
      Math.ceil((targetCalories * minCarbPercent) / 4)
    );
    const maxCarbs = Math.floor((targetCalories * maxCarbPercent) / 4);

    // Constrain the input value to proper limits
    let constrainedValue = newValue;
    if (changedMacro === "protein") {
      constrainedValue = Math.min(Math.max(newValue, minProtein), maxProtein);
    } else if (changedMacro === "carbs") {
      constrainedValue = Math.min(Math.max(newValue, minCarbs), maxCarbs);
    } else if (changedMacro === "fat") {
      constrainedValue = Math.min(Math.max(newValue, minFat), maxFat);
    }

    let newProtein = currentProtein;
    let newCarbs = currentCarbs;
    let newFat = currentFat;

    // Update the changed macro with constrained value
    if (changedMacro === "protein") newProtein = constrainedValue;
    else if (changedMacro === "carbs") newCarbs = constrainedValue;
    else if (changedMacro === "fat") newFat = constrainedValue;

    // Calculate remaining calories after the change
    const proteinCalories = newProtein * 4;
    const fatCalories = newFat * 9;
    const remainingCalories = targetCalories - proteinCalories - fatCalories;

    // Distribute remaining calories to carbs, respecting constraints
    if (remainingCalories > 0) {
      const carbCalories = Math.min(remainingCalories, maxCarbs * 4);
      newCarbs = Math.floor(carbCalories / 4);

      // If carbs hit maximum, distribute excess to fat
      const excessCalories = remainingCalories - carbCalories;
      if (excessCalories > 0) {
        const additionalFat = Math.min(excessCalories / 9, maxFat - newFat);
        newFat = Math.floor(newFat + additionalFat);
      }
    } else {
      // If not enough calories, reduce carbs first, then fat
      const deficit = Math.abs(remainingCalories);
      const carbsToReduce = Math.min(
        newCarbs - minCarbs,
        Math.ceil(deficit / 4)
      );
      newCarbs = Math.max(minCarbs, newCarbs - carbsToReduce);

      const remainingDeficit = deficit - carbsToReduce * 4;
      if (remainingDeficit > 0) {
        const fatToReduce = Math.min(
          newFat - minFat,
          Math.ceil(remainingDeficit / 9)
        );
        newFat = Math.max(minFat, newFat - fatToReduce);
      }
    }

    // Final constraint check to prevent oscillation
    newProtein = Math.min(Math.max(newProtein, minProtein), maxProtein);
    newCarbs = Math.min(Math.max(newCarbs, minCarbs), maxCarbs);
    newFat = Math.min(Math.max(newFat, minFat), maxFat);

    return { protein: newProtein, carbs: newCarbs, fat: newFat };
  };

  const handleMacroChange = (
    macro: "protein" | "carbs" | "fat",
    value: string
  ) => {
    // Allow free input without aggressive balancing
    if (macro === "protein") setManualProtein(value);
    else if (macro === "carbs") setManualCarbs(value);
    else if (macro === "fat") setManualFat(value);
  };

  // Reset manual macros when user turns off manual macros
  useEffect(() => {
    if (!useManualMacros) {
      setManualProtein("");
      setManualCarbs("");
      setManualFat("");
    }
  }, [useManualMacros]);

  // Force macro recalculation when preset changes
  useEffect(() => {
    console.log("Preset changed to:", macroPreset);
    setMacroUpdateKey((prev) => prev + 1);
    // Update calculated macros directly
    const newMacros = calculateMacros();
    setCalculatedMacros(newMacros);
  }, [macroPreset, targetCalories, weightKg, strategy]);

  // Handle keyboard events for macro inputs
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        // Only scroll to bottom for macro inputs, not for calories
        if (!isEditingCalories) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({
              animated: true,
            });
          }, 100);
        } else {
          // For calories editing, ensure the input is visible
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: 450, // Scroll a bit more to ensure input is visible above keyboard
              animated: true,
            });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, [isEditingCalories]);

  // Handle macro input focus
  const handleMacroFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weight</Text>
              <Text style={styles.statValue}>
                {userGoals?.useImperialUnits
                  ? `${Math.round(weightKg * 2.20462)} lbs`
                  : `${Math.round(weightKg)} kg`}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>
                {userGoals?.useImperialUnits
                  ? (() => {
                      const totalInches = Math.round(heightCm / 2.54);
                      const feet = Math.floor(totalInches / 12);
                      const inches = totalInches % 12;
                      return `${feet}ft ${inches}in`;
                    })()
                  : `${Math.round(heightCm)} cm`}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>{age} years</Text>
            </View>
          </View>
          {/* Removed BMR/TDEE helper text per request */}
        </View>

        {/* Goal Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal</Text>

          <View style={styles.segmentedContainer}>
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
            {getFatWarning() && (
              <Text style={styles.warningText}>{getFatWarning()}</Text>
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
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Macros</Text>
            <TouchableOpacity
              onPress={() => setShowMacroExplanation(true)}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.presetContainer}>
            <Text style={styles.presetLabel}>Macro Preset:</Text>
            <View style={styles.presetButtons}>
              <TouchableOpacity
                style={[
                  styles.presetButton,
                  macroPreset === "health" && styles.presetButtonActive,
                ]}
                onPress={() => {
                  console.log("Health preset pressed");
                  setMacroPreset("health");
                  setUseManualMacros(false); // Turn off manual macros when switching presets
                }}
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
                onPress={() => {
                  console.log("Fitness preset pressed");
                  setMacroPreset("fitness");
                  setUseManualMacros(false); // Turn off manual macros when switching presets
                }}
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

          <View style={styles.switchRow}>
            <View style={styles.manualMacroLabelContainer}>
              <Text style={styles.switchLabel}>Manual macros?</Text>
              <Text style={styles.switchSubtext}>Adjust individual macros</Text>
            </View>
            <Switch
              value={useManualMacros}
              onValueChange={(value) => {
                setUseManualMacros(value);
                if (value) {
                  // When enabling manual macros, populate with current preset values
                  setManualProtein(calculatedMacros.protein.toString());
                  setManualCarbs(calculatedMacros.carbs.toString());
                  setManualFat(calculatedMacros.fat.toString());
                }
              }}
            />
          </View>

          <View style={styles.macroSummary}>
            {useManualMacros && (
              <View style={styles.calorieTotalRow}>
                <Text style={styles.calorieTotalLabel}>Total Calories:</Text>
                <Text
                  style={[
                    styles.calorieTotalValue,
                    (() => {
                      const currentProtein = parseInt(manualProtein) || 0;
                      const currentCarbs = parseInt(manualCarbs) || 0;
                      const currentFat = parseInt(manualFat) || 0;
                      const totalCalories =
                        currentProtein * 4 + currentCarbs * 4 + currentFat * 9;
                      return totalCalories === targetCalories
                        ? styles.calorieTotalExact
                        : totalCalories > targetCalories
                        ? styles.calorieTotalOver
                        : styles.calorieTotalUnder;
                    })(),
                  ]}
                >
                  {(() => {
                    const currentProtein = parseInt(manualProtein) || 0;
                    const currentCarbs = parseInt(manualCarbs) || 0;
                    const currentFat = parseInt(manualFat) || 0;
                    return (
                      currentProtein * 4 + currentCarbs * 4 + currentFat * 9
                    );
                  })()}{" "}
                  / {targetCalories} kcal
                </Text>
              </View>
            )}
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Protein:</Text>
              {useManualMacros ? (
                <TextInput
                  style={styles.macroInput}
                  value={manualProtein}
                  onChangeText={(value) => handleMacroChange("protein", value)}
                  onFocus={handleMacroFocus}
                  keyboardType="numeric"
                  placeholder={currentMacros.protein.toString()}
                />
              ) : (
                <Text style={styles.macroValue}>{currentMacros.protein}g</Text>
              )}
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Carbs:</Text>
              {useManualMacros ? (
                <TextInput
                  style={styles.macroInput}
                  value={manualCarbs}
                  onChangeText={(value) => handleMacroChange("carbs", value)}
                  onFocus={handleMacroFocus}
                  keyboardType="numeric"
                  placeholder={currentMacros.carbs.toString()}
                />
              ) : (
                <Text style={styles.macroValue}>{currentMacros.carbs}g</Text>
              )}
            </View>
            <View style={styles.macroRow}>
              <Text style={styles.macroLabel}>Fat:</Text>
              {useManualMacros ? (
                <TextInput
                  style={styles.macroInput}
                  value={manualFat}
                  onChangeText={(value) => handleMacroChange("fat", value)}
                  onFocus={handleMacroFocus}
                  keyboardType="numeric"
                  placeholder={currentMacros.fat.toString()}
                />
              ) : (
                <Text style={styles.macroValue}>{currentMacros.fat}g</Text>
              )}
            </View>
          </View>

          {/* Fat Warning */}
          {getFatWarning() && (
            <Text style={styles.warningText}>{getFatWarning()}</Text>
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

      {/* Macro Explanation Modal */}
      <MacroExplanationModal
        visible={showMacroExplanation}
        onClose={() => setShowMacroExplanation(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  helpButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
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
  macroInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f8f9fa",
    minWidth: 60,
    textAlign: "center",
  },
  calorieTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  calorieTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  calorieTotalValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  calorieTotalExact: {
    color: "#27ae60", // Green for exact match
  },
  calorieTotalOver: {
    color: "#e74c3c", // Red for over target
  },
  calorieTotalUnder: {
    color: "#f39c12", // Orange for under target
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
