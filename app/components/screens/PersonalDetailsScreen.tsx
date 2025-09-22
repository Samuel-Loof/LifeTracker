import React, { useEffect, useState } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";

type Sex = "male" | "female";
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";
type GoalStrategy = "maintain" | "gain" | "lose";
type GoalPace = "slow" | "moderate" | "custom";

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { userGoals, setUserGoals } = useFood();

  const [firstName, setFirstName] = useState<string>("John");
  const [sex, setSex] = useState<Sex>("male");
  const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date(1994, 0, 1)); // Default to 30 years old
  const [heightCm, setHeightCm] = useState<string>("175");
  const [weightKg, setWeightKg] = useState<string>("75");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [strategy, setStrategy] = useState<GoalStrategy>("maintain");
  const [pace, setPace] = useState<GoalPace>("moderate");
  const [manualDelta, setManualDelta] = useState<string>("0");
  const [cuttingKeepMuscle, setCuttingKeepMuscle] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // Load data from context
  useEffect(() => {
    if (userGoals) {
      setSex(userGoals.sex);
      setHeightCm(userGoals.heightCm.toString());
      setWeightKg(userGoals.weightKg.toString());
      setActivity(userGoals.activity);
      setStrategy(userGoals.strategy);
      setPace(userGoals.pace);
      setManualDelta((userGoals.manualCalorieDelta || 0).toString());
      setCuttingKeepMuscle(userGoals.cuttingKeepMuscle);
    }
  }, [userGoals]);

  const handleSave = async () => {
    const goals = {
      sex,
      age,
      heightCm: Number(heightCm) || 0,
      weightKg: Number(weightKg) || 0,
      activity,
      strategy,
      pace,
      manualCalorieDelta: Number(manualDelta) || 0,
      useManualCalories: false,
      manualCalories: undefined,
      cuttingKeepMuscle,
      useManualMacros: false,
      manualProtein: undefined,
      manualCarbs: undefined,
      manualFat: undefined,
      minAverageProteinQuality: undefined,
      minHighQualityProteinPercent: undefined,
    } as const;
    await setUserGoals(goals);
    router.back();
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get activity level description
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
        >
          <Text style={styles.headerBackText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Details</Text>
        <View style={{ width: 36 }} />
      </View>

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
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="75"
              keyboardType="numeric"
            />
            <Text style={styles.unitLabel}>kg</Text>
          </View>
        </View>

        {/* Height */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Height</Text>
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
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                sex === "male" && styles.segmentedOptionActive,
              ]}
              onPress={() => setSex("male")}
            >
              <Text
                style={[
                  styles.segmentedText,
                  sex === "male" && styles.segmentedTextActive,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedOption,
                sex === "female" && styles.segmentedOptionActive,
              ]}
              onPress={() => setSex("female")}
            >
              <Text
                style={[
                  styles.segmentedText,
                  sex === "female" && styles.segmentedTextActive,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Goal */}
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
        </View>

        {/* Diet */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diet</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Cutting (2g/kg protein)</Text>
            <Switch
              value={cuttingKeepMuscle}
              onValueChange={setCuttingKeepMuscle}
            />
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

        <View style={{ height: 16 }} />
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
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
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
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 4,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 16,
    color: "#2c3e50",
  },
  activityContainer: {
    gap: 8,
  },
  activityOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  activityOptionActive: {
    backgroundColor: "#2c3e50",
    borderColor: "#2c3e50",
  },
  activityText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  activityTextActive: {
    color: "white",
    fontWeight: "600",
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
