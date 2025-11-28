import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useFood } from "../FoodContext";
import Svg, { Line, Polyline, Circle, Text as SvgText } from "react-native-svg";

export default function NutritionInsightsScreen() {
  const { dailyFoods, userGoals, getFoodsForDate } = useFood();

  // Get data for the last 30 days
  const last30Days = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  }, []);

  // Calculate daily totals for last 30 days
  const dailyTotals = useMemo(() => {
    return last30Days.map((date) => {
      const foods = getFoodsForDate(date);
      return {
        date,
        calories: foods.reduce(
          (sum, f) => sum + (Number(f.nutrition.calories) || 0),
          0
        ),
        protein: foods.reduce(
          (sum, f) => sum + (Number(f.nutrition.protein) || 0),
          0
        ),
        carbs: foods.reduce(
          (sum, f) => sum + (Number(f.nutrition.carbs) || 0),
          0
        ),
        fat: foods.reduce(
          (sum, f) => sum + (Number(f.nutrition.fat) || 0),
          0
        ),
      };
    });
  }, [last30Days, getFoodsForDate, dailyFoods]);

  // Calculate weekly averages
  const weeklyAverages = useMemo(() => {
    const weeks: {
      week: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }[] = [];
    for (let week = 0; week < 4; week++) {
      const weekData = dailyTotals.slice(week * 7, (week + 1) * 7);
      const avg = {
        week: week + 1,
        calories:
          weekData.reduce((sum, d) => sum + d.calories, 0) / weekData.length,
        protein:
          weekData.reduce((sum, d) => sum + d.protein, 0) / weekData.length,
        carbs:
          weekData.reduce((sum, d) => sum + d.carbs, 0) / weekData.length,
        fat: weekData.reduce((sum, d) => sum + d.fat, 0) / weekData.length,
      };
      weeks.push(avg);
    }
    return weeks;
  }, [dailyTotals]);

  // Pattern recognition
  const patterns = useMemo(() => {
    const insights: string[] = [];

    // Weekend vs weekday pattern
    const weekdayCalories: number[] = [];
    const weekendCalories: number[] = [];

    dailyTotals.forEach((day) => {
      const dayOfWeek = day.date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCalories.push(day.calories);
      } else {
        weekdayCalories.push(day.calories);
      }
    });

    if (weekdayCalories.length > 0 && weekendCalories.length > 0) {
      const avgWeekday =
        weekdayCalories.reduce((a, b) => a + b, 0) / weekdayCalories.length;
      const avgWeekend =
        weekendCalories.reduce((a, b) => a + b, 0) / weekendCalories.length;
      const diff = avgWeekend - avgWeekday;

      if (Math.abs(diff) > 100) {
        if (diff > 0) {
          insights.push(
            `You eat ${Math.round(diff)} more calories on weekends than weekdays`
          );
        } else {
          insights.push(
            `You eat ${Math.round(Math.abs(diff))} fewer calories on weekends than weekdays`
          );
        }
      }
    }

    // Protein pattern
    const avgProtein =
      dailyTotals.reduce((sum, d) => sum + d.protein, 0) /
      dailyTotals.length;
    const proteinGoal = userGoals
      ? userGoals.useManualMacros
        ? userGoals.manualProtein || 0
        : Math.round(
            (userGoals.cuttingKeepMuscle ? 2.0 : 1.6) * (userGoals.weightKg || 0)
          )
      : 0;

    if (proteinGoal > 0) {
      const proteinDiff = avgProtein - proteinGoal;
      if (proteinDiff < -20) {
        insights.push(
          `You're averaging ${Math.round(
            Math.abs(proteinDiff)
          )}g less protein than your goal`
        );
      } else if (proteinDiff > 20) {
        insights.push(
          `You're averaging ${Math.round(proteinDiff)}g more protein than your goal`
        );
      }
    }

    // Consistency pattern
    const calorieVariance =
      dailyTotals.reduce((sum, d) => {
        const avg =
          dailyTotals.reduce((s, day) => s + day.calories, 0) /
          dailyTotals.length;
        return sum + Math.pow(d.calories - avg, 2);
      }, 0) / dailyTotals.length;

    if (calorieVariance < 10000) {
      insights.push("You have very consistent calorie intake");
    } else if (calorieVariance > 50000) {
      insights.push("Your calorie intake varies significantly day-to-day");
    }

    // Trend analysis
    const firstWeekAvg =
      dailyTotals.slice(0, 7).reduce((sum, d) => sum + d.calories, 0) / 7;
    const lastWeekAvg =
      dailyTotals.slice(-7).reduce((sum, d) => sum + d.calories, 0) / 7;
    const trend = lastWeekAvg - firstWeekAvg;

    if (Math.abs(trend) > 150) {
      if (trend > 0) {
        insights.push(
          `Your calorie intake has increased by ${Math.round(trend)} kcal/week over the last month`
        );
      } else {
        insights.push(
          `Your calorie intake has decreased by ${Math.round(Math.abs(trend))} kcal/week over the last month`
        );
      }
    }

    return insights;
  }, [dailyTotals, userGoals]);

  // Goal achievement stats
  const goalStats = useMemo(() => {
    if (!userGoals) return null;

    const targetCalories = userGoals.useManualCalories
      ? userGoals.manualCalories || 0
      : (() => {
          const activityFactor: Record<string, number> = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            veryActive: 1.9,
          };
          const s = userGoals.sex === "male" ? 5 : -161;
          const bmr =
            10 * userGoals.weightKg +
            6.25 * userGoals.heightCm -
            5 * userGoals.age +
            s;
          const tdee = Math.round(bmr * (activityFactor[userGoals.activity] || 1.2));
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
                : -(userGoals.manualCalorieDelta || 0);
          }
          return Math.max(0, Math.round(tdee + delta));
        })();

    const daysMetGoal = dailyTotals.filter(
      (d) => Math.abs(d.calories - targetCalories) <= 100
    ).length;

    const avgCalories =
      dailyTotals.reduce((sum, d) => sum + d.calories, 0) /
      dailyTotals.length;

    return {
      targetCalories,
      daysMetGoal,
      totalDays: dailyTotals.length,
      achievementRate: (daysMetGoal / dailyTotals.length) * 100,
      avgCalories,
      avgDifference: avgCalories - targetCalories,
    };
  }, [dailyTotals, userGoals]);

  // Macro trends graph data
  const macroGraphData = useMemo(() => {
    if (dailyTotals.length === 0) return null;

    const width = 300;
    const height = 150;
    const paddingX = 40;
    const paddingY = 20;

    const maxValue = Math.max(
      ...dailyTotals.map((d) => Math.max(d.protein, d.carbs, d.fat))
    );

    const points = dailyTotals.map((day, index) => {
      const x =
        paddingX + (index / (dailyTotals.length - 1 || 1)) * (width - paddingX * 2);
      return {
        x,
        protein:
          paddingY +
          height -
          paddingY * 2 -
          (day.protein / maxValue) * (height - paddingY * 2),
        carbs:
          paddingY +
          height -
          paddingY * 2 -
          (day.carbs / maxValue) * (height - paddingY * 2),
        fat:
          paddingY +
          height -
          paddingY * 2 -
          (day.fat / maxValue) * (height - paddingY * 2),
      };
    });

    return { points, width, height, paddingX, paddingY };
  }, [dailyTotals]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Goal Achievement */}
        {goalStats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Goal Achievement</Text>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {Math.round(goalStats.achievementRate)}%
                </Text>
                <Text style={styles.statLabel}>Goal Met</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {goalStats.daysMetGoal}/{goalStats.totalDays}
                </Text>
                <Text style={styles.statLabel}>Days</Text>
              </View>
              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.statValue,
                    goalStats.avgDifference > 0
                      ? styles.statValueOver
                      : styles.statValueUnder,
                  ]}
                >
                  {goalStats.avgDifference > 0 ? "+" : ""}
                  {Math.round(goalStats.avgDifference)}
                </Text>
                <Text style={styles.statLabel}>Avg Diff (kcal)</Text>
              </View>
            </View>
          </View>
        )}

        {/* Pattern Recognition */}
        {patterns.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pattern Recognition</Text>
            {patterns.map((pattern, index) => (
              <View key={index} style={styles.insightItem}>
                <Text style={styles.insightIcon}>💡</Text>
                <Text style={styles.insightText}>{pattern}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Weekly Averages */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Averages (Last 4 Weeks)</Text>
          {weeklyAverages.map((week, index) => (
            <View key={index} style={styles.weekRow}>
              <Text style={styles.weekLabel}>Week {week.week}</Text>
              <View style={styles.weekStats}>
                <Text style={styles.weekStat}>
                  {Math.round(week.calories)} kcal
                </Text>
                <Text style={styles.weekStat}>
                  P: {Math.round(week.protein)}g
                </Text>
                <Text style={styles.weekStat}>
                  C: {Math.round(week.carbs)}g
                </Text>
                <Text style={styles.weekStat}>F: {Math.round(week.fat)}g</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Macro Trends Graph */}
        {macroGraphData && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macro Trends (30 Days)</Text>
            <View style={styles.graphContainer}>
              <Svg width={macroGraphData.width} height={macroGraphData.height}>
                {macroGraphData.points.length > 1 && (
                  <>
                    <Polyline
                      points={macroGraphData.points
                        .map((p) => `${p.x},${p.fat}`)
                        .join(" ")}
                      fill="none"
                      stroke="#9575CD"
                      strokeWidth="2"
                    />
                    <Polyline
                      points={macroGraphData.points
                        .map((p) => `${p.x},${p.carbs}`)
                        .join(" ")}
                      fill="none"
                      stroke="#FFB74D"
                      strokeWidth="2"
                    />
                    <Polyline
                      points={macroGraphData.points
                        .map((p) => `${p.x},${p.protein}`)
                        .join(" ")}
                      fill="none"
                      stroke="#E57373"
                      strokeWidth="2"
                    />
                  </>
                )}
              </Svg>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: "#E57373" }]}
                  />
                  <Text style={styles.legendText}>Protein</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: "#FFB74D" }]}
                  />
                  <Text style={styles.legendText}>Carbs</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: "#9575CD" }]}
                  />
                  <Text style={styles.legendText}>Fat</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Monthly Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>30-Day Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Calories:</Text>
            <Text style={styles.summaryValue}>
              {Math.round(
                dailyTotals.reduce((sum, d) => sum + d.calories, 0) /
                  dailyTotals.length
              )}{" "}
              kcal
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Protein:</Text>
            <Text style={styles.summaryValue}>
              {Math.round(
                dailyTotals.reduce((sum, d) => sum + d.protein, 0) /
                  dailyTotals.length
              )}{" "}
              g
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Carbs:</Text>
            <Text style={styles.summaryValue}>
              {Math.round(
                dailyTotals.reduce((sum, d) => sum + d.carbs, 0) /
                  dailyTotals.length
              )}{" "}
              g
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Fat:</Text>
            <Text style={styles.summaryValue}>
              {Math.round(
                dailyTotals.reduce((sum, d) => sum + d.fat, 0) /
                  dailyTotals.length
              )}{" "}
              g
            </Text>
          </View>
        </View>
      </ScrollView>
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
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  statValueOver: {
    color: "#F44336",
  },
  statValueUnder: {
    color: "#4CAF50",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#2c3e50",
    lineHeight: 20,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  weekStats: {
    flexDirection: "row",
    gap: 12,
  },
  weekStat: {
    fontSize: 12,
    color: "#666",
  },
  graphContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
});

