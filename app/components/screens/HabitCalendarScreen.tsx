import React, { useMemo, useState, useRef, useEffect } from "react";
import { Dimensions, PanResponder } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useHabits, HabitEntry } from "../HabitContext";

const formatISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function HabitCalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ habitId?: string }>();
  const habitId = params.habitId as string;

  const { habits, habitEntries, setHabitDayStatus, updateHabit } =
    useHabits() as any;

  // Calendar state: current month and year
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const scrollRef = useRef<ScrollView>(null);
  const screenWidth = Dimensions.get("window").width;
  const contentHorizontalPadding = 40; // matches content paddingHorizontal ~20 on each side
  const gapSize = 6; // grid gap
  const columns = 7;
  const cellPixelWidth = useMemo(() => {
    const usable =
      screenWidth - contentHorizontalPadding - gapSize * (columns - 1);
    return Math.floor(usable / columns);
  }, [screenWidth]);
  const cellPixelHeight = Math.max(44, Math.floor(cellPixelWidth * 0.9));
  const [gridTopY, setGridTopY] = useState<number>(0);

  const monthSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dy) < 40,
      onPanResponderRelease: (_evt, gesture) => {
        if (Math.abs(gesture.dx) < 20) return;
        if (gesture.dx > 0) {
          const prev = new Date(currentYear, currentMonth - 1, 1);
          setCurrentMonth(prev.getMonth());
          setCurrentYear(prev.getFullYear());
        } else {
          const next = new Date(currentYear, currentMonth + 1, 1);
          setCurrentMonth(next.getMonth());
          setCurrentYear(next.getFullYear());
        }
      },
    })
  ).current;

  const habit = useMemo(
    () => habits.find((h: any) => h.id === habitId),
    [habits, habitId]
  );

  const daysInMonth = useMemo(() => {
    const first = new Date(currentYear, currentMonth, 1);
    const last = new Date(currentYear, currentMonth + 1, 0);
    const days: { date: string; label: string }[] = [];
    // Monday-first offset: JS getDay() 0=Sun..6=Sat → 0=Mon..6=Sun
    const startOffset = (first.getDay() + 6) % 7;
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: "", label: "" });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(currentYear, currentMonth, d);
      days.push({ date: formatISODate(dt), label: String(d) });
    }
    return days;
  }, [currentMonth, currentYear]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, HabitEntry[]>();
    const entries = (habitEntries || []).filter(
      (e: HabitEntry) => e.habitId === habitId
    );
    for (const e of entries) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [habitEntries, habitId]);

  // Auto-fill success for active habits: only mark TODAY (no backfill)
  useEffect(() => {
    if (!habit || !habit.isActive) return;
    const run = async () => {
      try {
        const today0 = new Date();
        today0.setHours(0, 0, 0, 0);
        const ds = formatISODate(today0);
        const hasEntry = (entriesByDate.get(ds) || []).length > 0;
        if (!hasEntry) {
          await setHabitDayStatus(habit.id, ds, "success");
        }
      } catch {}
    };
    run();
    // Re-run when entries change or habit toggles
  }, [habit, habit?.isActive, entriesByDate]);

  const getStatusForDate = (
    date: string
  ): "success" | "failure" | "skip" | "none" => {
    const entries = entriesByDate.get(date) || [];
    if (entries.some((e) => e.status === "skip")) return "skip";
    if (entries.some((e) => e.status === "failure")) return "failure";
    if (entries.some((e) => e.status === "success")) return "success";
    return "none";
  };

  if (!habit) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#666" }}>Habit not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} ref={scrollRef}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>My Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Month navigation and year switcher */}
        <View style={styles.monthRow}>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => {
              const prev = new Date(currentYear, currentMonth - 1, 1);
              setCurrentMonth(prev.getMonth());
              setCurrentYear(prev.getFullYear());
            }}
          >
            <Text style={styles.monthNavText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>
              {new Date(currentYear, currentMonth, 1).toLocaleDateString(
                undefined,
                { month: "long" }
              )}
            </Text>
            <View style={styles.yearRow}>
              <TouchableOpacity
                onPress={() => setCurrentYear((y) => y - 1)}
                style={styles.yearBtn}
              >
                <Text style={styles.yearBtnText}>–</Text>
              </TouchableOpacity>
              <Text style={styles.yearText}>{currentYear}</Text>
              <TouchableOpacity
                onPress={() => setCurrentYear((y) => y + 1)}
                style={styles.yearBtn}
              >
                <Text style={styles.yearBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={() => {
              const next = new Date(currentYear, currentMonth + 1, 1);
              setCurrentMonth(next.getMonth());
              setCurrentYear(next.getFullYear());
            }}
          >
            <Text style={styles.monthNavText}>›</Text>
          </TouchableOpacity>
        </View>
        {/* Actions row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              habit.isActive ? styles.pauseButton : styles.startButton,
            ]}
            onPress={async () => {
              const now = new Date();
              setCurrentMonth(now.getMonth());
              setCurrentYear(now.getFullYear());
              const targetActive = !habit.isActive;
              await updateHabit(habit.id, { isActive: targetActive });
              const todayIso = formatISODate(now);
              if (targetActive) {
                // Starting tracking → mark today as clean
                await setHabitDayStatus(habit.id, todayIso, "success");
              } else {
                // Pausing tracking → mark today as paused (blue)
                await setHabitDayStatus(habit.id, todayIso, "skip");
              }
            }}
          >
            <Text style={styles.actionButtonText}>
              {habit.isActive ? "Pause Tracking" : "Start Tracking"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.relapseButton]}
            onPress={() => {
              const now = new Date();
              setCurrentMonth(now.getMonth());
              setCurrentYear(now.getFullYear());
              setHabitDayStatus(habit.id, formatISODate(now), "failure");
            }}
          >
            <Text style={styles.actionButtonText}>✗ Mark Relapse</Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { marginRight: 12 }]}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: "#e8f5e9", borderColor: "#4CAF50" },
              ]}
            />
            <Text style={[styles.legendText, { marginLeft: 6 }]}>
              Green = Clean
            </Text>
          </View>
          <View style={[styles.legendItem, { marginRight: 12 }]}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: "#e8f0fe", borderColor: "#3b82f6" },
              ]}
            />
            <Text style={[styles.legendText, { marginLeft: 6 }]}>
              Blue = Paused
            </Text>
          </View>
          <View style={[styles.legendItem, { marginRight: 12 }]}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: "#fdecea", borderColor: "#e74c3c" },
              ]}
            />
            <Text style={[styles.legendText, { marginLeft: 6 }]}>
              Red = Relapse
            </Text>
          </View>
        </View>
        {/* Weekday header */}
        <View style={styles.weekHeader}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
            <View
              key={w}
              style={[styles.weekHeaderCell, { width: cellPixelWidth }]}
            >
              <Text style={styles.weekHeaderText}>{w}</Text>
            </View>
          ))}
        </View>
        {/* Month Grid with tap-to-cycle */}
        <View
          style={styles.grid}
          {...monthSwipeResponder.panHandlers}
          onLayout={(e) => setGridTopY(e.nativeEvent.layout.y)}
        >
          {daysInMonth.map(({ date, label }, index) => {
            const isBlank = !label;
            let status: "success" | "failure" | "none" | "skip" = isBlank
              ? "none"
              : getStatusForDate(date);
            // Do not auto-color future days; only explicit entries show blue
            const bg =
              status === "success"
                ? "#e8f5e9"
                : status === "failure"
                ? "#fdecea"
                : status === "skip"
                ? "#e8f0fe"
                : "#f0f0f0";
            const border =
              status === "success"
                ? "#4CAF50"
                : status === "failure"
                ? "#e74c3c"
                : status === "skip"
                ? "#3b82f6"
                : "#ddd";
            const nextStatus: "success" | "failure" | "none" | "skip" =
              status === "none"
                ? "success"
                : status === "success"
                ? "skip"
                : status === "skip"
                ? "failure"
                : "none";
            return (
              <TouchableOpacity
                key={`d-${currentYear}-${currentMonth}-${index}`}
                style={[
                  styles.cell,
                  {
                    width: cellPixelWidth,
                    height: cellPixelHeight,
                    backgroundColor: isBlank ? "transparent" : bg,
                    borderColor: isBlank ? "transparent" : border,
                  },
                ]}
                disabled={isBlank}
                onPress={() => {
                  if (isBlank) return;
                  setHabitDayStatus(habit.id, date, nextStatus);
                  const dayNumber = Number(label);
                  if (!isNaN(dayNumber)) {
                    const startOffset =
                      (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
                    const rowIndex = Math.floor(
                      (dayNumber - 1 + startOffset) / columns
                    );
                    const yOffset =
                      gridTopY + rowIndex * (cellPixelHeight + gapSize) - 80;
                    requestAnimationFrame(() => {
                      try {
                        scrollRef.current?.scrollTo({
                          y: Math.max(0, yOffset),
                          animated: true,
                        });
                      } catch {}
                    });
                  }
                }}
              >
                <Text style={styles.cellDay}>{label}</Text>
                <Text style={[styles.cellStatus, { color: border }]}>
                  {status === "success" ? "✓" : status === "failure" ? "✗" : ""}
                </Text>
                {/* No sublabel to keep cells clean */}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* About / Benefits link */}
        <TouchableOpacity
          style={styles.aboutButton}
          onPress={() =>
            router.push({
              pathname: "/components/screens/HabitBenefitsScreen",
              params: {
                habitId: habit.id,
                habitName: habit.name,
                habitType: habit.type,
              },
            })
          }
        >
          <Text style={styles.aboutButtonText}>{`About ${habit.name}`}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 15,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.5,
  },
  content: { padding: 20 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  monthNavText: { fontSize: 18, color: "#2c3e50", fontWeight: "700" },
  monthCenter: { alignItems: "center" },
  monthTitle: { fontSize: 16, fontWeight: "700", color: "#2c3e50" },
  yearRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  yearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  yearBtnText: { fontSize: 18, color: "#2c3e50", fontWeight: "700" },
  yearText: { marginHorizontal: 10, fontSize: 14, color: "#2c3e50" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#e8f5e9",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  pauseButton: {
    backgroundColor: "#e8f0fe",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  relapseButton: {
    backgroundColor: "#fdecea",
    borderWidth: 2,
    borderColor: "#e74c3c",
  },
  actionButtonText: {
    color: "#2c3e50",
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#555",
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  weekHeaderCell: {
    alignItems: "center",
  },
  weekHeaderText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cell: {
    // Enforce ~7 columns layout on most screens
    width: `${100 / 7 - 1.5}%`,
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  cellDay: { fontWeight: "700", color: "#2c3e50" },
  cellStatus: { marginTop: 2, fontSize: 16, fontWeight: "700" },
  cellDate: { marginTop: 2, fontSize: 11, color: "#777" },
  aboutButton: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3498db",
  },
  aboutButtonText: {
    color: "#3498db",
    fontWeight: "700",
  },
});
