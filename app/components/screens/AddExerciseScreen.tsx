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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFood, Exercise } from "../FoodContext";

// API Ninjas API Configuration
const API_NINJAS_KEY = "uhl7QIpDTdOJTGoIMpeG9A==l9fIoavV9RPXLBTd";

interface ApiNinjasExerciseResult {
  name: string;
  calories_per_hour: number;
  duration_minutes?: number;
  total_calories?: number;
}

interface ApiNinjasResponse extends Array<ApiNinjasExerciseResult> {}

export default function AddExerciseScreen() {
  const router = useRouter();
  const {
    exercises,
    addExercise,
    updateExercise,
    removeExercise,
    getExercisesForDate,
    userGoals,
  } = useFood();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "api">("api");
  const [manualCalories, setManualCalories] = useState("");
  const [manualExerciseName, setManualExerciseName] = useState("");
  const [apiQuery, setApiQuery] = useState("");
  const [apiResults, setApiResults] = useState<ApiNinjasExerciseResult[]>([]);
  const [loadingAPI, setLoadingAPI] = useState(false);
  const [duration, setDuration] = useState("60");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState("");

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

  // Fetch exercises from API when query changes
  useEffect(() => {
    const searchExercises = async () => {
      if (!apiQuery.trim()) {
        // If query is empty, fetch a default list or clear results
        setApiResults([]);
        return;
      }

      if (!userGoals || typeof userGoals.weightKg !== 'number' || userGoals.weightKg <= 0) {
        return;
      }

      setLoadingAPI(true);
      try {
        // Convert weight from kg to pounds
        const weightLbs = Math.round(userGoals.weightKg * 2.20462);
        const durationMinutes = parseInt(duration) || 60;
        
        // Ensure weight is within API limits (50-500 lbs)
        const validWeight = Math.max(50, Math.min(500, weightLbs));

        const url = `https://api.api-ninjas.com/v1/caloriesburned?activity=${encodeURIComponent(apiQuery)}&weight=${validWeight}&duration=${durationMinutes}`;
        
        const response = await fetch(url, {
          headers: {
            "X-Api-Key": API_NINJAS_KEY,
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: ApiNinjasResponse = await response.json();
        if (data && data.length > 0) {
          // Add duration to each result
          const resultsWithDuration = data.map((item) => ({
            ...item,
            duration_minutes: durationMinutes,
            total_calories: item.calories_per_hour ? Math.round((item.calories_per_hour / 60) * durationMinutes) : 0,
          }));
          setApiResults(resultsWithDuration);
        } else {
          setApiResults([]);
        }
      } catch (error: any) {
        console.error("Error fetching exercise data:", error);
        setApiResults([]);
      } finally {
        setLoadingAPI(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchExercises();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [apiQuery, duration, userGoals]);

  const handleSelectAPIExercise = (result: ApiNinjasExerciseResult) => {
    const exercise: Exercise = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: result.name,
      caloriesBurned: result.total_calories || Math.round((result.calories_per_hour / 60) * (result.duration_minutes || 60)),
      duration: result.duration_minutes || parseInt(duration) || 60,
      timestamp: new Date(currentDate),
      isFromAPI: true,
    };

    addExercise(exercise);
    setShowAddModal(false);
    setApiQuery("");
    setApiResults([]);
    setDuration("60");
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                const weight = userGoals?.weightKg;
                const hasValidWeight = userGoals && 
                  weight !== null && 
                  weight !== undefined && 
                  (typeof weight === 'number' ? !isNaN(weight) && weight > 0 : false);
                
                if (!hasValidWeight) {
                  Alert.alert(
                    "Profile Required",
                    "Please set up your profile (weight) in User Profile to use exercise lookup"
                  );
                  return;
                }
                setAddMode("api");
                setShowAddModal(true);
              }}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
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
                <TouchableOpacity
                  style={styles.exerciseInfo}
                  onPress={() => {
                    if (exercise.duration) {
                      setEditingExerciseId(exercise.id);
                      setEditingDuration(exercise.duration.toString());
                    }
                  }}
                  activeOpacity={exercise.duration ? 0.7 : 1}
                >
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCalories}>
                    {exercise.caloriesBurned} kcal
                  </Text>
                  {editingExerciseId === exercise.id ? (
                    <View style={styles.editDurationContainer}>
                      <TextInput
                        style={styles.editDurationInput}
                        value={editingDuration}
                        onChangeText={setEditingDuration}
                        placeholder="Duration (min)"
                        keyboardType="numeric"
                        autoFocus
                        onBlur={() => {
                          const newDuration = parseInt(editingDuration);
                          if (newDuration > 0 && exercise.isFromAPI && userGoals) {
                            // Recalculate calories based on new duration
                            const weightLbs = Math.round(userGoals.weightKg * 2.20462);
                            const validWeight = Math.max(50, Math.min(500, weightLbs));
                            // We need to fetch the exercise again to get calories_per_hour
                            // For now, we'll calculate based on the ratio
                            const oldDuration = exercise.duration || 60;
                            const caloriesPerMinute = exercise.caloriesBurned / oldDuration;
                            const newCalories = Math.round(caloriesPerMinute * newDuration);
                            updateExercise(exercise.id, {
                              duration: newDuration,
                              caloriesBurned: newCalories,
                            });
                          } else if (newDuration > 0) {
                            updateExercise(exercise.id, {
                              duration: newDuration,
                            });
                          }
                          setEditingExerciseId(null);
                          setEditingDuration("");
                        }}
                        onSubmitEditing={() => {
                          const newDuration = parseInt(editingDuration);
                          if (newDuration > 0 && exercise.isFromAPI && userGoals) {
                            const weightLbs = Math.round(userGoals.weightKg * 2.20462);
                            const validWeight = Math.max(50, Math.min(500, weightLbs));
                            const oldDuration = exercise.duration || 60;
                            const caloriesPerMinute = exercise.caloriesBurned / oldDuration;
                            const newCalories = Math.round(caloriesPerMinute * newDuration);
                            updateExercise(exercise.id, {
                              duration: newDuration,
                              caloriesBurned: newCalories,
                            });
                          } else if (newDuration > 0) {
                            updateExercise(exercise.id, {
                              duration: newDuration,
                            });
                          }
                          setEditingExerciseId(null);
                          setEditingDuration("");
                        }}
                      />
                      <Text style={styles.editDurationLabel}>min</Text>
                    </View>
                    ) : (
                      exercise.duration && (
                        <Text style={styles.exerciseDuration}>
                          {exercise.duration} min • Tap to edit
                        </Text>
                      )
                    )}
                </TouchableOpacity>
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
          setDuration("60");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setApiQuery("");
                  setApiResults([]);
                  setDuration("60");
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
                {(() => {
                  // More robust check: handle null, undefined, 0, NaN, and string cases
                  const weight = userGoals?.weightKg;
                  const hasValidWeight = userGoals && 
                    weight !== null && 
                    weight !== undefined && 
                    (typeof weight === 'number' ? !isNaN(weight) && weight > 0 : false);
                  
                  return !hasValidWeight ? (
                    <View style={styles.warningContainer}>
                      <Text style={styles.warningText}>
                        Please set up your profile (weight) in User Profile to use exercise lookup
                      </Text>
                    </View>
                  ) : null;
                })()}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Search for exercise
                  </Text>
                  <Text style={styles.inputHint}>
                    Search by activity name (e.g., "running", "cycling")
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={apiQuery}
                    onChangeText={setApiQuery}
                    placeholder="Enter exercise name..."
                    autoFocus
                    editable={!!(userGoals && typeof userGoals.weightKg === 'number' && userGoals.weightKg > 0)}
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    Duration (minutes)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="60"
                    keyboardType="numeric"
                    editable={!!(userGoals && typeof userGoals.weightKg === 'number' && userGoals.weightKg > 0)}
                  />
                </View>

                {loadingAPI && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2c3e50" />
                    <Text style={styles.loadingText}>Searching...</Text>
                  </View>
                )}

                {!loadingAPI && apiQuery.trim() && apiResults.length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No exercises found. Try a different search term.
                    </Text>
                  </View>
                )}

                {apiResults.length > 0 && (
                  <View style={styles.resultsWrapper}>
                    <ScrollView style={styles.resultsContainer} nestedScrollEnabled>
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
                              {result.total_calories || Math.round((result.calories_per_hour / 60) * (result.duration_minutes || 60))} kcal •{" "}
                              {result.duration_minutes || parseInt(duration) || 60} min
                            </Text>
                          </View>
                          <Text style={styles.resultArrow}>→</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: "90%",
  },
  modalContent: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
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
  resultsWrapper: {
    marginTop: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  resultsContainer: {
    maxHeight: 276,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
  },
  noResultsContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  warningContainer: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  warningText: {
    fontSize: 14,
    color: "#856404",
    textAlign: "center",
  },
  editDurationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  editDurationInput: {
    borderWidth: 1,
    borderColor: "#2c3e50",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 100,
    backgroundColor: "white",
  },
  editDurationLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
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

