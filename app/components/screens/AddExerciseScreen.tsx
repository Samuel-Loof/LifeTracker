import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useFood, Exercise } from "../FoodContext";

// Nutritionix API Configuration
// To use the Exercise Lookup feature, you need to:
// 1. Sign up for a free account at https://www.nutritionix.com/business/api
// 2. Get your App ID and App Key from the dashboard
// 3. Add them to app.json under "extra.nutritionix" or replace the values below
const NUTRITIONIX_APP_ID =
  Constants.expoConfig?.extra?.nutritionix?.appId || "YOUR_APP_ID";
const NUTRITIONIX_APP_KEY =
  Constants.expoConfig?.extra?.nutritionix?.appKey || "YOUR_APP_KEY";

interface NutritionixExerciseResult {
  name: string;
  duration_min: number;
  nf_calories: number;
}

interface NutritionixResponse {
  exercises: NutritionixExerciseResult[];
}

export default function AddExerciseScreen() {
  const router = useRouter();
  const {
    exercises,
    addExercise,
    removeExercise,
    getExercisesForDate,
    userGoals,
  } = useFood();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "api">("manual");
  const [manualCalories, setManualCalories] = useState("");
  const [manualExerciseName, setManualExerciseName] = useState("");
  const [apiQuery, setApiQuery] = useState("");
  const [apiResults, setApiResults] = useState<NutritionixExerciseResult[]>([]);
  const [loadingAPI, setLoadingAPI] = useState(false);

  const exercisesForDate = useMemo(
    () => getExercisesForDate(currentDate),
    [getExercisesForDate, currentDate, exercises]
  );

  const totalCaloriesBurned = useMemo(
    () =>
      exercisesForDate.reduce(
        (sum, exercise) => sum + exercise.caloriesBurned,
        0
      ),
    [exercisesForDate]
  );

  // Date navigation
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return "Today";
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (targetDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleAddManualExercise = () => {
    const calories = parseFloat(manualCalories);
    if (!manualExerciseName.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }
    if (isNaN(calories) || calories <= 0) {
      Alert.alert("Error", "Please enter a valid number of calories");
      return;
    }

    const exercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: manualExerciseName.trim(),
      caloriesBurned: Math.round(calories),
      timestamp: new Date(currentDate),
      isFromAPI: false,
    };

    addExercise(exercise);
    setShowAddModal(false);
    setManualCalories("");
    setManualExerciseName("");
  };

  const handleSearchAPI = async () => {
    if (!apiQuery.trim()) {
      Alert.alert("Error", "Please enter an exercise description");
      return;
    }

    if (!userGoals) {
      Alert.alert(
        "Profile Required",
        "Please set up your profile (age, sex, weight) to use exercise lookup"
      );
      return;
    }

    if (
      NUTRITIONIX_APP_ID === "YOUR_APP_ID" ||
      NUTRITIONIX_APP_KEY === "YOUR_APP_KEY"
    ) {
      Alert.alert(
        "API Credentials Required",
        "To use Exercise Lookup, please configure your Nutritionix API credentials.\n\n1. Sign up at https://www.nutritionix.com/business/api\n2. Get your App ID and App Key\n3. Add them to app.json under 'extra.nutritionix'"
      );
      return;
    }

    setLoadingAPI(true);
    try {
      // Nutritionix Exercise API
      const response = await fetch(
        "https://trackapi.nutritionix.com/v2/natural/exercise",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-app-id": NUTRITIONIX_APP_ID,
            "x-app-key": NUTRITIONIX_APP_KEY,
          },
          body: JSON.stringify({
            query: apiQuery,
            gender: userGoals.sex === "male" ? "male" : "female",
            weight_kg: userGoals.weightKg,
            height_cm: userGoals.heightCm,
            age: userGoals.age,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: NutritionixResponse = await response.json();
      if (data.exercises && data.exercises.length > 0) {
        setApiResults(data.exercises);
      } else {
        Alert.alert("No Results", "No exercises found for that description");
        setApiResults([]);
      }
    } catch (error: any) {
      console.error("Error fetching exercise data:", error);
      Alert.alert(
        "API Error",
        error.message || "Failed to fetch exercise data. Please check your API credentials."
      );
      setApiResults([]);
    } finally {
      setLoadingAPI(false);
    }
  };

  const handleSelectAPIExercise = (result: NutritionixExerciseResult) => {
    const exercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: result.name,
      caloriesBurned: Math.round(result.nf_calories),
      duration: result.duration_min,
      timestamp: new Date(currentDate),
      isFromAPI: true,
    };

    addExercise(exercise);
    setShowAddModal(false);
    setApiQuery("");
    setApiResults([]);
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeExercise(exercise.id),
        },
      ]
    );
  };

  const isToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(currentDate);
    targetDate.setHours(0, 0, 0, 0);
    return today.getTime() === targetDate.getTime();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setAddMode("manual");
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={goToPreviousDay}>
          <Text style={styles.dateNavButton}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextDay} disabled={isToday()}>
          <Text
            style={[
              styles.dateNavButton,
              isToday() && styles.dateNavButtonDisabled,
            ]}
          >
            →
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Calories Burned</Text>
          <Text style={styles.summaryValue}>{totalCaloriesBurned} kcal</Text>
          <Text style={styles.summarySubtext}>
            {exercisesForDate.length} exercise{exercisesForDate.length !== 1 ? "s" : ""} logged
          </Text>
        </View>

        {/* Exercises List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {exercisesForDate.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No exercises logged for this day
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add an exercise
              </Text>
            </View>
          ) : (
            exercisesForDate.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCalories}>
                    {exercise.caloriesBurned} kcal
                  </Text>
                  {exercise.duration && (
                    <Text style={styles.exerciseDuration}>
                      {exercise.duration} min
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteExercise(exercise)}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Exercise Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowAddModal(false);
          setApiQuery("");
          setApiResults([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setApiQuery("");
                  setApiResults([]);
                }}
              >
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  addMode === "manual" && styles.modeButtonActive,
                ]}
                onPress={() => {
                  setAddMode("manual");
                  setApiQuery("");
                  setApiResults([]);
                }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    addMode === "manual" && styles.modeButtonTextActive,
                  ]}
                >
                  Manual Entry
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  addMode === "api" && styles.modeButtonActive,
                ]}
                onPress={() => setAddMode("api")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    addMode === "api" && styles.modeButtonTextActive,
                  ]}
                >
                  Exercise Lookup
                </Text>
              </TouchableOpacity>
            </View>

            {addMode === "manual" ? (
              <View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Exercise Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualExerciseName}
                    onChangeText={setManualExerciseName}
                    placeholder="e.g., Running, Weightlifting"
                    autoFocus
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Calories Burned</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualCalories}
                    onChangeText={setManualCalories}
                    placeholder="Enter calories"
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddManualExercise}
                >
                  <Text style={styles.saveButtonText}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Describe your exercise
                  </Text>
                  <Text style={styles.inputHint}>
                    e.g., "ran 3 miles in 30 minutes" or "did 45 minutes of
                    weightlifting"
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    value={apiQuery}
                    onChangeText={setApiQuery}
                    placeholder="Enter exercise description..."
                    multiline
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    loadingAPI && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSearchAPI}
                  disabled={loadingAPI}
                >
                  {loadingAPI ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>Search Exercise</Text>
                  )}
                </TouchableOpacity>

                {apiResults.length > 0 && (
                  <View style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>Select Exercise:</Text>
                    {apiResults.map((result, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.resultItem}
                        onPress={() => handleSelectAPIExercise(result)}
                      >
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultName}>{result.name}</Text>
                          <Text style={styles.resultDetails}>
                            {Math.round(result.nf_calories)} kcal •{" "}
                            {result.duration_min} min
                          </Text>
                        </View>
                        <Text style={styles.resultArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  backButton: {
    fontSize: 24,
    color: "#2c3e50",
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2c3e50",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dateNavButton: {
    fontSize: 20,
    color: "#2c3e50",
    padding: 8,
  },
  dateNavButtonDisabled: {
    opacity: 0.3,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: "#999",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
  exerciseCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  exerciseCalories: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  exerciseDuration: {
    fontSize: 12,
    color: "#999",
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  modeToggle: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#2c3e50",
  },
  modeButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  modeButtonTextActive: {
    color: "white",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#2c3e50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsContainer: {
    marginTop: 20,
    maxHeight: 300,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 14,
    color: "#666",
  },
  resultArrow: {
    fontSize: 18,
    color: "#2c3e50",
    marginLeft: 12,
  },
});

