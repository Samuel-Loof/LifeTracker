import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useFood, Recipe } from "../FoodContext";

export default function RecipeSelectionScreen() {
  const { recipes } = useFood();

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <View style={styles.recipeItem}>
      <TouchableOpacity
        style={styles.recipeInfo}
        onPress={() => {
          console.log(
            "Recipe selected for editing:",
            item.name,
            "ID:",
            item.id
          );
          router.push({
            pathname: "/components/screens/EditRecipeScreen",
            params: { editId: item.id },
          });
        }}
      >
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeName}>{item.name}</Text>
          <Text style={styles.recipeServings}>
            {item.servings} serving{item.servings !== 1 ? "s" : ""}
          </Text>
        </View>
        <Text style={styles.recipeCalories}>
          {Math.round(item.nutritionPerServing.calories)} cal per serving
        </Text>
        <Text style={styles.recipeIngredients}>
          {item.ingredients.length} ingredient
          {item.ingredients.length !== 1 ? "s" : ""}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => {
          console.log(
            "Edit button clicked for recipe:",
            item.name,
            "ID:",
            item.id
          );
          router.push({
            pathname: "/components/screens/EditRecipeScreen",
            params: { editId: item.id },
          });
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.editButtonText}>✏️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Select a recipe to edit</Text>

        {recipes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recipes found</Text>
            <Text style={styles.emptySubtext}>
              Create your first recipe to get started
            </Text>
            <TouchableOpacity
              style={styles.createRecipeButton}
              onPress={() => {
                router.push("/components/screens/CreateRecipeScreen");
              }}
            >
              <Text style={styles.createRecipeButtonText}>Create Recipe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={renderRecipe}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 100, // Space to avoid phone navigation buttons
  },
  recipeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  recipeServings: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  recipeCalories: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 2,
  },
  recipeIngredients: {
    fontSize: 12,
    color: "#999",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ff9800",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    marginLeft: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  editButtonText: {
    fontSize: 18,
    color: "#ff9800",
    fontWeight: "bold",
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 100, // Space to avoid phone navigation buttons
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  createRecipeButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createRecipeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
