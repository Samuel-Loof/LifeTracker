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

  const getFastingStatus = () => {
    if (!currentSession) return "Not fasting";

    const startTime = new Date(currentSession.startTime);
    const now = new Date();
    const hoursElapsed =
      (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = localSettings.fastingHours - hoursElapsed;

    if (hoursRemaining <= 0) {
      return "Fasting complete!";
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
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <Text style={styles.title}>Fasting</Text>
        <View style={{ width: 60 }} />
      </View>

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

          <View style={styles.actionButtons}>
            {!currentSession ? (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartFasting}
              >
                <Text style={styles.startButtonText}>Start Fasting</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.endButton}
                onPress={handleEndFasting}
              >
                <Text style={styles.endButtonText}>End Fasting</Text>
              </TouchableOpacity>
            )}
          </View>
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
  bottomSpacer: {
    height: 80,
  },
});
