import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from "react-native-svg";
import { useFood } from "./components/FoodContext";

export default function HomeScreen() {
  const router = useRouter();
  const { dailyFoods, userGoals, getFoodsForDate } = useFood();

  // Day navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Get foods for current date
  const foodsForDate = useMemo(() => {
    return getFoodsForDate(currentDate);
  }, [getFoodsForDate, currentDate]);

  // Get foods for next/previous day for preview
  const nextDay = useMemo(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    return next;
  }, [currentDate]);

  const prevDay = useMemo(() => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    return prev;
  }, [currentDate]);

  const nextDayFoods = useMemo(() => {
    return getFoodsForDate(nextDay);
  }, [getFoodsForDate, nextDay]);

  const prevDayFoods = useMemo(() => {
    return getFoodsForDate(prevDay);
  }, [getFoodsForDate, prevDay]);

  // Derive totals from foods for current date
  const totals = useMemo(() => {
    return foodsForDate.reduce(
      (acc, f) => {
        acc.calories += Number(f.nutrition.calories) || 0;
        acc.protein += Number(f.nutrition.protein) || 0;
        acc.carbs += Number(f.nutrition.carbs) || 0;
        acc.fat += Number(f.nutrition.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [foodsForDate]);

  // Day navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    console.log("Changing to previous day:", newDate.toDateString());
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    console.log("Changing to next day:", newDate.toDateString());
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    console.log("Going to today");
    setCurrentDate(new Date());
  };

  // Pan responder for velocity-based swipe gestures (like Snapchat/Tinder)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true, // Capture immediately for date navigation swipe
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes, not vertical scrolling
      return Math.abs(gestureState.dx) > 3 && Math.abs(gestureState.dy) < 100;
    },
    onPanResponderGrant: () => {
      setIsDragging(true);
      setDragOffset(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Limit drag offset to screen width
      const maxOffset = 300;
      const clampedOffset = Math.max(
        -maxOffset,
        Math.min(maxOffset, gestureState.dx)
      );
      setDragOffset(clampedOffset);
    },
    onPanResponderRelease: (evt, gestureState) => {
      setIsDragging(false);
      setDragOffset(0);

      // Velocity-based detection (like Snapchat/Tinder)
      const velocity = gestureState.vx; // horizontal velocity
      const distance = Math.abs(gestureState.dx);

      console.log(
        "Release - velocity:",
        velocity.toFixed(2),
        "distance:",
        distance.toFixed(0)
      );

      // Check for quick swipe (high velocity) OR long swipe (high distance)
      const isQuickSwipe = Math.abs(velocity) > 0.2; // Fast horizontal movement (more sensitive for date nav)
      const isLongSwipe = distance > 15; // Long horizontal movement (more sensitive for date nav)

      if ((isQuickSwipe || isLongSwipe) && gestureState.dx > 0) {
        // Swipe right - go to previous day
        console.log(
          "Going to previous day (velocity:",
          velocity.toFixed(2),
          "distance:",
          distance.toFixed(0),
          ")"
        );
        goToPreviousDay();
      } else if ((isQuickSwipe || isLongSwipe) && gestureState.dx < 0) {
        // Swipe left - go to next day
        console.log(
          "Going to next day (velocity:",
          velocity.toFixed(2),
          "distance:",
          distance.toFixed(0),
          ")"
        );
        goToNextDay();
      } else {
        console.log(
          "Swipe not fast/long enough - velocity:",
          velocity.toFixed(2),
          "distance:",
          distance.toFixed(0)
        );
      }
    },
  });

  // Format current date for display
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
  const progress =
    (targetCalories || 0) > 0
      ? (totals.calories || 0) / (targetCalories || 0)
      : 0;

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
    // 0 -> green (#4CAF50), 0.5 -> orange (#FF9800), 1.0 -> red (#F44336)
    if (p <= 0) return "#4CAF50";
    if (p < 0.5) {
      const t = p / 0.5; // 0..1
      return interpolateHex("#4CAF50", "#FF9800", t);
    }
    if (p < 1.0) {
      const t = (p - 0.5) / 0.5; // 0..1
      return interpolateHex("#FF9800", "#F44336", t);
    }
    // Over target → deepen red towards #D32F2F as p grows beyond 1
    const capped = Math.min(p, 1.5); // cap the effect
    const t = Math.min((capped - 1) / 0.5, 1); // 0..1
    return interpolateHex("#F44336", "#D32F2F", t);
  }

  const circleBorderColor = getCalorieBorderColor(progress);

  // Dynamic gradient colors based on calorie intake (like Lifesum)
  const getGradientColors = (): [string, string, string] => {
    if (!targetCalories) return ["#667eea", "#764ba2", "#f093fb"]; // Default beautiful gradient

    const calorieRatio = totals.calories / targetCalories;

    if (calorieRatio < 0.3) {
      // Low calories - fresh green gradients
      return ["#a8edea", "#fed6e3", "#d299c2"];
    } else if (calorieRatio < 0.6) {
      // Medium calories - warm yellow gradients
      return ["#ffecd2", "#fcb69f", "#ff8a80"];
    } else if (calorieRatio < 0.9) {
      // Good calories - vibrant orange gradients
      return ["#ff9a9e", "#fecfef", "#fecfef"];
    } else if (calorieRatio < 1.1) {
      // Target calories - success green gradients
      return ["#a8edea", "#fed6e3", "#d299c2"];
    } else {
      // Over calories - warning red gradients
      return ["#ff9a9e", "#fad0c4", "#ffd1ff"];
    }
  };

  const gradientColors = getGradientColors();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const mealCalories = useMemo(() => {
    const sums: Record<string, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    };
    for (const f of dailyFoods) {
      const key = String((f as any).mealType || "").toLowerCase();
      if (sums.hasOwnProperty(key)) {
        sums[key] += Number((f as any).nutrition?.calories) || 0;
      }
    }
    return sums;
  }, [dailyFoods]);

  // Custom SVG Glass Icon
  const GlassIcon = ({
    fillHeight = 0,
    isFilled = false,
    isPartiallyFilled = false,
  }) => (
    <Svg width="32" height="40" viewBox="0 0 32 40">
      {/* Glass outline */}
      <Path
        d="M6 4 L6 36 L26 36 L26 4 L22 4 L22 2 L10 2 L10 4 Z"
        stroke="#4CAF50"
        strokeWidth="2"
        fill="none"
      />
      {/* Water fill */}
      {(isFilled || isPartiallyFilled) && (
        <Rect
          x="7"
          y={isFilled ? "6" : `${40 - fillHeight * 0.85 - 2}`}
          width="18"
          height={isFilled ? "28" : `${fillHeight * 0.85}`}
          fill="#2196F3"
          opacity="0.8"
        />
      )}
    </Svg>
  );

  // Custom SVG Bottle Icon
  const BottleIcon = ({
    fillHeight = 0,
    isFilled = false,
    isPartiallyFilled = false,
  }) => (
    <Svg width="32" height="40" viewBox="0 0 32 40">
      {/* Bottle outline */}
      <Path
        d="M8 4 L8 8 L12 8 L12 4 L20 4 L20 8 L24 8 L24 4 L24 36 L8 36 Z"
        stroke="#4CAF50"
        strokeWidth="2"
        fill="none"
      />
      {/* Water fill */}
      {(isFilled || isPartiallyFilled) && (
        <Rect
          x="9"
          y={isFilled ? "6" : `${40 - fillHeight * 0.85 - 2}`}
          width="14"
          height={isFilled ? "28" : `${fillHeight * 0.85}`}
          fill="#2196F3"
          opacity="0.8"
        />
      )}
    </Svg>
  );

  const WaterTracker = () => {
    const {
      waterSettings,
      addWaterIntake,
      removeWaterIntake,
      getTodayWaterIntake,
      waterIntakes,
    } = useFood();
    const todayIntake = getTodayWaterIntake();
    const containerAmount =
      waterSettings.containerType === "glass" ? 0.25 : 0.5;
    const maxContainers = Math.ceil(waterSettings.dailyGoal / containerAmount);
    const filledContainers = Math.floor(todayIntake / containerAmount);

    const handleContainerClick = (containerIndex: number) => {
      const isFilled = containerIndex < filledContainers;
      const isPartiallyFilled =
        containerIndex === filledContainers &&
        todayIntake % containerAmount > 0;

      if (isFilled || isPartiallyFilled) {
        // Remove water - find the most recent water intake and remove it
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayIntakes = waterIntakes.filter((intake) => {
          const intakeDate = new Date(intake.timestamp);
          return intakeDate >= today && intakeDate < tomorrow;
        });

        if (todayIntakes.length > 0) {
          const mostRecentIntake = todayIntakes[todayIntakes.length - 1];
          removeWaterIntake(mostRecentIntake.id);
        }
      } else {
        // Add water
        addWaterIntake(containerAmount);
      }
    };

    const handleSettingsClick = () => {
      router.push("/components/screens/WaterSettingsScreen");
    };

    const renderContainers = () => {
      const containers = [];
      for (let i = 0; i < maxContainers; i++) {
        const isFilled = i < filledContainers;
        const isPartiallyFilled =
          i === filledContainers && todayIntake % containerAmount > 0;
        const partialFillHeight = isPartiallyFilled
          ? ((todayIntake % containerAmount) / containerAmount) * 100
          : 0;

        containers.push(
          <TouchableOpacity
            key={i}
            style={styles.containerWrapper}
            onPress={() => handleContainerClick(i)}
          >
            {waterSettings.containerType === "glass" ? (
              <GlassIcon
                fillHeight={partialFillHeight}
                isFilled={isFilled}
                isPartiallyFilled={isPartiallyFilled}
              />
            ) : (
              <BottleIcon
                fillHeight={partialFillHeight}
                isFilled={isFilled}
                isPartiallyFilled={isPartiallyFilled}
              />
            )}
          </TouchableOpacity>
        );
      }
      return containers;
    };

    return (
      <View style={styles.waterCard}>
        <View style={styles.waterHeader}>
          <Text style={styles.waterTitle}>Water</Text>
          <TouchableOpacity
            onPress={handleSettingsClick}
            style={styles.waterSettingsButton}
          >
            <Text style={styles.waterSettingsText}>⋮</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.waterContent}>
          <View style={styles.waterContainer}>
            <View style={styles.containersGrid}>{renderContainers()}</View>
            <Text style={styles.waterAmount}>
              {todayIntake.toFixed(1)}L / {waterSettings.dailyGoal}L
            </Text>
            <Text style={styles.waterSubtext}>
              Tap containers to add/remove {containerAmount}L
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const MealRow = ({
    label,
    mealKey,
    foods,
    date,
  }: {
    label: string;
    mealKey: string;
    foods: any[];
    date: Date;
  }) => {
    const mealFoods = foods.filter((f) => f.mealType === mealKey);
    const mealCalories = mealFoods.reduce(
      (sum, f) => sum + (f.nutrition?.calories || 0),
      0
    );

    return (
      <View style={styles.mealRow}>
        <TouchableOpacity
          style={styles.mealInfo}
          onPress={() =>
            router.push(`/components/screens/DailyIntakeScreen?meal=${mealKey}`)
          }
          activeOpacity={0.8}
        >
          <Text style={styles.mealLabel}>{label}</Text>
          <Text style={styles.mealCalories}>{mealCalories} calories</Text>
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
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 28 }} />
        <Text style={styles.headerTitle}>LifeTrack3r</Text>
        <TouchableOpacity
          onPress={() => router.push("/components/screens/UserProfileScreen")}
          style={styles.profileButton}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Main content with gradient background */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Big calories circle (radial progress) */}
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

        {/* Day navigation */}
        <View style={styles.dayNavigation} {...panResponder.panHandlers}>
          <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday} style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
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

        {/* Water Tracker */}
        <WaterTracker />

        {/* Meals */}
        <MealRow
          label="Breakfast"
          mealKey="breakfast"
          foods={foodsForDate}
          date={currentDate}
        />
        <MealRow
          label="Lunch"
          mealKey="lunch"
          foods={foodsForDate}
          date={currentDate}
        />
        <MealRow
          label="Dinner"
          mealKey="dinner"
          foods={foodsForDate}
          date={currentDate}
        />
        <MealRow
          label="Snack"
          mealKey="snack"
          foods={foodsForDate}
          date={currentDate}
        />

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
    </LinearGradient>
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
  const currentInt = Math.round(current);
  const goalInt = Math.round(goal);
  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={styles.macroBarValue}>{`${currentInt}/${goalInt}g`}</Text>
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
  waterCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  waterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  waterTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  waterSettingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  waterSettingsText: {
    fontSize: 18,
    color: "#666",
    fontWeight: "bold",
  },
  waterContent: {
    alignItems: "center",
  },
  waterContainer: {
    alignItems: "center",
  },
  containersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  containerWrapper: {
    alignItems: "center",
    marginHorizontal: 4,
    marginBottom: 4,
  },
  waterAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  waterSubtext: {
    fontSize: 12,
    color: "#666",
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
  dateText: {
    color: "#2c3e50",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
