import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";

type Timeline = { label: string; description: string }[];

const alcoholTimeline: Timeline = [
  { label: "Days 1-7", description: "Liver begins to heal, sleep improves" },
  { label: "Day 14", description: "Blood pressure starts normalizing" },
  { label: "Day 30", description: "Mental clarity increases, skin improves" },
  { label: "Day 60", description: "Energy and mood stabilize" },
  { label: "Day 90", description: "Liver function greatly improved" },
  { label: "Day 180", description: "Long-term cardiovascular benefits" },
  { label: "Day 365", description: "Metabolic and cognitive benefits persist" },
];

const caffeineTimeline: Timeline = [
  {
    label: "Days 1-7",
    description: "Withdrawal fades, sleep quality improves",
  },
  { label: "Day 14", description: "Steadier energy without crashes" },
  { label: "Day 30", description: "Reduced anxiety and better focus" },
  { label: "Day 60", description: "Natural cortisol rhythm restored" },
  { label: "Day 90", description: "Deeper sleep cycles return" },
];

const sugarTimeline: Timeline = [
  { label: "Days 1-7", description: "Cravings decrease, mood stabilizes" },
  { label: "Day 14", description: "Blood sugar control improves" },
  { label: "Day 30", description: "Skin and energy improvements" },
  { label: "Day 60", description: "Inflammation reduced" },
  { label: "Day 90", description: "Insulin sensitivity increases" },
  { label: "Day 180", description: "Sustained metabolic health" },
];

export default function HabitBenefitsScreen() {
  const params = useLocalSearchParams<{
    habitName?: string;
    habitType?: string;
  }>();
  const habitName = (params.habitName as string) || "Habit";
  const habitType = params.habitType as string;

  const timeline = useMemo<Timeline>(() => {
    switch (habitType) {
      case "alcohol":
        return alcoholTimeline;
      case "caffeine":
        return caffeineTimeline;
      case "sugar":
        return sugarTimeline;
      default:
        return [
          { label: "Days 1-7", description: "Early benefits begin" },
          {
            label: "Day 14",
            description: "Noticeable energy and mood changes",
          },
          { label: "Day 30", description: "Habit pathways start to rewire" },
          { label: "Day 60", description: "Sustained improvements take hold" },
          {
            label: "Day 90",
            description: "Longer-term health markers improve",
          },
        ];
    }
  }, [habitType]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{`About ${habitName}`}</Text>
        <Text style={styles.subtitle}>Benefits Timeline</Text>
      </View>

      <View style={styles.content}>
        {timeline.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.cardLabel}>{item.label}</Text>
            <Text style={styles.cardText}>{item.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingTop: 15,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#2c3e50" },
  subtitle: { marginTop: 4, fontSize: 12, color: "#7f8c8d" },
  content: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4,
  },
  cardText: { fontSize: 14, color: "#34495e" },
});
