import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useFood,
  convertKgToLbs,
  convertLbsToKg,
  convertCmToFtIn,
  convertFtInToCm,
  UserGoals,
} from "../FoodContext";

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;
const MIN_WEIGHT_LBS = 44; // ~20kg
const MAX_WEIGHT_LBS = 882; // ~400kg
import DateTimePicker from "@react-native-community/datetimepicker";

type Sex = "male" | "female";

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { userGoals, setUserGoals, addWeightEntry, weightHistory } = useFood();

  const [firstName, setFirstName] = useState<string>("John");
  const [sex, setSex] = useState<Sex>("male");
  const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date(1994, 0, 1)); // Default to 30 years old
  const [heightCm, setHeightCm] = useState<string>("175");
  const [weightKg, setWeightKg] = useState<string>("75");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [useImperialUnits, setUseImperialUnits] = useState<boolean>(false);

  // Imperial units state
  const [heightFeet, setHeightFeet] = useState<string>("5");
  const [heightInches, setHeightInches] = useState<string>("9");
  const [weightLbs, setWeightLbs] = useState<string>("165");

  // Calculate age from date of birth
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const age = calculateAge(dateOfBirth);

  // Helper function to format weight input (convert comma to dot, limit to 2 decimals)
  const formatWeightInput = (value: string, previousValue: string): string => {
    // If empty, allow it
    if (value === "") return "";
    
    // Replace comma with dot
    let formatted = value.replace(/,/g, ".");
    // Remove any non-numeric characters except dot
    formatted = formatted.replace(/[^0-9.]/g, "");
    
    // Ensure only one dot
    const parts = formatted.split(".");
    if (parts.length > 2) {
      formatted = parts[0] + "." + parts.slice(1).join("");
    }
    
    // Limit to 2 decimal places - if trying to add more than 2 decimals, block the input
    if (parts.length === 2 && parts[1].length > 2) {
      // Return previous value to prevent the input from changing (this prevents white text)
      return previousValue;
    }
    
    return formatted;
  };

  // Validate weight range
  const validateWeight = (weight: number, isImperial: boolean): boolean => {
    if (isImperial) {
      return weight >= MIN_WEIGHT_LBS && weight <= MAX_WEIGHT_LBS;
    }
    return weight >= MIN_WEIGHT_KG && weight <= MAX_WEIGHT_KG;
  };

  // Load data from context
  useEffect(() => {
    if (userGoals) {
      setFirstName(userGoals.firstName || "John");
      setSex(userGoals.sex);
      setHeightCm(userGoals.heightCm.toString());
      // Format weight with up to 2 decimals
      setWeightKg(userGoals.weightKg.toFixed(2).replace(/\.?0+$/, ""));
      setUseImperialUnits(userGoals.useImperialUnits || false);

      // Convert to imperial units for display
      const heightFtIn = convertCmToFtIn(userGoals.heightCm);
      setHeightFeet(heightFtIn.feet.toString());
      setHeightInches(heightFtIn.inches.toString());
      // Format weight with up to 2 decimals
      const weightLbsValue = convertKgToLbs(userGoals.weightKg);
      setWeightLbs(weightLbsValue.toFixed(2).replace(/\.?0+$/, ""));

      // Calculate date of birth from age
      const today = new Date();
      const birthYear = today.getFullYear() - userGoals.age;
      setDateOfBirth(new Date(birthYear, today.getMonth(), today.getDate()));
    }
  }, [userGoals]);

  const handleSave = async () => {
    // Convert values based on units
    let finalHeightCm = Number(heightCm) || 0;
    // Parse weight - use parseFloat to handle decimals correctly
    let finalWeightKg = parseFloat(weightKg) || 0;
    
    // Validate weight before conversion
    if (!validateWeight(finalWeightKg, false)) {
      Alert.alert(
        "Invalid Weight",
        `Weight must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg`
      );
      return;
    }
    
    // Round to 2 decimal places to avoid floating point precision issues
    finalWeightKg = Math.round(finalWeightKg * 100) / 100;

    if (useImperialUnits) {
      // Convert from imperial to metric
      finalHeightCm = convertFtInToCm(
        Number(heightFeet) || 0,
        Number(heightInches) || 0
      );
      // Parse weight - use parseFloat to handle decimals correctly
      const weightLbsValue = parseFloat(weightLbs) || 0;
      
      // Validate imperial weight
      if (!validateWeight(weightLbsValue, true)) {
        Alert.alert(
          "Invalid Weight",
          `Weight must be between ${MIN_WEIGHT_LBS} and ${MAX_WEIGHT_LBS} lbs`
        );
        return;
      }
      
      finalWeightKg = convertLbsToKg(weightLbsValue);
      // Round to 2 decimal places to avoid floating point precision issues
      finalWeightKg = Math.round(finalWeightKg * 100) / 100;
    }

    // Create or update userGoals
    const updatedGoals: UserGoals = userGoals
      ? {
          ...userGoals,
          firstName,
          sex,
          age,
          heightCm: finalHeightCm,
          weightKg: finalWeightKg,
          useImperialUnits,
        }
      : {
          // Create new userGoals with defaults for required fields
          firstName,
          sex,
          age,
          heightCm: finalHeightCm,
          weightKg: finalWeightKg,
          activity: "moderate",
          strategy: "maintain",
          pace: "moderate",
          useManualCalories: false,
          cuttingKeepMuscle: false,
          useManualMacros: false,
          useImperialUnits,
        };

    await setUserGoals(updatedGoals);
    
    // Add weight entry if weight changed (always add, even on same day)
    const previousWeight = userGoals?.weightKg || 0;
    if (Math.abs(finalWeightKg - previousWeight) > 0.01) {
      await addWeightEntry(finalWeightKg);
    }
    
    router.back();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* First Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>First Name</Text>
          <TextInput
            style={styles.textInput}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
          />
        </View>

        {/* Current Weight */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Weight</Text>
          {useImperialUnits ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={weightLbs}
                onChangeText={(text) => {
                  const formatted = formatWeightInput(text, weightLbs);
                  // Only update if the value actually changed (prevents white text issue)
                  if (formatted !== weightLbs) {
                    setWeightLbs(formatted);
                  }
                }}
                placeholder="165"
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>lbs</Text>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={weightKg}
                onChangeText={(text) => {
                  const formatted = formatWeightInput(text, weightKg);
                  // Only update if the value actually changed (prevents white text issue)
                  if (formatted !== weightKg) {
                    setWeightKg(formatted);
                  }
                }}
                placeholder="75"
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>
          )}
        </View>

        {/* Units Toggle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Units</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Metric (kg/cm)</Text>
            <Switch
              value={useImperialUnits}
              onValueChange={setUseImperialUnits}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={useImperialUnits ? "#f5dd4b" : "#f4f3f4"}
            />
            <Text style={styles.switchLabel}>Imperial (lbs/ft)</Text>
          </View>
        </View>

        {/* Height */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Height</Text>
          {useImperialUnits ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={heightFeet}
                onChangeText={setHeightFeet}
                placeholder="5"
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>ft</Text>
              <TextInput
                style={styles.textInput}
                value={heightInches}
                onChangeText={setHeightInches}
                placeholder="9"
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>in</Text>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                keyboardType="numeric"
              />
              <Text style={styles.unitLabel}>cm</Text>
            </View>
          )}
        </View>

        {/* Date of Birth */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>{formatDate(dateOfBirth)}</Text>
            <Text style={styles.dateButtonArrow}>📅</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDateOfBirth(selectedDate);
                }
              }}
            />
          )}
        </View>

        {/* Gender */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gender</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                sex === "male" && styles.genderOptionActive,
              ]}
              onPress={() => setSex("male")}
            >
              <Text
                style={[
                  styles.genderText,
                  sex === "male" && styles.genderTextActive,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderOption,
                sex === "female" && styles.genderOptionActive,
              ]}
              onPress={() => setSex("female")}
            >
              <Text
                style={[
                  styles.genderText,
                  sex === "female" && styles.genderTextActive,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
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
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#2c3e50", // Explicitly set text color to black to prevent white text issue
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 16,
    color: "#666",
  },
  unitLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: "#666",
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  dateButtonArrow: {
    fontSize: 16,
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
  genderContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  genderOptionActive: {
    backgroundColor: "#2c3e50",
  },
  genderText: {
    fontSize: 16,
    color: "#666",
  },
  genderTextActive: {
    color: "white",
    fontWeight: "600",
  },
});
