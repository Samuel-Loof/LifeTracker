import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

export default function UserProfileScreen() {
  const router = useRouter();
  const { userGoals, habits } = useFood();

  const [firstName, setFirstName] = useState<string>("John");
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState<string>("30");
  const [heightCm, setHeightCm] = useState<string>("175");
  const [weightKg, setWeightKg] = useState<string>("75");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [strategy, setStrategy] = useState<GoalStrategy>("maintain");
  const [pace, setPace] = useState<GoalPace>("moderate");
  const [manualDelta, setManualDelta] = useState<string>("0");
  const [cuttingKeepMuscle, setCuttingKeepMuscle] = useState(false);

  // Load data from context
  useEffect(() => {
    if (userGoals) {
      setFirstName(userGoals.firstName || "John");
      setSex(userGoals.sex);
      setAge(userGoals.age.toString());
      setHeightCm(userGoals.heightCm.toString());
      setWeightKg(userGoals.weightKg.toString());
      setActivity(userGoals.activity);
      setStrategy(userGoals.strategy);
      setPace(userGoals.pace);
      setManualDelta((userGoals.manualCalorieDelta || 0).toString());
      setCuttingKeepMuscle(userGoals.cuttingKeepMuscle);
    }
  }, [userGoals]);

  const parsed = useMemo(
    () => ({
      age: Number(age) || 0,
      height: Number(heightCm) || 0,
      weight: Number(weightKg) || 0,
    }),
    [age, heightCm, weightKg]
  );

  // Calculate BMR using Mifflin-St Jeor equation
  const bmr = useMemo(() => {
    if (sex === "male") {
      return 10 * parsed.weight + 6.25 * parsed.height - 5 * parsed.age + 5;
    } else {
      return 10 * parsed.weight + 6.25 * parsed.height - 5 * parsed.age - 161;
    }
  }, [sex, parsed.weight, parsed.height, parsed.age]);

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
          : parseInt(manualDelta) || 0;
    } else if (strategy === "lose") {
      delta =
        pace === "moderate"
          ? -500
          : pace === "slow"
          ? -250
          : -(parseInt(manualDelta) || 0);
    }

    return Math.max(0, tdee + delta);
  }, [tdee, strategy, pace, manualDelta]);

  // Get goal description
  const getGoalDescription = () => {
    if (strategy === "maintain") return "Maintain Weight";
    if (strategy === "gain") {
      if (pace === "slow") return "Slow Gain (+250 kcal)";
      if (pace === "moderate") return "Moderate Gain (+500 kcal)";
      return `Custom Gain (+${manualDelta} kcal)`;
    }
    if (strategy === "lose") {
      if (pace === "slow") return "Slow Loss (-250 kcal)";
      if (pace === "moderate") return "Moderate Loss (-500 kcal)";
      return `Custom Loss (${manualDelta} kcal)`;
    }
    return "Maintain Weight";
  };

  // Get diet description
  const getDietDescription = () => {
    if (cuttingKeepMuscle) return "Cutting (2g/kg protein)";
    return "Standard";
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
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Your Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info Block */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{firstName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{parsed.age} years old</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Weight</Text>
            <Text style={styles.infoValue}>
              {userGoals?.useImperialUnits
                ? `${Math.round(parsed.weight * 2.20462)} lbs`
                : `${Math.round(parsed.weight)} kg`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height</Text>
            <Text style={styles.infoValue}>
              {userGoals?.useImperialUnits
                ? (() => {
                    const totalInches = Math.round(parsed.height / 2.54);
                    const feet = Math.floor(totalInches / 12);
                    const inches = totalInches % 12;
                    return `${feet}ft ${inches}in`;
                  })()
                : `${Math.round(parsed.height)} cm`}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Goal</Text>
            <Text style={styles.infoValue}>{getGoalDescription()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Diet</Text>
            <Text style={styles.infoValue}>{getDietDescription()}</Text>
          </View>

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() =>
              router.push("/components/screens/ActivityLevelScreen")
            }
          >
            <Text style={styles.infoLabel}>Activity Level</Text>
            <View style={styles.activityLevelContainer}>
              <Text style={styles.infoValue}>{getActivityDescription()}</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Calorie Goal</Text>
            <Text style={styles.infoValue}>{targetCalories} kcal/day</Text>
          </View>
        </View>

        {/* Customization Block */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customization</Text>

          <TouchableOpacity
            style={styles.customizationButton}
            onPress={() =>
              router.push("/components/screens/PersonalDetailsScreen")
            }
          >
            <Text style={styles.customizationButtonText}>Personal Details</Text>
            <Text style={styles.customizationButtonArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customizationButton}
            onPress={() =>
              router.push("/components/screens/CaloriesMacrosScreen")
            }
          >
            <Text style={styles.customizationButtonText}>
              Calories & Macros
            </Text>
            <Text style={styles.customizationButtonArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  customizationButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  customizationButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
  },
  customizationButtonArrow: {
    fontSize: 18,
    color: "#666",
  },
  clickableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
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
});
