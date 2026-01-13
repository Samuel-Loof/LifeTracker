import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter, Link, useFocusEffect } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { useFood } from "../FoodContext";
import MacroExplanationModal from "../helpers/MacroExplanationModal";

export default function DailyIntakeScreen() {
  const router = useRouter();
  const { dailyFoods, removeFood, userGoals, getFoodsForDate } = useFood();
  const params = useLocalSearchParams();
  const mealType = (params.meal as string) || "all";

  const [currentDate, setCurrentDate] = useState(() => {
    if (params.date) {
      const dateStr = params.date as string;
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        const dateFromParams = new Date(year, month - 1, day);
        dateFromParams.setHours(12, 0, 0, 0);
        return dateFromParams;
      }
    }
    return new Date();
  });
  const [showMacroExplanation, setShowMacroExplanation] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((prev) => prev + 1);
    }, [])
  );

  const mealFoods = useMemo(() => {
    const foodsForDate = getFoodsForDate(currentDate);
    return mealType === "all"
      ? foodsForDate
      : foodsForDate.filter((food) => food.mealType === mealType);
  }, [getFoodsForDate, currentDate, mealType, dailyFoods, refreshKey]);

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

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 100;
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > 50) {
        goToPreviousDay();
      } else if (gestureState.dx < -50) {
        goToNextDay();
      }
    },
  });

  const totals = useMemo(() => {
    const foodTotals = mealFoods.reduce(
      (acc, f) => {
        acc.calories += Number(f.nutrition.calories) || 0;
        acc.protein += Number(f.nutrition.protein) || 0;
        acc.carbs += Number(f.nutrition.carbs) || 0;
        acc.fat += Number(f.nutrition.fat) || 0;
        return acc;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
    
    return foodTotals;
  }, [mealFoods]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return "Today";
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isYesterday) {
      return "Yesterday";
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isTomorrow) {
      return "Tomorrow";
    }

    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
  const goals = useMemo(() => {
    // macros recommendation
    if (!userGoals)
      return { calories: targetCalories, protein: 150, carbs: 250, fat: 70 };
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
    return { calories: targetCalories, protein, carbs, fat };
  }, [userGoals, targetCalories]);
  const percent = (v: number, g: number) => (g > 0 ? Math.min(v / g, 1) : 0);
  const isPremium = true;

  const netCalories = totals.calories;
  const progress = goals.calories > 0 ? netCalories / goals.calories : 0;

  function interpolateChannel(start: number, end: number, t: number) {
    return Math.round(start + (end - start) * t);
  }

  function hexToRgb(hex: string) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return { r, g, b };
  }

  function rgbToHex(r: number, g: number, b: number) {
    const toHex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function interpolateHex(startHex: string, endHex: string, t: number) {
    const s = hexToRgb(startHex);
    const e = hexToRgb(endHex);
    return rgbToHex(
      interpolateChannel(s.r, e.r, t),
      interpolateChannel(s.g, e.g, t),
      interpolateChannel(s.b, e.b, t)
    );
  }

  function getCalorieBorderColor(p: number) {
    if (p <= 0) return "#4CAF50";
    if (p < 0.5) {
      const t = p / 0.5;
      return interpolateHex("#4CAF50", "#FF9800", t);
    }
    if (p < 1.0) {
      const t = (p - 0.5) / 0.5;
      return interpolateHex("#FF9800", "#F44336", t);
    }
    const capped = Math.min(p, 1.5);
    const t = Math.min((capped - 1) / 0.5, 1);
    return interpolateHex("#F44336", "#D32F2F", t);
  }

  const circleBorderColor = getCalorieBorderColor(progress);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerBackText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.bigCircleWrapper}>
          <View
            style={[styles.bigCircle, { borderWidth: 0, position: "relative" }]}
          >
            <Svg
              width={220}
              height={220}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {(() => {
                const strokeWidth = 12;
                const r = 110 - strokeWidth / 2 - 1;
                const cx = 110;
                const cy = 110;
                const c = 2 * Math.PI * r;
                const pct = Math.max(0, Math.min(1, progress));
                const offset = c * (1 - pct);
                return (
                  <>
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      stroke="#e6eef4"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      stroke={circleBorderColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${c} ${c}`}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      rotation={-90}
                      originX={cx}
                      originY={cy}
                      fill="none"
                    />
                  </>
                );
              })()}
            </Svg>
            <Text style={styles.bigCircleNumber}>{Math.max(0, totals.calories)}</Text>
            <Text style={styles.bigCircleSub}>kcal</Text>
          </View>
        </View>

        <View style={styles.dayNavigation}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday} style={styles.dateContainer}>
            <Text style={styles.mealTypeText}>
              {mealType === "all"
                ? "All meals"
                : String(mealType).toUpperCase()}
            </Text>
            <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

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
                    `/components/screens/FoodDetailsScreen?mode=edit&id=${
                      food.id
                    }&name=${encodeURIComponent(
                      food.name || ""
                    )}&brand=${encodeURIComponent(
                      food.brand || ""
                    )}&meal=${encodeURIComponent(
                      food.mealType || ""
                    )}&unit=${encodeURIComponent(
                      String((food as any).unit || "serving")
                    )}&amount=${encodeURIComponent(
                      String((food as any).amount || 1)
                    )}&calories=${
                      Number(food.nutrition.calories) || 0
                    }&protein=${Number(food.nutrition.protein) || 0}&carbs=${
                      Number(food.nutrition.carbs) || 0
                    }&fat=${Number(food.nutrition.fat) || 0}&fiber=${
                      Number(food.nutrition.fiber) || 0
                    }&sugars=${
                      Number(food.nutrition.sugars) || 0
                    }&saturatedFat=${
                      Number(food.nutrition.saturatedFat) || 0
                    }&unsaturatedFat=${
                      Number(food.nutrition.unsaturatedFat) || 0
                    }&cholesterol=${
                      Number(food.nutrition.cholesterol) || 0
                    }&sodium=${Number(food.nutrition.sodium) || 0}&potassium=${
                      Number(food.nutrition.potassium) || 0
                    }&barcode=${encodeURIComponent(
                      String((food as any).barcode || "")
                    )}`
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

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Summary</Text>
            <TouchableOpacity
              onPress={() => setShowMacroExplanation(true)}
              style={styles.helpButton}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </TouchableOpacity>
          </View>

          <SummaryRow
            label="Calories"
            value={`${Math.max(0, totals.calories)} kcal`}
            percentLabel={`${Math.round(
              percent(netCalories, goals.calories) * 100
            )}%`}
            barPercent={percent(netCalories, goals.calories)}
            color="#4CAF50"
          />

          {(() => {
            const proteinCalories = totals.protein * 4;
            const carbsCalories = totals.carbs * 4;
            const fatCalories = totals.fat * 9;
            const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
            const proteinPercentOfCalories = totalMacroCalories > 0 
              ? (proteinCalories / totalMacroCalories) * 100 
              : 0;

            return (
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryLabel}>Protein</Text>
                    <Text style={styles.summaryValue}>{Math.round(totals.protein)} g</Text>
                  </View>
                  <View style={styles.summaryBarTrack}>
                    <View
                      style={[
                        styles.summaryBarFill,
                        {
                          width: `${Math.max(0, Math.min(percent(totals.protein, goals.protein), 1)) * 100}%`,
                          backgroundColor: "#E57373",
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.summaryPercent}>
                  {Math.round(proteinPercentOfCalories)}%
                </Text>
              </View>
            );
          })()}

          {(() => {
            const totalFiber = mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.fiber) || 0),
              0
            );
            const totalSugars = mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.sugars) || 0),
              0
            );
            const proteinCalories = totals.protein * 4;
            const carbsCalories = totals.carbs * 4;
            const fatCalories = totals.fat * 9;
            const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
            const carbsPercentOfCalories = totalMacroCalories > 0 
              ? (carbsCalories / totalMacroCalories) * 100 
              : 0;
            const fiberPercent = totals.carbs > 0 ? Math.min(100, (totalFiber / totals.carbs) * 100) : 0;
            const sugarsPercent = totals.carbs > 0 ? Math.min(100, (totalSugars / totals.carbs) * 100) : 0;

            return (
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryLabel}>Carbs</Text>
                    <Text style={styles.summaryValue}>{Math.round(totals.carbs)} g</Text>
                  </View>
                  <View style={styles.summaryBarTrack}>
                    <View
                      style={[
                        styles.summaryBarFill,
                        {
                          width: `${Math.max(0, Math.min(percent(totals.carbs, goals.carbs), 1)) * 100}%`,
                          backgroundColor: "#FFC107",
                        },
                      ]}
                    />
                  </View>
                  {/* Sub-bars for fiber and sugars */}
                  <View style={styles.subBarContainer}>
                    <View style={styles.subBarItem}>
                      <Text style={styles.subBarLabel}>Fiber</Text>
                      <View style={styles.subBarTrack}>
                        <View
                          style={[
                            styles.subBarFill,
                            {
                              width: `${fiberPercent}%`,
                              backgroundColor: "#8BC34A",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.subBarValue}>
                        {Math.round(totalFiber)} g
                      </Text>
                    </View>
                    <View style={styles.subBarItem}>
                      <Text style={styles.subBarLabel}>Sugars</Text>
                      <View style={styles.subBarTrack}>
                        <View
                          style={[
                            styles.subBarFill,
                            {
                              width: `${sugarsPercent}%`,
                              backgroundColor: "#FF9800",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.subBarValue}>
                        {Math.round(totalSugars)} g
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.summaryPercent}>
                  {Math.round(carbsPercentOfCalories)}%
                </Text>
              </View>
            );
          })()}

          {(() => {
            const totalSaturated = mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.saturatedFat) || 0),
              0
            );
            const totalUnsaturated = mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.unsaturatedFat) || 0),
              0
            );
            const proteinCalories = totals.protein * 4;
            const carbsCalories = totals.carbs * 4;
            const fatCalories = totals.fat * 9;
            const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;
            const fatPercentOfCalories = totalMacroCalories > 0 
              ? (fatCalories / totalMacroCalories) * 100 
              : 0;
            const saturatedPercent = totals.fat > 0 ? Math.min(100, (totalSaturated / totals.fat) * 100) : 0;
            const unsaturatedPercent = totals.fat > 0 ? Math.min(100, (totalUnsaturated / totals.fat) * 100) : 0;

            return (
              <View style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryLabel}>Fat</Text>
                    <Text style={styles.summaryValue}>{Math.round(totals.fat)} g</Text>
                  </View>
                  <View style={styles.summaryBarTrack}>
                    <View
                      style={[
                        styles.summaryBarFill,
                        {
                          width: `${Math.max(0, Math.min(percent(totals.fat, goals.fat), 1)) * 100}%`,
                          backgroundColor: "#9C27B0",
                        },
                      ]}
                    />
                  </View>
                  {/* Sub-bars for saturated and unsaturated */}
                  <View style={styles.subBarContainer}>
                    <View style={styles.subBarItem}>
                      <Text style={styles.subBarLabel}>Saturated</Text>
                      <View style={styles.subBarTrack}>
                        <View
                          style={[
                            styles.subBarFill,
                            {
                              width: `${saturatedPercent}%`,
                              backgroundColor: "#E91E63",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.subBarValue}>
                        {Math.round(totalSaturated)} g
                      </Text>
                    </View>
                    <View style={styles.subBarItem}>
                      <Text style={styles.subBarLabel}>Unsaturated</Text>
                      <View style={styles.subBarTrack}>
                        <View
                          style={[
                            styles.subBarFill,
                            {
                              width: `${unsaturatedPercent}%`,
                              backgroundColor: "#BA68C8",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.subBarValue}>
                        {Math.round(totalUnsaturated)} g
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.summaryPercent}>
                  {Math.round(fatPercentOfCalories)}%
                </Text>
              </View>
            );
          })()}

          <View style={{ height: 8 }} />
          <Text style={styles.sectionLabel}>Other</Text>
          <SummaryRow
            label="Cholesterol"
            value={`${mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.cholesterol) || 0),
              0
            )} mg`}
            barPercent={0}
            color="#90A4AE"
          />
          <SummaryRow
            label="Sodium"
            value={`${mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.sodium) || 0),
              0
            )} mg`}
            barPercent={0}
            color="#90A4AE"
          />
          <SummaryRow
            label="Potassium"
            value={`${mealFoods.reduce(
              (a, f) => a + (Number(f.nutrition.potassium) || 0),
              0
            )} mg`}
            barPercent={0}
            color="#90A4AE"
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.fixedButtonContainer}>
        <Link
          href={`/components/screens/AddFoodScreen?meal=${mealType}&date=${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
          asChild
        >
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>Add More Food</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <MacroExplanationModal
        visible={showMacroExplanation}
        onClose={() => setShowMacroExplanation(false)}
      />
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
  bigCircleNote: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
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
  dayNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  navButtonText: {
    fontSize: 24,
    color: "#495057",
    fontWeight: "bold",
  },
  dateContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
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
  progressTrack: {
    width: 220,
    height: 8,
    borderRadius: 6,
    backgroundColor: "#f1f4f7",
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
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
  subBarContainer: {
    marginTop: 8,
    gap: 6,
  },
  subBarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subBarLabel: {
    fontSize: 11,
    color: "#666",
    width: 60,
  },
  subBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  subBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  subBarValue: {
    fontSize: 11,
    color: "#666",
    width: 40,
    textAlign: "right",
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
});
