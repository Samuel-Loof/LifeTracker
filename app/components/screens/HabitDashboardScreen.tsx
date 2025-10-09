import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useHabits, Habit } from "../HabitContext";
import { Switch } from "react-native";

export default function HabitDashboardScreen() {
  const router = useRouter();
  const {
    habits,
    addHabit,
    deleteHabit,
    getCurrentStreak,
    updateHabit,
    testFastingNotifications,
    testStreakNotifications,
    ensureNotificationsEnabled,
    getNotificationPermissions,
  } = useHabits();
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [customName, setCustomName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Recalculate and rerender when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      // bump key so derived values recompute visually
      setRefreshKey((k) => k + 1);
      return () => {};
    }, [])
  );

  // Default habits
  const defaultHabits = [
    {
      name: "Alcohol",
      type: "alcohol" as const,
      color: "#e74c3c",
    },
    {
      name: "Caffeine",
      type: "caffeine" as const,
      color: "#f39c12",
    },
    {
      name: "Sugar",
      type: "sugar" as const,
      color: "#9b59b6",
    },
  ];

  const handleAddDefaultHabit = async (
    habitData: (typeof defaultHabits)[0]
  ) => {
    const existingHabit = habits.find((h) => h.type === habitData.type);
    if (existingHabit) {
      Alert.alert(
        "Habit Exists",
        `${habitData.name} tracking is already active.`
      );
      return;
    }

    await addHabit({
      name: habitData.name,
      type: habitData.type,
      startDate: new Date().toISOString(),
      isActive: true,
      color: habitData.color,
    });
  };

  const handleDeleteHabit = (habit: Habit) => {
    // Repurpose delete to mean "stop tracking" while preserving history
    Alert.alert(
      "Stop Tracking",
      `Stop tracking "${habit.name}"? You can resume later and all history will remain.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop",
          style: "destructive",
          onPress: async () => {
            await updateHabit(habit.id, { isActive: false });
          },
        },
      ]
    );
  };

  const getStreakMessage = (streak: number, habitName: string) => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "Great start! Keep it up!";
    if (streak < 7) return `${streak} days strong!`;
    if (streak < 30) return `${streak} days! You're building momentum!`;
    if (streak < 90) return `${streak} days! Amazing progress!`;
    return `${streak} days! You're unstoppable!`;
  };

  const getHealthMessage = (streak: number, habitType: string) => {
    switch (habitType) {
      case "alcohol":
        if (streak >= 7) return "Your liver is starting to repair!";
        if (streak >= 30) return "Significant liver function improvement!";
        if (streak >= 90) return "Your liver is almost fully recovered!";
        break;
      case "caffeine":
        if (streak >= 3) return "Better sleep quality ahead!";
        if (streak >= 7) return "More stable energy levels!";
        if (streak >= 30) return "Natural energy regulation restored!";
        break;
      case "sugar":
        if (streak >= 3) return "Blood sugar stabilizing!";
        if (streak >= 7) return "Reduced inflammation!";
        if (streak >= 30) return "Improved insulin sensitivity!";
        break;
    }
    return "";
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <Text style={styles.title}>Streaks</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content} key={refreshKey}>
        {/* Notifications banner (prompt) */}
        <NotificationPrompt
          ensureNotificationsEnabled={ensureNotificationsEnabled}
          getNotificationPermissions={getNotificationPermissions}
        />

        {/* DEV: Notification test buttons */}
        <View style={styles.devRow}>
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => testFastingNotifications()}
          >
            <Text style={styles.devButtonText}>Test Fasting Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.devButton,
              { marginTop: 8, backgroundColor: "#e3f2fd" },
            ]}
            onPress={async () => {
              const perm = await getNotificationPermissions();
              alert(
                `Notifications: ${perm.granted ? "GRANTED" : "DENIED"}$${
                  perm.status ? `\nStatus: ${perm.status}` : ""
                }`
              );
            }}
          >
            <Text style={[styles.devButtonText, { color: "#1976d2" }]}>
              Check Notification Permissions
            </Text>
          </TouchableOpacity>
        </View>
        {/* Active Habits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Streaks</Text>
          {(() => {
            const active = (habits || []).filter((h) => h.isActive);
            if (active.length === 0) {
              return (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No active streaks</Text>
                  <Text style={styles.emptySubtext}>
                    Start a streak to begin tracking progress!
                  </Text>
                </View>
              );
            }
            return active.map((habit) => {
              const streak = getCurrentStreak(habit.id);
              const streakMessage = getStreakMessage(streak, habit.name);
              const healthMessage = getHealthMessage(
                habit.type === "custom" ? 0 : streak,
                habit.type
              );

              return (
                <View key={habit.id} style={styles.habitCard}>
                  <View style={styles.habitHeader}>
                    <View style={styles.habitInfo}>
                      <View
                        style={[
                          styles.habitColor,
                          { backgroundColor: habit.color },
                        ]}
                      />
                      <Text style={styles.habitName}>{habit.name}</Text>
                    </View>
                    <View style={styles.habitActions}>
                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Notifications</Text>
                        <Switch
                          value={habit.notificationsEnabled !== false}
                          onValueChange={(val) =>
                            updateHabit(habit.id, { notificationsEnabled: val })
                          }
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteHabit(habit)}
                      >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.streakInfo}>
                    <Text style={styles.streakNumber}>{streak}</Text>
                    <Text style={styles.streakLabel}>days</Text>
                  </View>

                  <Text style={styles.streakMessage}>{streakMessage}</Text>
                  {healthMessage && (
                    <Text style={styles.healthMessage}>{healthMessage}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.calendarButton}
                    onPress={() =>
                      router.push({
                        pathname: "/components/screens/HabitCalendarScreen",
                        params: { habitId: habit.id },
                      })
                    }
                  >
                    <Text style={styles.calendarButtonText}>
                      📅 View Calendar
                    </Text>
                  </TouchableOpacity>
                  {/* DEV: test streak notifications for this habit */}
                  <TouchableOpacity
                    style={[
                      styles.calendarButton,
                      { marginTop: 8, backgroundColor: "#6c757d" },
                    ]}
                    onPress={() => testStreakNotifications(habit.id)}
                  >
                    <Text style={styles.calendarButtonText}>
                      ▶ Test Streak Notifications
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            });
          })()}
        </View>

        {/* Add Habits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add New Streak</Text>
          <View style={styles.addHabitsGrid}>
            {defaultHabits.map((habit) => {
              const exists = habits.some((h) => h.type === habit.type);
              return (
                <TouchableOpacity
                  key={habit.type}
                  style={[
                    styles.addHabitButton,
                    exists && styles.addHabitButtonDisabled,
                  ]}
                  onPress={() => handleAddDefaultHabit(habit)}
                  disabled={exists}
                >
                  <Text style={styles.addHabitIcon}>
                    {habit.type === "alcohol" && "🍺"}
                    {habit.type === "caffeine" && "☕"}
                    {habit.type === "sugar" && "🍭"}
                  </Text>
                  <Text
                    style={[
                      styles.addHabitText,
                      exists && styles.addHabitTextDisabled,
                    ]}
                  >
                    {habit.name}
                  </Text>
                  {exists && <Text style={styles.addHabitStatus}>✓ Added</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.customHabitButton}
            onPress={() => setShowAddHabit(true)}
          >
            <Text style={styles.customHabitText}>+ Add Custom Streak</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showAddHabit} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create Custom Streak</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Streak name (e.g., No Gaming)"
                value={customName}
                onChangeText={setCustomName}
                maxLength={32}
              />
              <View style={styles.modalRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => {
                    setShowAddHabit(false);
                    setCustomName("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCreate]}
                  onPress={async () => {
                    const name = customName.trim();
                    if (!name) {
                      Alert.alert(
                        "Name required",
                        "Please enter a streak name."
                      );
                      return;
                    }
                    const customCount = (habits || []).filter(
                      (h) => h.type === "custom"
                    ).length;
                    if (customCount >= 10) {
                      Alert.alert(
                        "Limit reached",
                        "Maximum of 10 custom streaks reached."
                      );
                      return;
                    }
                    const palette = [
                      "#1abc9c",
                      "#2ecc71",
                      "#3498db",
                      "#9b59b6",
                      "#f39c12",
                      "#e74c3c",
                      "#16a085",
                      "#27ae60",
                      "#2980b9",
                      "#8e44ad",
                    ];
                    const color = palette[customCount % palette.length];
                    await addHabit({
                      name,
                      type: "custom",
                      startDate: new Date().toISOString(),
                      isActive: true,
                      color,
                    } as any);
                    setShowAddHabit(false);
                    setCustomName("");
                  }}
                >
                  <Text style={styles.modalCreateText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

// Inline banner component prompting to enable notifications
const NotificationPrompt: React.FC<{
  ensureNotificationsEnabled: (interactive?: boolean) => Promise<boolean>;
  getNotificationPermissions: () => Promise<{
    granted: boolean;
    canAskAgain?: boolean;
    status?: string;
  }>;
}> = ({ ensureNotificationsEnabled, getNotificationPermissions }) => {
  const [visible, setVisible] = React.useState(false);
  useEffect(() => {
    (async () => {
      const perm = await getNotificationPermissions();
      setVisible(!perm.granted);
    })();
  }, [getNotificationPermissions]);

  if (!visible) return null;
  return (
    <View style={styles.noticeCard}>
      <Text style={styles.noticeTitle}>Enable notifications</Text>
      <Text style={styles.noticeText}>
        Turn on notifications to get streak milestones and fasting reminders.
      </Text>
      <TouchableOpacity
        style={styles.noticeButton}
        onPress={async () => {
          const ok = await ensureNotificationsEnabled(true);
          if (ok) setVisible(false);
        }}
      >
        <Text style={styles.noticeButtonText}>Enable</Text>
      </TouchableOpacity>
    </View>
  );
};

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
  fastingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  fastingButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  habitCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  habitInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  habitColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  habitName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  streakInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4CAF50",
  },
  streakLabel: {
    fontSize: 16,
    color: "#666",
    marginLeft: 8,
  },
  streakMessage: {
    fontSize: 16,
    color: "#2c3e50",
    marginBottom: 8,
  },
  healthMessage: {
    fontSize: 14,
    color: "#27ae60",
    fontStyle: "italic",
    marginBottom: 16,
  },
  calendarButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  calendarButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  devRow: {
    marginBottom: 16,
  },
  devButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  devButtonText: {
    color: "#2c3e50",
    fontSize: 12,
    fontWeight: "600",
  },
  noticeCard: {
    backgroundColor: "#fff9db",
    borderColor: "#ffe066",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noticeTitle: {
    color: "#8d6e00",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  noticeText: {
    color: "#8d6e00",
    fontSize: 12,
    marginBottom: 8,
  },
  noticeButton: {
    alignSelf: "flex-start",
    backgroundColor: "#f59f00",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noticeButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  addHabitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  addHabitButton: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginBottom: 12,
  },
  addHabitButtonDisabled: {
    backgroundColor: "#f8f9fa",
    borderColor: "#d0d0d0",
  },
  addHabitIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  addHabitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
  },
  addHabitTextDisabled: {
    color: "#999",
  },
  addHabitStatus: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "600",
    marginTop: 4,
  },
  customHabitButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3498db",
    borderStyle: "dashed",
  },
  customHabitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3498db",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancel: {
    backgroundColor: "#f1f3f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  modalCancelText: {
    color: "#2c3e50",
    fontWeight: "700",
  },
  modalCreate: {
    backgroundColor: "#4CAF50",
  },
  modalCreateText: {
    color: "#fff",
    fontWeight: "700",
  },
  habitActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  switchLabel: {
    color: "#2c3e50",
    fontSize: 12,
    fontWeight: "600",
  },
});
