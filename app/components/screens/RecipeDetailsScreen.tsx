import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useFood, RecipeIngredient } from "../FoodContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RecipeDetailsScreen() {
  const params = useLocalSearchParams();
  const { recipes, removeRecipe, toggleRecipeFavorite, addFood } = useFood();

  // Find the recipe by ID
  const recipe = recipes.find((r) => r.id === params.id);

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Recipe not found</Text>
      </View>
    );
  }

  const [servingsToAdd, setServingsToAdd] = useState(1);
  const [mealIngredients, setMealIngredients] = useState<RecipeIngredient[]>(
    recipe.ingredients
  );

  // Check for pending ingredient when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkPendingIngredient = async () => {
        try {
          const pending = await AsyncStorage.getItem("pendingRecipeIngredient");
          if (pending) {
            const ingredient: RecipeIngredient = JSON.parse(pending);
            // Use a more robust ID generation to avoid duplicates
            const ingredientWithId = {
              ...ingredient,
              id:
                ingredient.id ||
                `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            setMealIngredients((prev) => {
              // Check if ingredient already exists to prevent duplicates
              const exists = prev.some(
                (ing) =>
                  ing.name === ingredientWithId.name &&
                  ing.amount === ingredientWithId.amount &&
                  ing.unit === ingredientWithId.unit
              );
              if (exists) {
                return prev;
              }
              return [...prev, ingredientWithId];
            });
            // Clear the pending ingredient
            await AsyncStorage.removeItem("pendingRecipeIngredient");
          }
        } catch (error) {
          console.error("Error checking pending ingredient:", error);
        }
      };

      checkPendingIngredient();
    }, [])
  );

  const addIngredientToMeal = (ingredient: RecipeIngredient) => {
    setMealIngredients([...mealIngredients, ingredient]);
  };

  const removeIngredientFromMeal = (ingredientId: string) => {
    setMealIngredients(
      mealIngredients.filter((ing) => ing.id !== ingredientId)
    );
  };

  // Calculate nutrition based on current meal ingredients
  const calculateMealNutrition = () => {
    return mealIngredients.reduce(
      (total, ingredient) => ({
        calories: total.calories + ingredient.calories * ingredient.amount,
        protein: total.protein + ingredient.protein * ingredient.amount,
        carbs: total.carbs + ingredient.carbs * ingredient.amount,
        fat: total.fat + ingredient.fat * ingredient.amount,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const calculateMealNutritionPerServing = () => {
    const total = calculateMealNutrition();
    return {
      calories: Math.round(total.calories / recipe.servings),
      protein: Math.round(total.protein / recipe.servings),
      carbs: Math.round(total.carbs / recipe.servings),
      fat: Math.round(total.fat / recipe.servings),
    };
  };

  const handleAddToMeal = async (mealType: string) => {
    // Calculate nutrition based on servings to add
    const servingMultiplier = servingsToAdd / recipe.servings;

    console.log(
      `Adding recipe "${recipe.name}" with ${mealIngredients.length} ingredients to ${mealType}`
    );

    // Add each ingredient as a separate food item
    for (let i = 0; i < mealIngredients.length; i++) {
      const ingredient = mealIngredients[i];
      const adjustedAmount = ingredient.amount * servingMultiplier;

      // Create a more unique ID using timestamp, index, and random component
      const uniqueId = `${Date.now()}-${i}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const foodItem = {
        id: uniqueId,
        name: ingredient.name,
        brand: "",
        amount: Math.round(adjustedAmount * 100) / 100, // Round to 2 decimal places
        unit: ingredient.unit,
        nutrition: {
          calories: Math.round(ingredient.calories * adjustedAmount),
          protein: Math.round(ingredient.protein * adjustedAmount * 100) / 100,
          carbs: Math.round(ingredient.carbs * adjustedAmount * 100) / 100,
          fat: Math.round(ingredient.fat * adjustedAmount * 100) / 100,
          fiber: Math.round(ingredient.fiber * adjustedAmount * 100) / 100,
          sugars: Math.round(ingredient.sugars * adjustedAmount * 100) / 100,
          saturatedFat:
            Math.round(ingredient.saturatedFat * adjustedAmount * 100) / 100,
          unsaturatedFat:
            Math.round(ingredient.unsaturatedFat * adjustedAmount * 100) / 100,
          cholesterol: Math.round(ingredient.cholesterol * adjustedAmount),
          sodium: Math.round(ingredient.sodium * adjustedAmount),
          potassium: Math.round(ingredient.potassium * adjustedAmount),
        },
        timestamp: new Date(),
        mealType: mealType,
      };

      console.log(
        `Adding ingredient ${i + 1}/${mealIngredients.length}: ${
          ingredient.name
        } (${adjustedAmount} ${ingredient.unit})`
      );
      await addFood(foodItem as any);
    }

    Alert.alert(
      "Recipe Added!",
      `"${recipe.name}" (${servingsToAdd} serving${
        servingsToAdd !== 1 ? "s" : ""
      }) has been added to ${mealType}.`,
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeRecipe(recipe.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => toggleRecipeFavorite(recipe.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.favoriteButton}>
              {recipe.isFavorite ? "❤️" : "🤍"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteButton}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.servings}>Makes {recipe.servings} servings</Text>

        {/* Nutrition Summary */}
        <View style={styles.nutritionCard}>
          <Text style={styles.sectionTitle}>Nutrition per serving</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculateMealNutritionPerServing().calories}
              </Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculateMealNutritionPerServing().protein}g
              </Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculateMealNutritionPerServing().carbs}g
              </Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>
                {calculateMealNutritionPerServing().fat}g
              </Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <TouchableOpacity
              style={styles.addIngredientButton}
              onPress={() => {
                router.push(
                  `/components/screens/AddFoodScreen?mode=recipe&meal=breakfast`
                );
              }}
            >
              <Text style={styles.addIngredientText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {mealIngredients.map((ingredient, index) => (
            <View key={ingredient.id || index} style={styles.ingredientItem}>
              <TouchableOpacity
                style={styles.ingredientContent}
                onPress={() => {
                  const queryStr =
                    `/components/screens/FoodDetailsScreen?` +
                    `name=${encodeURIComponent(ingredient.name)}` +
                    `&brand=${encodeURIComponent("")}` +
                    `&calories=${encodeURIComponent(
                      String(ingredient.calories)
                    )}` +
                    `&protein=${encodeURIComponent(
                      String(ingredient.protein)
                    )}` +
                    `&carbs=${encodeURIComponent(String(ingredient.carbs))}` +
                    `&fat=${encodeURIComponent(String(ingredient.fat))}` +
                    `&amount=${encodeURIComponent(String(ingredient.amount))}` +
                    `&unit=${encodeURIComponent(ingredient.unit)}` +
                    `&fiber=${encodeURIComponent(String(ingredient.fiber))}` +
                    `&sugars=${encodeURIComponent(String(ingredient.sugars))}` +
                    `&saturatedFat=${encodeURIComponent(
                      String(ingredient.saturatedFat)
                    )}` +
                    `&unsaturatedFat=${encodeURIComponent(
                      String(ingredient.unsaturatedFat)
                    )}` +
                    `&cholesterol=${encodeURIComponent(
                      String(ingredient.cholesterol)
                    )}` +
                    `&sodium=${encodeURIComponent(String(ingredient.sodium))}` +
                    `&potassium=${encodeURIComponent(
                      String(ingredient.potassium)
                    )}` +
                    `&mode=recipe`;
                  router.push(queryStr);
                }}
              >
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                </View>
                <Text style={styles.ingredientCalories}>
                  {Math.round(ingredient.calories * ingredient.amount)} cal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeIngredientButton}
                onPress={() => removeIngredientFromMeal(ingredient.id)}
              >
                <Text style={styles.removeIngredientText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Servings to Add */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How many servings?</Text>
          <View style={styles.servingsContainer}>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => setServingsToAdd(Math.max(1, servingsToAdd - 1))}
            >
              <Text style={styles.servingsButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.servingsText}>{servingsToAdd}</Text>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => setServingsToAdd(servingsToAdd + 1)}
            >
              <Text style={styles.servingsButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.servingsSubtext}>
            {calculateMealNutritionPerServing().calories * servingsToAdd}{" "}
            calories total
          </Text>
        </View>

        {/* Add to Meal Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add to meal</Text>
          <View style={styles.mealButtons}>
            <TouchableOpacity
              style={styles.mealButton}
              onPress={() => handleAddToMeal("breakfast")}
            >
              <Text style={styles.mealButtonText}>Breakfast</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mealButton}
              onPress={() => handleAddToMeal("lunch")}
            >
              <Text style={styles.mealButtonText}>Lunch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mealButton}
              onPress={() => handleAddToMeal("dinner")}
            >
              <Text style={styles.mealButtonText}>Dinner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mealButton}
              onPress={() => handleAddToMeal("snack")}
            >
              <Text style={styles.mealButtonText}>Snack</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  favoriteButton: {
    fontSize: 24,
  },
  deleteButton: {
    fontSize: 22,
  },
  content: {
    padding: 20,
  },
  recipeName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  servings: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  nutritionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addIngredientButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addIngredientText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  ingredientContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  removeIngredientButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ff6b6b",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  removeIngredientText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  ingredientAmount: {
    fontSize: 14,
    color: "#666",
  },
  ingredientCalories: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  servingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  servingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  servingsButtonText: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "600",
  },
  servingsText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#333",
    marginHorizontal: 32,
  },
  servingsSubtext: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
  },
  mealButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  mealButton: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 100,
  },
});
