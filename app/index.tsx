import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useFood } from "./components/FoodContext";

export default function HomeScreen() {
  const router = useRouter();
  const { dailyFoods, userGoals } = useFood();

  // Derive totals from foods
  const totals = useMemo(() => {
    return dailyFoods.reduce(
      (acc, f) => {
        acc.calories += Number(f.nutrition.calories) || 0;
        acc.protein += Number(f.nutrition.protein) || 0;
        acc.carbs += Number(f.nutrition.carbs) || 0;
        acc.fat += Number(f.nutrition.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [dailyFoods]);

  // Compute target from userGoals
  const activityFactor: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };
  const bmr = useMemo(() => {
    if (!userGoals) return 0;
    const s = userGoals.sex === "male" ? 5 : -161;
    if (!userGoals.age || !userGoals.heightCm || !userGoals.weightKg) return 0;
    return Math.round(
      10 * userGoals.weightKg +
        6.25 * userGoals.heightCm -
        5 * userGoals.age +
        s
    );
  }, [userGoals]);
  const tdee = useMemo(() => {
    if (!userGoals) return 0;
    return Math.round(bmr * (activityFactor[userGoals.activity] || 1.2));
  }, [bmr, userGoals]);
  const targetCalories = useMemo(() => {
    if (!userGoals) return 2000;
    if (userGoals.useManualCalories && (userGoals.manualCalories || 0) > 0)
      return userGoals.manualCalories as number;
    const base = tdee || 0;
    let delta = 0;
    if (userGoals.strategy === "gain") {
      delta =
        userGoals.pace === "moderate"
          ? 500
          : userGoals.pace === "slow"
          ? 250
          : userGoals.manualCalorieDelta || 0;
    } else if (userGoals.strategy === "lose") {
      delta =
        userGoals.pace === "moderate"
          ? -500
          : userGoals.pace === "slow"
          ? -250
          : userGoals.manualCalorieDelta || 0;
    }
    return Math.max(0, Math.round(base + delta));
  }, [userGoals, tdee]);

  const goalBadge = useMemo(() => {
    if (!userGoals) return "Maintain";
    if (userGoals.useManualCalories && (userGoals.manualCalories || 0) > 0) {
      return "Custom kcal";
    }
    let delta = 0;
    if (userGoals.strategy === "gain") {
      delta =
        userGoals.pace === "moderate"
          ? 500
          : userGoals.pace === "slow"
          ? 250
          : userGoals.manualCalorieDelta || 0;
      return `Gain ${delta > 0 ? "+" : ""}${delta}`;
    }
    if (userGoals.strategy === "lose") {
      delta =
        userGoals.pace === "moderate"
          ? -500
          : userGoals.pace === "slow"
          ? -250
          : userGoals.manualCalorieDelta || 0;
      return `Lose ${delta}`;
    }
    return "Maintain";
  }, [userGoals]);

  // Macro goals
  const macroGoals = useMemo(() => {
    if (!userGoals) return { protein: 150, carbs: 250, fat: 70 };
    const weight = userGoals.weightKg || 0;
    let protein = Math.round(
      (userGoals.cuttingKeepMuscle ? 2.0 : 1.6) * weight
    );
    let fat = Math.max(Math.round(0.5 * weight), 30);
    const remaining = Math.max(targetCalories - protein * 4 - fat * 9, 0);
    let carbs = Math.round(remaining / 4);
    if (userGoals.useManualMacros) {
      protein = Math.round(userGoals.manualProtein || 0);
      carbs = Math.round(userGoals.manualCarbs || 0);
      fat = Math.round(userGoals.manualFat || 0);
    }
    return { protein, carbs, fat };
  }, [userGoals, targetCalories]);

  const caloriesLeft = Math.abs((targetCalories || 0) - (totals.calories || 0));
  const over = (totals.calories || 0) > (targetCalories || 0);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const MealRow = ({ label, mealKey }: { label: string; mealKey: string }) => (
    <View style={styles.mealRow}>
      <TouchableOpacity
        style={styles.mealInfo}
        onPress={() =>
          router.push(`/components/screens/DailyIntakeScreen?meal=${mealKey}`)
        }
        activeOpacity={0.8}
      >
        <Text style={styles.mealLabel}>{label}</Text>
        <Text style={styles.mealCalories}>0 calories</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.plusButton}
        onPress={() =>
          router.push(`/components/screens/AddFoodScreen?meal=${mealKey}`)
        }
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.plusText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 28 }} />
        <Text style={styles.headerTitle}>LifeTrack3r</Text>
        <TouchableOpacity
          onPress={() => router.push("/components/screens/UserProfileScreen")}
          style={styles.profileButton}
        >
          <Text style={styles.profileIcon}>🙂</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Big calories circle */}
        <View style={styles.bigCircleWrapper}>
          <View style={styles.bigCircle}>
            <Text style={styles.bigCircleNumber}>{caloriesLeft}</Text>
            <Text style={styles.bigCircleSub}>
              {over ? "kcal over" : "kcal left"}
            </Text>
          </View>
          <Text style={styles.goalBadge}>{goalBadge}</Text>
          <View style={styles.bigCircleSideRow}>
            <Text style={styles.sideLabel}>{totals.calories} eaten</Text>
            <Text style={styles.sideLabel}>{targetCalories} goal</Text>
          </View>
        </View>

        {/* Macro bars */}
        <View style={styles.card}>
          <MacroBar
            label="Protein"
            current={totals.protein}
            goal={macroGoals.protein}
            color="#E57373"
          />
          <MacroBar
            label="Carbs"
            current={totals.carbs}
            goal={macroGoals.carbs}
            color="#FFB74D"
          />
          <MacroBar
            label="Fat"
            current={totals.fat}
            goal={macroGoals.fat}
            color="#9575CD"
          />
        </View>

        {/* Date */}
        <Text style={styles.dateText}>{today}</Text>

        {/* Meals */}
        <MealRow label="Breakfast" mealKey="breakfast" />
        <MealRow label="Lunch" mealKey="lunch" />
        <MealRow label="Dinner" mealKey="dinner" />
        <MealRow label="Snack" mealKey="snack" />

        {/* Exercise row */}
        <View style={styles.mealRow}>
          <TouchableOpacity
            style={styles.mealInfo}
            onPress={() => router.push(`/components/screens/AddExerciseScreen`)}
            activeOpacity={0.8}
          >
            <Text style={styles.mealLabel}>Exercise</Text>
            <Text style={styles.mealCalories}>Add/Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

function MacroBar({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  const percent = goal > 0 ? Math.min(current / goal, 1) : 0;
  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValue}>{`${current}/${goal}g`}</Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${percent * 100}%`, backgroundColor: color },
          ]}
        />
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
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },
  profileButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  profileIcon: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  bigCircleWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  bigCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 14,
    borderColor: "#e6eef4",
    alignItems: "center",
    justifyContent: "center",
  },
  bigCircleNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: "#2c3e50",
  },
  bigCircleSub: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  goalBadge: {
    marginTop: 6,
    fontSize: 12,
    color: "#2c3e50",
    backgroundColor: "#fff",
    borderColor: "#eee",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bigCircleSideRow: {
    width: 220,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sideLabel: {
    color: "#7f8c8d",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 16,
  },
  macroBarRow: {
    marginBottom: 10,
  },
  macroBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  macroBarLabel: {
    color: "#2c3e50",
    fontWeight: "600",
  },
  macroBarValue: {
    color: "#7f8c8d",
  },
  macroBarTrack: {
    height: 10,
    backgroundColor: "#f1f4f7",
    borderRadius: 6,
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  dateText: {
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 12,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 10,
  },
  mealInfo: {
    flex: 1,
  },
  mealLabel: {
    color: "#2c3e50",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  mealCalories: {
    color: "#7f8c8d",
    fontSize: 13,
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3498db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF7FD",
    marginLeft: 12,
  },
  plusText: {
    fontSize: 22,
    color: "#3498db",
    fontWeight: "bold",
    lineHeight: 22,
  },
});
