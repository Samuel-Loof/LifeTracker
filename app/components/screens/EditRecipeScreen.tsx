import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect, useNavigation } from "expo-router";
import { useFood, Recipe, RecipeIngredient } from "../FoodContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditRecipeScreen() {
  const { recipes, updateRecipe, toggleRecipeFavorite, removeRecipe } = useFood();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const recipeId = params.editId as string;

  console.log("EditRecipeScreen loaded with recipeId:", recipeId);

  // Find the recipe to edit
  const originalRecipe = recipes.find((r) => r.id === recipeId);

  // Set header buttons dynamically
  useLayoutEffect(() => {
    if (originalRecipe) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: 12, marginRight: 15 }}>
            <TouchableOpacity
              onPress={() => toggleRecipeFavorite(originalRecipe.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 24 }}>
                {originalRecipe.isFavorite ? "❤️" : "🤍"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Delete Recipe",
                  `Are you sure you want to delete "${originalRecipe.name}"?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        removeRecipe(recipeId);
                        router.back();
                      },
                    },
                  ]
                );
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 22 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, originalRecipe, toggleRecipeFavorite, removeRecipe, recipeId]);

  console.log("Found recipe:", originalRecipe?.name);

  const [recipeName, setRecipeName] = useState(originalRecipe?.name || "");
  const [servings, setServings] = useState(originalRecipe?.servings || 1);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    originalRecipe?.ingredients || []
  );

  // Update state when recipe changes
  useEffect(() => {
    if (originalRecipe) {
      setRecipeName(originalRecipe.name);
      setServings(originalRecipe.servings);
      setIngredients(originalRecipe.ingredients);
    }
  }, [originalRecipe]);

  // Check for pending ingredient when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const checkPendingIngredient = async () => {
        try {
          const pending = await AsyncStorage.getItem("pendingRecipeIngredient");
          const editingRecipeId = await AsyncStorage.getItem("editingRecipeId");
          const editingIngredientId = await AsyncStorage.getItem(
            "editingIngredientId"
          );

          if (pending) {
            const ingredient: RecipeIngredient = JSON.parse(pending);

            // Check if we're editing an existing ingredient
            if (editingRecipeId === recipeId && editingIngredientId) {
              // Update existing ingredient in EditRecipeScreen
              setIngredients((prev) =>
                prev.map((ing) =>
                  ing.id === editingIngredientId ? ingredient : ing
                )
              );
            } else {
              // Add new ingredient
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
            }

            // Clear the pending ingredient and editing info
            await AsyncStorage.removeItem("pendingRecipeIngredient");
            await AsyncStorage.removeItem("editingRecipeId");
            await AsyncStorage.removeItem("editingIngredientId");
          }
        } catch (error) {
          console.error("Error checking pending ingredient:", error);
        }
      };

      checkPendingIngredient();
    }, [recipeId])
  );

  if (!originalRecipe) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <Text style={styles.errorSubtext}>Recipe ID: {recipeId}</Text>
        </View>
      </View>
    );
  }

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
    console.log("Save recipe clicked");

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

    const updatedRecipe: Recipe = {
      ...originalRecipe,
      name: recipeName.trim(),
      ingredients,
      servings,
      totalNutrition: calculateTotalNutrition(),
      nutritionPerServing: calculateNutritionPerServing(),
    };

    console.log("Updating recipe:", updatedRecipe.name);

    // Update recipe in context/storage
    await updateRecipe(updatedRecipe);

    Alert.alert(
      "Recipe Updated!",
      `"${recipeName}" has been updated with ${ingredients.length} ingredients.`,
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
                        `&carbs=${encodeURIComponent(
                          String(ingredient.carbs)
                        )}` +
                        `&fat=${encodeURIComponent(String(ingredient.fat))}` +
                        `&amount=${encodeURIComponent(
                          String(ingredient.amount)
                        )}` +
                        `&unit=${encodeURIComponent(ingredient.unit)}` +
                        `&fiber=${encodeURIComponent(
                          String(ingredient.fiber)
                        )}` +
                        `&sugars=${encodeURIComponent(
                          String(ingredient.sugars)
                        )}` +
                        `&saturatedFat=${encodeURIComponent(
                          String(ingredient.saturatedFat)
                        )}` +
                        `&unsaturatedFat=${encodeURIComponent(
                          String(ingredient.unsaturatedFat)
                        )}` +
                        `&cholesterol=${encodeURIComponent(
                          String(ingredient.cholesterol)
                        )}` +
                        `&sodium=${encodeURIComponent(
                          String(ingredient.sodium)
                        )}` +
                        `&potassium=${encodeURIComponent(
                          String(ingredient.potassium)
                        )}` +
                        `&mode=edit-ingredient` +
                        `&ingredientId=${encodeURIComponent(ingredient.id)}` +
                        `&recipeId=${encodeURIComponent(recipeId)}`;
                      router.push(queryStr);
                    }}
                  >
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>
                        {ingredient.name}
                      </Text>
                      <Text style={styles.ingredientAmount}>
                        {ingredient.amount} {ingredient.unit}
                      </Text>
                    </View>
                    <Text style={styles.ingredientCalories}>
                      {Math.round(ingredient.calories * ingredient.amount)} cal
                    </Text>
                  </TouchableOpacity>
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
          <Text style={styles.saveButtonText}>Save Changes</Text>
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
  content: {
    padding: 20,
    paddingTop: 20,
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
  removeButton: {
    backgroundColor: "#ff6b6b",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
  errorText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 100,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  bottomSpacer: {
    height: 80, // Space to avoid Android navigation buttons
  },
});
