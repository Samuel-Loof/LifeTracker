import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useFood } from "../FoodContext";

export default function DailyIntakeScreen() {
  const router = useRouter();
  const { dailyFoods, removeFood } = useFood();
  const params = useLocalSearchParams();
  const mealType = (params.meal as string) || "all";

  // filter the foods depending on mealtime
  const mealFoods = useMemo(
    () =>
      mealType === "all"
        ? dailyFoods
        : dailyFoods.filter((food) => food.mealType === mealType),
    [dailyFoods, mealType]
  );

  // totals
  const totals = useMemo(() => {
    return mealFoods.reduce(
      (acc, f) => {
        acc.calories += Number(f.nutrition.calories) || 0;
        acc.protein += Number(f.nutrition.protein) || 0;
        acc.carbs += Number(f.nutrition.carbs) || 0;
        acc.fat += Number(f.nutrition.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [mealFoods]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Placeholder goals and premium
  const goals = { calories: 2000, protein: 150, carbs: 250, fat: 70 };
  const percent = (v: number, g: number) => (g > 0 ? Math.min(v / g, 1) : 0);
  const isPremium = false;

  return (
    <View style={styles.container}>
      {/* Header with back X */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerBackText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Today's Intake</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Big calories circle */}
        <View style={styles.bigCircleWrapper}>
          <View style={styles.bigCircle}>
            <Text style={styles.bigCircleNumber}>{totals.calories}</Text>
            <Text style={styles.bigCircleSub}>kcal eaten</Text>
          </View>
        </View>

        {/* Meal and date */}
        <Text style={styles.mealTypeText}>
          {mealType === "all" ? "All meals" : String(mealType).toUpperCase()}
        </Text>
        <Text style={styles.dateText}>{today}</Text>

        {/* Foods list */}
        {mealFoods.length === 0 ? (
          <View style={styles.cardEmpty}>
            <Text style={styles.emptyText}>No food has been added yet</Text>
          </View>
        ) : (
          mealFoods.map((food) => (
            <View key={food.id} style={styles.foodItem}>
              <TouchableOpacity
                style={styles.foodInfo}
                activeOpacity={0.8}
                onPress={() =>
                  router.push(
                    `/components/screens/EditFoodScreen?id=${food.id}`
                  )
                }
              >
                <Text style={styles.foodName}>{food.name}</Text>
                {!!food.brand && (
                  <Text style={styles.foodBrand}>{food.brand}</Text>
                )}
                <Text style={styles.foodDetails}>
                  {food.nutrition.calories} cal • {food.amount} {food.unit}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFood(food.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Summary section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>

          {/* Calories */}
          <SummaryRow
            label="Calories"
            value={`${totals.calories} kcal`}
            percentLabel={`${Math.round(
              percent(totals.calories, goals.calories) * 100
            )}%`}
            barPercent={percent(totals.calories, goals.calories)}
            color="#4CAF50"
          />

          {/* Protein with quality */}
          <SummaryRow
            label="Protein"
            value={`${totals.protein.toFixed(1)} g`}
            subLabel={isPremium ? "Avg quality:  —" : "Avg quality: 🔒"}
            barPercent={percent(totals.protein, goals.protein)}
            color="#8BC34A"
          />

          {/* Carbs with fiber, sugars */}
          <SummaryRow
            label="Carbs"
            value={`${totals.carbs.toFixed(1)} g`}
            subLabel="Fiber —   Sugars —"
            barPercent={percent(totals.carbs, goals.carbs)}
            color="#FFC107"
          />

          {/* Fat with saturated / unsaturated */}
          <SummaryRow
            label="Fat"
            value={`${totals.fat.toFixed(1)} g`}
            subLabel="Saturated —   Unsaturated —"
            barPercent={percent(totals.fat, goals.fat)}
            color="#9C27B0"
          />

          {/* Other */}
          <View style={{ height: 8 }} />
          <Text style={styles.sectionLabel}>Other</Text>
          <SummaryRow
            label="Cholesterol"
            value="—"
            barPercent={0}
            color="#90A4AE"
          />
          <SummaryRow label="Sodium" value="—" barPercent={0} color="#90A4AE" />
          <SummaryRow
            label="Potassium"
            value="—"
            barPercent={0}
            color="#90A4AE"
          />
        </View>

        {/* CTA */}
        <Link
          href={`/components/screens/AddFoodScreen?meal=${mealType}`}
          asChild
        >
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>Add More Food</Text>
          </TouchableOpacity>
        </Link>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  subLabel,
  percentLabel,
  barPercent,
  color,
}: {
  label: string;
  value: string;
  subLabel?: string;
  percentLabel?: string;
  barPercent: number;
  color: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryLabel}>{label}</Text>
          <Text style={styles.summaryValue}>{value}</Text>
        </View>
        {subLabel ? <Text style={styles.summarySub}>{subLabel}</Text> : null}
        <View style={styles.summaryBarTrack}>
          <View
            style={[
              styles.summaryBarFill,
              {
                width: `${Math.max(0, Math.min(barPercent, 1)) * 100}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
      {percentLabel ? (
        <Text style={styles.summaryPercent}>{percentLabel}</Text>
      ) : null}
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
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerBackText: {
    fontSize: 22,
    color: "#2c3e50",
    fontWeight: "700",
    lineHeight: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bigCircleWrapper: {
    alignItems: "center",
    marginBottom: 12,
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
  mealTypeText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    color: "#2c3e50",
  },
  dateText: {
    color: "#7f8c8d",
    textAlign: "center",
    marginBottom: 12,
  },
  cardEmpty: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyText: {
    color: "#7f8c8d",
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  foodBrand: {
    fontSize: 13,
    color: "#7f8c8d",
    marginTop: 2,
  },
  foodDetails: {
    fontSize: 13,
    color: "#2c3e50",
    marginTop: 4,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginLeft: 12,
  },
  removeButtonText: {
    color: "#2c3e50",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    color: "#2c3e50",
    fontWeight: "600",
  },
  summaryValue: {
    color: "#2c3e50",
    fontWeight: "600",
  },
  summarySub: {
    color: "#7f8c8d",
    fontSize: 12,
    marginBottom: 4,
  },
  summaryBarTrack: {
    height: 10,
    backgroundColor: "#f1f4f7",
    borderRadius: 6,
    overflow: "hidden",
  },
  summaryBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  summaryPercent: {
    color: "#7f8c8d",
    fontSize: 12,
    width: 40,
    textAlign: "right",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
