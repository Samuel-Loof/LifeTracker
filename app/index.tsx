import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  // Placeholder values until goals and exercise exist
  const caloriesEaten = 0;
  const caloriesBurned = 0;
  const caloriesGoal = 2000; // placeholder
  const caloriesLeft = Math.max(
    caloriesGoal - caloriesEaten + caloriesBurned,
    0
  );

  const proteinCurrent = 0; // g
  const proteinGoal = 150; // placeholder
  const carbsCurrent = 0;
  const carbsGoal = 250; // placeholder
  const fatCurrent = 0;
  const fatGoal = 70; // placeholder

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
          onPress={() => router.push("/components/screens/ProfileScreen")}
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
            <Text style={styles.bigCircleSub}>cal left</Text>
          </View>
          <View style={styles.bigCircleSideRow}>
            <Text style={styles.sideLabel}>{caloriesEaten} eaten</Text>
            <Text style={styles.sideLabel}>{caloriesBurned} burned</Text>
          </View>
        </View>

        {/* Macro bars */}
        <View style={styles.card}>
          <MacroBar
            label="Protein"
            current={proteinCurrent}
            goal={proteinGoal}
            color="#E57373"
          />
          <MacroBar
            label="Carbs"
            current={carbsCurrent}
            goal={carbsGoal}
            color="#FFB74D"
          />
          <MacroBar
            label="Fat"
            current={fatCurrent}
            goal={fatGoal}
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
