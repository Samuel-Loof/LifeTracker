import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useFood, WaterSettings } from "../FoodContext";

export default function WaterSettingsScreen() {
  const { waterSettings, updateWaterSettings } = useFood();
  const [localSettings, setLocalSettings] =
    useState<WaterSettings>(waterSettings);

  const handleSave = async () => {
    await updateWaterSettings(localSettings);
    router.back();
  };

  const updateDailyGoal = (value: number) => {
    // Clamp between 0 and 5, with 0.1L increments
    const clampedValue = Math.max(0, Math.min(5, Math.round(value * 10) / 10));
    setLocalSettings((prev) => ({ ...prev, dailyGoal: clampedValue }));
  };

  const handleSliderDrag = (gestureState: any) => {
    const { moveX } = gestureState;
    const sliderWidth = Dimensions.get("window").width - 80; // Account for padding
    const sliderX = 40; // Starting X position of slider
    const relativeX = moveX - sliderX;
    const percentage = Math.max(0, Math.min(1, relativeX / sliderWidth));
    const newValue = percentage * 5;
    updateDailyGoal(newValue);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      handleSliderDrag(gestureState);
    },
  });

  const toggleContainerType = () => {
    setLocalSettings((prev) => ({
      ...prev,
      containerType: prev.containerType === "glass" ? "bottle" : "glass",
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <Text style={styles.title}>Water Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Daily Goal Slider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Water Goal</Text>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack} {...panResponder.panHandlers}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${(localSettings.dailyGoal / 5) * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.sliderThumb,
                  { left: `${(localSettings.dailyGoal / 5) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0L</Text>
              <Text style={styles.sliderLabel}>2.5L</Text>
              <Text style={styles.sliderLabel}>5L</Text>
            </View>
            <View style={styles.goalDisplay}>
              <Text style={styles.goalValue}>
                {localSettings.dailyGoal.toFixed(1)}L
              </Text>
              <Text style={styles.goalSubtext}>per day</Text>
            </View>
            <View style={styles.adjustButtons}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => updateDailyGoal(localSettings.dailyGoal - 0.1)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => updateDailyGoal(localSettings.dailyGoal + 0.1)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Container Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Container Type</Text>
          <View style={styles.containerOptions}>
            <TouchableOpacity
              style={[
                styles.containerOption,
                localSettings.containerType === "glass" &&
                  styles.containerOptionSelected,
              ]}
              onPress={() =>
                setLocalSettings((prev) => ({
                  ...prev,
                  containerType: "glass",
                }))
              }
            >
              <Text style={styles.containerIcon}>🥛</Text>
              <Text style={styles.containerLabel}>Glass</Text>
              <Text style={styles.containerAmount}>0.25L</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.containerOption,
                localSettings.containerType === "bottle" &&
                  styles.containerOptionSelected,
              ]}
              onPress={() =>
                setLocalSettings((prev) => ({
                  ...prev,
                  containerType: "bottle",
                }))
              }
            >
              <Text style={styles.containerIcon}>🍼</Text>
              <Text style={styles.containerLabel}>Bottle</Text>
              <Text style={styles.containerAmount}>0.5L</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        {/* Bottom spacer to avoid phone navigation buttons */}
        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 12,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bottomSpacer: {
    height: 80, // Space to avoid phone navigation buttons
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
    paddingBottom: 120, // Add extra bottom padding to avoid Android navigation buttons
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  sliderContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    position: "relative",
    marginBottom: 16,
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  sliderThumb: {
    position: "absolute",
    top: -6,
    width: 20,
    height: 20,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#fff",
    marginLeft: -10,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#666",
  },
  goalDisplay: {
    alignItems: "center",
    marginBottom: 20,
  },
  goalValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
  },
  goalSubtext: {
    fontSize: 14,
    color: "#666",
  },
  adjustButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adjustButtonText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "600",
  },
  containerOptions: {
    flexDirection: "row",
    gap: 16,
  },
  containerOption: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  containerOptionSelected: {
    borderColor: "#4CAF50",
    backgroundColor: "#f0f8f0",
  },
  containerIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  containerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  containerAmount: {
    fontSize: 14,
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 100, // Add bottom margin to avoid Android navigation buttons
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
