import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams, Link } from "expo-router";
import { useFood } from "../FoodContext"; // To get recent foods
import { FlatList } from "react-native";

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealType = params.meal || "all"; // Extract meal parameter
  const dailyFoods = useFood(); // Get access to food data

  // Array.isArray(dailyFoods) checks if dailyFoods is already an array.
  // If it is an array, it just uses it as-is (dailyFoods).
  // If it is not an array (meaning it’s likely an object), it uses Object.values(dailyFoodsRaw) to convert the object’s values into an array.
  //  ? means “if true, do this…”
  // : means “…otherwise, do this.”
  const dailyFoodsArray = Array.isArray(dailyFoods)
    ? dailyFoods
    : Object.values(dailyFoods);

  // If dailyFoodsArray is not empty, slice the last 20 items and reverse the order
  //  to show the most recent first. If it's empty, return an empty array.
  const recentFoods =
    dailyFoodsArray.length > 0 ? dailyFoodsArray.slice(-20).reverse() : [];

  // Get recent foods logic here (filter by date/time)

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Foods</Text>
      <FlatList
        data={recentFoods}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.foodItem}>
            <Text style={styles.foodName}>{item.name}</Text>
            {/* Add more food details here if needed */}
          </View>
        )}
        ListEmptyComponent={<Text>No recent foods found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  foodItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  foodName: {
    fontSize: 18,
  },
});
