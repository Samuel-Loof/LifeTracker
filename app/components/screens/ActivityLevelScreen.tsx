import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useFood } from "../FoodContext";

type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";

const activityLevels = [
  {
    key: "sedentary" as ActivityLevel,
    title: "Sedentary",
    subtitle: "Little to no daily activity",
    description:
      "Desk job, reading, watching TV, minimal walking. Examples: bank teller, office worker, student studying most of the day.",
    multiplier: 1.2,
  },
  {
    key: "light" as ActivityLevel,
    title: "Light Activity",
    subtitle: "Light daily activity",
    description:
      "Light exercise 1-3 days per week. Examples: teacher, sales clerk, light walking, household chores.",
    multiplier: 1.375,
  },
  {
    key: "moderate" as ActivityLevel,
    title: "Moderate Activity",
    subtitle: "Moderate daily activity",
    description:
      "Moderate exercise 3-5 days per week. Examples: construction worker, mail carrier, regular gym-goer.",
    multiplier: 1.55,
  },
  {
    key: "active" as ActivityLevel,
    title: "Active",
    subtitle: "High daily activity",
    description:
      "Intense exercise 6-7 days per week. Examples: athlete, fitness trainer, manual laborer.",
    multiplier: 1.725,
  },
  {
    key: "veryActive" as ActivityLevel,
    title: "Very Active",
    subtitle: "Very high daily activity",
    description:
      "Very intense exercise, physical job, or training twice daily. Examples: professional athlete, construction foreman.",
    multiplier: 1.9,
  },
];

export default function ActivityLevelScreen() {
  const router = useRouter();
  const { userGoals, setUserGoals } = useFood();
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityLevel>("moderate");

  // Load current activity level
  useEffect(() => {
    if (userGoals) {
      setSelectedActivity(userGoals.activity);
    }
  }, [userGoals]);

  const handleSave = async () => {
    if (userGoals) {
      const updatedGoals = {
        ...userGoals,
        activity: selectedActivity,
      };
      await setUserGoals(updatedGoals);
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Activity Level</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.description}>
          Select your current activity level to get accurate calorie
          recommendations.
        </Text>

        {activityLevels.map((level) => (
          <TouchableOpacity
            key={level.key}
            style={[
              styles.activityCard,
              selectedActivity === level.key && styles.activityCardSelected,
            ]}
            onPress={() => setSelectedActivity(level.key)}
          >
            <View style={styles.activityHeader}>
              <View style={styles.activityTitleRow}>
                <View style={styles.checkboxContainer}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedActivity === level.key && styles.checkboxSelected,
                    ]}
                  >
                    {selectedActivity === level.key && (
                      <View style={styles.checkboxInner} />
                    )}
                  </View>
                </View>
                <View style={styles.activityTextContainer}>
                  <Text
                    style={[
                      styles.activityTitle,
                      selectedActivity === level.key &&
                        styles.activityTitleSelected,
                    ]}
                  >
                    {level.title}
                  </Text>
                  <Text
                    style={[
                      styles.activitySubtitle,
                      selectedActivity === level.key &&
                        styles.activitySubtitleSelected,
                    ]}
                  >
                    {level.subtitle}
                  </Text>
                </View>
                <View style={styles.multiplierContainer}>
                  <Text
                    style={[
                      styles.multiplier,
                      selectedActivity === level.key &&
                        styles.multiplierSelected,
                    ]}
                  >
                    ×{level.multiplier}
                  </Text>
                </View>
              </View>
            </View>
            <Text
              style={[
                styles.activityDescription,
                selectedActivity === level.key &&
                  styles.activityDescriptionSelected,
              ]}
            >
              {level.description}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Activity Level</Text>
        </TouchableOpacity>
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
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackText: {
    fontSize: 24,
    color: "#2c3e50",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  scrollContent: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  activityCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityCardSelected: {
    borderColor: "#2c3e50",
    backgroundColor: "#f8f9fa",
  },
  activityHeader: {
    marginBottom: 12,
  },
  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  checkboxSelected: {
    borderColor: "#2c3e50",
    backgroundColor: "#2c3e50",
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  activityTitleSelected: {
    color: "#2c3e50",
  },
  activitySubtitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activitySubtitleSelected: {
    color: "#2c3e50",
  },
  multiplierContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  multiplier: {
    fontSize: 16,
    fontWeight: "700",
    color: "#999",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  multiplierSelected: {
    color: "white",
    backgroundColor: "#2c3e50",
  },
  activityDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginLeft: 40,
  },
  activityDescriptionSelected: {
    color: "#2c3e50",
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
  saveButton: {
    backgroundColor: "#2c3e50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
