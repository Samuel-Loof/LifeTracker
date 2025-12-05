import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useHabits, FastingSettings } from "../HabitContext";

export default function FastingScreen() {
  const router = useRouter();
  const {
    fastingSettings,
    updateFastingSettings,
    startFastingSession,
    endFastingSession,
    getCurrentFastingSession,
  } = useHabits();

  const [localSettings, setLocalSettings] = useState(fastingSettings);
  const [currentSession, setCurrentSession] = useState(
    getCurrentFastingSession()
  );

  useEffect(() => {
    setLocalSettings(fastingSettings);
  }, [fastingSettings]);

  useEffect(() => {
    setCurrentSession(getCurrentFastingSession());
  }, [getCurrentFastingSession]);

  const handleSave = async () => {
    await updateFastingSettings(localSettings);
    router.back();
  };

  const handleFastingHoursChange = (hours: number) => {
    const newHours = Math.max(8, Math.min(24, hours));
    const eatingHours = 24 - newHours;
    setLocalSettings((prev: FastingSettings) => ({
      ...prev,
      fastingHours: newHours,
      eatingWindowHours: eatingHours,
    }));
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const { moveX } = gestureState;
      const sliderWidth = Dimensions.get("window").width - 80;
      const sliderX = 40;
      const relativeX = moveX - sliderX;
      const percentage = Math.max(0, Math.min(1, relativeX / sliderWidth));
      const hours = Math.round(8 + percentage * 16); // 8-24 hours
      handleFastingHoursChange(hours);
    },
  });

  const handleStartFasting = async () => {
    await startFastingSession();
    setCurrentSession(getCurrentFastingSession());
  };

  const handleEndFasting = async () => {
    await endFastingSession();
    setCurrentSession(null);
  };

  const handleStopFasting = async () => {
    await updateFastingSettings({ isActive: false });
    if (currentSession) {
      await endFastingSession();
      setCurrentSession(null);
    }
  };

  const getFastingStatus = () => {
    if (!currentSession) {
      if (localSettings.isActive) {
        return "Auto-cycling enabled - Next fast will start automatically";
      }
      return "Not fasting";
    }

    const startTime = new Date(currentSession.startTime);
    const now = new Date();
    const hoursElapsed =
      (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = localSettings.fastingHours - hoursElapsed;

    if (hoursRemaining <= 0) {
      return "Fasting complete! Next cycle will start automatically";
    }

    return `${hoursRemaining.toFixed(1)} hours remaining`;
  };

  const getFastingProgress = () => {
    if (!currentSession) return 0;

    const startTime = new Date(currentSession.startTime);
    const now = new Date();
    const hoursElapsed =
      (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const progress = Math.min(1, hoursElapsed / localSettings.fastingHours);

    return progress * 100;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{getFastingStatus()}</Text>
            {currentSession && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${getFastingProgress()}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {getFastingProgress().toFixed(1)}% complete
                </Text>
              </View>
            )}
          </View>

          {/* Actions moved to bottom */}
        </View>

        {/* Fasting Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fasting Schedule</Text>
          <View style={styles.settingsCard}>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                Fasting Hours: {localSettings.fastingHours}h
              </Text>
              <View style={styles.sliderTrack} {...panResponder.panHandlers}>
                <View
                  style={[
                    styles.sliderFill,
                    {
                      width: `${
                        ((localSettings.fastingHours - 8) / 16) * 100
                      }%`,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    {
                      left: `${((localSettings.fastingHours - 8) / 16) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>8h</Text>
                <Text style={styles.sliderLabelText}>16h</Text>
                <Text style={styles.sliderLabelText}>24h</Text>
              </View>
            </View>

            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Fasting:</Text>
                <Text style={styles.scheduleValue}>
                  {localSettings.fastingHours} hours
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Eating Window:</Text>
                <Text style={styles.scheduleValue}>
                  {localSettings.eatingWindowHours} hours
                </Text>
              </View>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>Auto-Cycling:</Text>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      isActive: !prev.isActive,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: localSettings.isActive ? "#4CAF50" : "#666" },
                    ]}
                  >
                    {localSettings.isActive ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Notification Settings */}
              <View style={styles.settingRow}>
                <Text style={styles.scheduleLabel}>Notifications:</Text>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      notifications: !prev.notifications,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.toggleText,
                      {
                        color: localSettings.notifications ? "#4CAF50" : "#666",
                      },
                    ]}
                  >
                    {localSettings.notifications ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>

              {localSettings.notifications && (
                <View style={styles.settingRow}>
                  <Text style={styles.scheduleLabel}>Notification Time:</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {
                      // You can add time picker here if needed
                      // For now, just show the current time
                    }}
                  >
                    <Text style={styles.timeButtonText}>
                      {localSettings.notificationTime}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Popular Fasting Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Fasting Types</Text>
          <View style={styles.fastingTypesGrid}>
            {[
              {
                name: "16:8",
                fasting: 16,
                eating: 8,
                description: "Most popular",
              },
              {
                name: "18:6",
                fasting: 18,
                eating: 6,
                description: "More restrictive",
              },
              {
                name: "20:4",
                fasting: 20,
                eating: 4,
                description: "Warrior diet",
              },
              {
                name: "OMAD",
                fasting: 23,
                eating: 1,
                description: "One meal a day",
              },
            ].map((type) => (
              <TouchableOpacity
                key={type.name}
                style={[
                  styles.fastingTypeButton,
                  localSettings.fastingHours === type.fasting &&
                    styles.fastingTypeButtonActive,
                ]}
                onPress={() => {
                  setLocalSettings((prev: FastingSettings) => ({
                    ...prev,
                    fastingHours: type.fasting,
                    eatingWindowHours: type.eating,
                  }));
                }}
              >
                <Text style={styles.fastingTypeName}>{type.name}</Text>
                <Text style={styles.fastingTypeDescription}>
                  {type.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          <View style={styles.benefitsList}>
            {[
              "Weight loss and fat burning",
              "Improved insulin sensitivity",
              "Enhanced mental clarity",
              "Cellular repair (autophagy)",
              "Reduced inflammation",
              "Longevity benefits",
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.footerCard}>
          {!currentSession ? (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.footerPrimary, styles.footerButton]}
                onPress={handleStartFasting}
              >
                <Text style={styles.footerPrimaryText}>Start Fasting</Text>
              </TouchableOpacity>
              {localSettings.isActive && (
                <TouchableOpacity
                  style={[styles.footerSecondary, styles.footerButton]}
                  onPress={handleStopFasting}
                >
                  <Text style={styles.footerSecondaryText}>
                    Stop Auto-Cycling
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={[styles.footerDanger, styles.footerButton]}
                onPress={handleEndFasting}
              >
                <Text style={styles.footerDangerText}>End Current Fast</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerSecondary, styles.footerButton]}
                onPress={handleStopFasting}
              >
                <Text style={styles.footerSecondaryText}>Stop All Fasting</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer to avoid phone navigation buttons */}
        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    padding: 20,
    paddingBottom: 120,
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
  statusCard: {
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
  statusText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 16,
  },
  progressContainer: {
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  startButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  endButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  endButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  stopButton: {
    backgroundColor: "#6c757d",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
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
  },
  sliderLabelText: {
    fontSize: 12,
    color: "#666",
  },
  scheduleInfo: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 14,
    color: "#666",
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  timeButtonText: {
    fontSize: 14,
    color: "#2c3e50",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  fastingTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  fastingTypeButton: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  fastingTypeButtonActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#f0f8f0",
  },
  fastingTypeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  fastingTypeDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  benefitsList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 16,
    color: "#27ae60",
    marginRight: 12,
    fontWeight: "700",
  },
  benefitText: {
    fontSize: 14,
    color: "#2c3e50",
    flex: 1,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
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
  footerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  footerButton: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  footerPrimary: {
    backgroundColor: "#4CAF50",
  },
  footerPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerSecondary: {
    backgroundColor: "#f1f3f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  footerSecondaryText: {
    color: "#2c3e50",
    fontSize: 16,
    fontWeight: "700",
  },
  footerDanger: {
    backgroundColor: "#e74c3c",
  },
  footerDangerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomSpacer: {
    height: 80,
  },
});
