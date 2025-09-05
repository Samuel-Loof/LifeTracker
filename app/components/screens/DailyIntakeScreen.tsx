import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFood } from "../FoodContext";

export default function DailyIntakeScreen() {
  const router = useRouter();
  const { dailyFoods } = useFood();
  const params = useLocalSearchParams();
  const mealType = params.meal || "all";

  // filter the foods depending on mealtime
  const mealFoods =
    mealType === "all"
      ? dailyFoods
      : dailyFoods.filter((food) => food.mealType === mealType);

  // console.log("DailyFoods array:", dailyFoods);
  // console.log("Length:", dailyFoods.length);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Intake</Text>
      {/* TODO: Add food list, nutrition summary, scan more button, done button */}
      {mealFoods.length === 0 ? (
        <Text>No food has been added yet</Text>
      ) : (
        dailyFoods.map((food) => {
          console.log("food data", food);
          return (
            <View key={food.id}>
              <Text>{food.name}</Text>
              <Text>{food.nutrition.calories} calories</Text>
              {/* <Text>
                Protein log: "{food.nutrition.protein}" (type:{" "}
                {typeof food.nutrition.protein})
              </Text> */}
              <Text>{food.nutrition.protein}g protein</Text>
              <Text>{food.nutrition.carbs}g carbs</Text>
              <Text>{food.nutrition.fat}g fat</Text>
            </View>
          );
        })
      )}
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
  },
});
