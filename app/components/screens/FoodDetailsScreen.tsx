import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function FoodDetailsScreen() {
  const params = useLocalSearchParams();

  // TODO: Parse the food data from params

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Details</Text>
      <Text>Food Name: {params.name}</Text>
      <Text>Calories: {params.calories}</Text>
      {/* TODO: Add serving selector */}
      {/* TODO: Add nutrition circles */}
      {/* TODO: Add track button */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
