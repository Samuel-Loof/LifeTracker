import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useFood } from "../FoodContext";

export default function DailyIntakeScreen() {
  const router = useRouter();
  const { dailyFoods, removeFood } = useFood();
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
      <Link href={`/components/screens/AddFoodScreen?meal=${mealType}`} asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Add more items</Text>
        </TouchableOpacity>
      </Link>

      {mealFoods.length === 0 ? (
        <Text>No food has been added yet</Text>
      ) : (
        mealFoods.map((food) => {
          console.log("food data", food);
          console.log("protein type:", typeof food.nutrition.protein);
          console.log("carbs type:", typeof food.nutrition.carbs);
          console.log("fat type:", typeof food.nutrition.fat);
          return (
            <View key={food.id} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text>{food.name}</Text>
                <Text>{food.nutrition.calories} calories</Text>
                <Text>{food.nutrition.protein}g protein</Text>
                <Text>{food.nutrition.carbs}g carbs</Text>
                <Text>{food.nutrition.fat}g fat</Text>
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFood(food.id)}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
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
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
  },
  foodInfo: {
    flex: 1,
  },
  removeButton: {
    backgroundColor: "#e74c3c",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
