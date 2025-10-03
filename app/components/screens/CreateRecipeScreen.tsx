import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useFood, Recipe, RecipeIngredient } from "../FoodContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CreateRecipeScreen() {
  const { addRecipe } = useFood();
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

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
            setIngredients((prev) => {
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

  const calculateTotalNutrition = () => {
    return ingredients.reduce(
      (total, ingredient) => ({
        calories: total.calories + ingredient.calories * ingredient.amount,
        protein: total.protein + ingredient.protein * ingredient.amount,
        carbs: total.carbs + ingredient.carbs * ingredient.amount,
        fat: total.fat + ingredient.fat * ingredient.amount,
        fiber: total.fiber + ingredient.fiber * ingredient.amount,
        sugars: total.sugars + ingredient.sugars * ingredient.amount,
        saturatedFat:
          total.saturatedFat + ingredient.saturatedFat * ingredient.amount,
        unsaturatedFat:
          total.unsaturatedFat + ingredient.unsaturatedFat * ingredient.amount,
        cholesterol:
          total.cholesterol + ingredient.cholesterol * ingredient.amount,
        sodium: total.sodium + ingredient.sodium * ingredient.amount,
        potassium: total.potassium + ingredient.potassium * ingredient.amount,
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        saturatedFat: 0,
        unsaturatedFat: 0,
        cholesterol: 0,
        sodium: 0,
        potassium: 0,
      }
    );
  };

  const calculateNutritionPerServing = () => {
    const total = calculateTotalNutrition();
    return {
      calories: Math.round(total.calories / servings),
      protein: Math.round(total.protein / servings),
      carbs: Math.round(total.carbs / servings),
      fat: Math.round(total.fat / servings),
      fiber: Math.round(total.fiber / servings),
      sugars: Math.round(total.sugars / servings),
      saturatedFat: Math.round(total.saturatedFat / servings),
      unsaturatedFat: Math.round(total.unsaturatedFat / servings),
      cholesterol: Math.round(total.cholesterol / servings),
      sodium: Math.round(total.sodium / servings),
      potassium: Math.round(total.potassium / servings),
    };
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      Alert.alert("Error", "Please enter a recipe name");
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert("Error", "Please add at least one ingredient");
      return;
    }

    if (servings < 1) {
      Alert.alert("Error", "Servings must be at least 1");
      return;
    }

    const newRecipe: Recipe = {
      id: Date.now().toString(),
      name: recipeName.trim(),
      ingredients,
      servings,
      totalNutrition: calculateTotalNutrition(),
      nutritionPerServing: calculateNutritionPerServing(),
      isFavorite: false,
      createdAt: new Date(),
    };

    // Save recipe to context/storage
    await addRecipe(newRecipe);

    Alert.alert(
      "Recipe Saved!",
      `"${recipeName}" has been saved with ${ingredients.length} ingredients.`,
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const addIngredient = () => {
    // Navigate to AddFoodScreen in recipe mode
    router.push("/components/screens/AddFoodScreen?mode=recipe");
  };

  const removeIngredient = (ingredientId: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== ingredientId));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <Text style={styles.title}>Create Recipe</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Recipe Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recipe Name</Text>
          <TextInput
            style={styles.input}
            value={recipeName}
            onChangeText={setRecipeName}
            placeholder="Enter recipe name..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Servings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servings</Text>
          <View style={styles.servingsContainer}>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => setServings(Math.max(1, servings - 1))}
            >
              <Text style={styles.servingsButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.servingsInput}
              value={servings.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setServings(Math.max(1, num));
              }}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => setServings(servings + 1)}
            >
              <Text style={styles.servingsButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 ? (
            <View style={styles.emptyIngredients}>
              <Text style={styles.emptyText}>No ingredients added yet</Text>
              <Text style={styles.emptySubtext}>
                Tap "+ Add" to add ingredients to your recipe
              </Text>
            </View>
          ) : (
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredientItem}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.ingredientAmount}>
                      {ingredient.amount} {ingredient.unit}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeIngredient(ingredient.id)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Nutrition Summary */}
        {ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Summary</Text>
            <View style={styles.nutritionCard}>
              <Text style={styles.nutritionCardTitle}>Per serving</Text>
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {calculateNutritionPerServing().calories}
                  </Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {calculateNutritionPerServing().protein}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {calculateNutritionPerServing().carbs}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {calculateNutritionPerServing().fat}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe}>
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        </TouchableOpacity>

        {/* Bottom spacer to avoid Android navigation overlap */}
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    letterSpacing: 0.5,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  servingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  servingsButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 48,
    alignItems: "center",
  },
  servingsButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  servingsInput: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyIngredients: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  ingredientsList: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  ingredientAmount: {
    fontSize: 14,
    color: "#666",
  },
  removeButton: {
    backgroundColor: "#ff4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  nutritionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  nutritionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
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
    height: 80, // Space to avoid Android navigation buttons
  },
});
