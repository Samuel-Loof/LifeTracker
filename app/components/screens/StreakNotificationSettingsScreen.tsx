import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHabits } from "../HabitContext";

export default function StreakNotificationSettingsScreen() {
  const router = useRouter();
  const { streakNotificationSettings, updateStreakNotificationSettings } =
    useHabits();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    const [hours, minutes] = streakNotificationSettings.time
      .split(":")
      .map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  });

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleTimeChange = (event: any, selectedTime: Date | undefined) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setSelectedTime(selectedTime);
      const timeString = `${selectedTime
        .getHours()
        .toString()
        .padStart(2, "0")}:${selectedTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      updateStreakNotificationSettings({ time: timeString });
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateStreakNotificationSettings({ enabled });
  };

  const handleToggleMilestone = (milestone: number) => {
    const currentMilestones = streakNotificationSettings.milestones;
    const newMilestones = currentMilestones.includes(milestone)
      ? currentMilestones.filter((m) => m !== milestone)
      : [...currentMilestones, milestone].sort((a, b) => a - b);

    updateStreakNotificationSettings({ milestones: newMilestones });
  };

  const addCustomMilestone = () => {
    Alert.prompt(
      "Add Custom Milestone",
      "Enter the number of days for the milestone:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: (text) => {
            const days = parseInt(text || "0");
            if (
              days > 0 &&
              !streakNotificationSettings.milestones.includes(days)
            ) {
              const newMilestones = [
                ...streakNotificationSettings.milestones,
                days,
              ].sort((a, b) => a - b);
              updateStreakNotificationSettings({ milestones: newMilestones });
            }
          },
        },
      ],
      "plain-text",
      "",
      "numeric"
    );
  };

  const removeMilestone = (milestone: number) => {
    const newMilestones = streakNotificationSettings.milestones.filter(
      (m) => m !== milestone
    );
    updateStreakNotificationSettings({ milestones: newMilestones });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Streak Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Enable Notifications */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>
                Enable Streak Notifications
              </Text>
              <Text style={styles.settingDescription}>
                Get notified when you reach streak milestones
              </Text>
            </View>
            <Switch
              value={streakNotificationSettings.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={
                streakNotificationSettings.enabled ? "#f5dd4b" : "#f4f3f4"
              }
            />
          </View>
        </View>

        {/* Notification Time */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notification Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeButtonText}>
              {formatTime(streakNotificationSettings.time)}
            </Text>
            <Text style={styles.timeButtonArrow}>🕐</Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streak Milestones</Text>
          <Text style={styles.cardDescription}>
            Choose which streak lengths will trigger notifications
          </Text>

          <View style={styles.milestonesContainer}>
            {streakNotificationSettings.milestones.map((milestone) => (
              <View key={milestone} style={styles.milestoneRow}>
                <Text style={styles.milestoneText}>{milestone} days</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMilestone(milestone)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addMilestoneButton}
            onPress={addCustomMilestone}
          >
            <Text style={styles.addMilestoneText}>+ Add Custom Milestone</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Add Common Milestones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Add</Text>
          <View style={styles.quickAddContainer}>
            {[1, 2, 5, 10, 21, 45, 60, 100, 180, 365].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.quickAddButton,
                  streakNotificationSettings.milestones.includes(days) &&
                    styles.quickAddButtonActive,
                ]}
                onPress={() => handleToggleMilestone(days)}
              >
                <Text
                  style={[
                    styles.quickAddText,
                    streakNotificationSettings.milestones.includes(days) &&
                      styles.quickAddTextActive,
                  ]}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  content: {
    flex: 1,
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
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  timeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
  },
  timeButtonText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  timeButtonArrow: {
    fontSize: 16,
  },
  milestonesContainer: {
    marginBottom: 16,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  milestoneText: {
    fontSize: 16,
    color: "#2c3e50",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e74c3c",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  addMilestoneButton: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  addMilestoneText: {
    fontSize: 14,
    color: "#666",
  },
  quickAddContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickAddButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f8f9fa",
  },
  quickAddButtonActive: {
    backgroundColor: "#2c3e50",
    borderColor: "#2c3e50",
  },
  quickAddText: {
    fontSize: 12,
    color: "#666",
  },
  quickAddTextActive: {
    color: "white",
    fontWeight: "600",
  },
});
