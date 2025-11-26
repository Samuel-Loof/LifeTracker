import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams, Link } from "expo-router";
import { useFood, FoodItem } from "../FoodContext"; // To get recent foods
import { FlatList } from "react-native";
import { FoodData, searchFoodByName } from "../FoodDataService";

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dailyFoods, addFood, clearAllFavorites, recipes } = useFood();

  // Check if we're in recipe mode
  const isRecipeMode = params.mode === "recipe";
  // Search and filters
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState<FoodData[]>([]);
  const [searching, setSearching] = useState(false);

  // Modal state
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // API search function when the user types in the search bar
  useEffect(() => {
    const searchAPI = async () => {
      const trimmed = query.trim();
      if (trimmed.length < 3) {
        setApiResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchFoodByName(trimmed);
        setApiResults(results);
      } finally {
        setSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchAPI, 444);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const mealType = Array.isArray(params.meal)
    ? params.meal[0]
    : (params.meal as string) || "all";

  const [selectedTab, setSelectedTab] = useState<
    "recent" | "favorites" | "recipes" | "added"
  >("recent");

  // Totals for daily intake bar (all meals)
  const totals = useMemo(() => {
    return dailyFoods.reduce(
      (acc, f) => {
        acc.calories += Number(f.nutrition.calories) || 0;
        acc.protein += Number(f.nutrition.protein) || 0;
        acc.carbs += Number(f.nutrition.carbs) || 0;
        acc.fat += Number(f.nutrition.fat) || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [dailyFoods]);

  // Placeholder goals
  const goals = { calories: 2000, protein: 150, carbs: 250, fat: 70 };
  const pct = (v: number, g: number) => (g > 0 ? Math.min(v / g, 1) : 0);

  // Recent foods - last 100, dedupe by name+brand, most recent first
  const recentFoodsRaw: FoodItem[] =
    dailyFoods.length > 0 ? dailyFoods.slice(-100).reverse() : [];
  const uniqueRecentFoods = useMemo(() => {
    const seen = new Set<string>();
    const result: FoodItem[] = [];
    for (const food of recentFoodsRaw) {
      const key = `${food.name}|${food.brand}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(food);
      }
    }
    return result;
  }, [recentFoodsRaw]);

  // Favorites and added: get from daily foods
  const favoriteFoods: FoodItem[] = dailyFoods.filter(
    (food) => food.isFavorite
  );

  // Get foods for the specified date (or today if no date param)
  const targetDate = useMemo(() => {
    if (params.date) {
      // Parse YYYY-MM-DD format without timezone issues
      const dateStr = params.date as string;
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        const dateFromParams = new Date(year, month - 1, day);
        dateFromParams.setHours(12, 0, 0, 0);
        return dateFromParams;
      }
    }
    return new Date();
  }, [params.date]);

  const dateStart = useMemo(() => {
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [targetDate]);

  const dateEnd = useMemo(() => {
    const end = new Date(dateStart);
    end.setDate(end.getDate() + 1);
    return end;
  }, [dateStart]);

  const addedFoods: FoodItem[] = dailyFoods.filter((food) => {
    const foodDate = new Date(food.timestamp);
    return foodDate >= dateStart && foodDate < dateEnd;
  });

  // Convert API FoodData -> UI FoodItem (default 1 serving)
  const mapApiToFoodItem = (f: FoodData): FoodItem => {
    const foodItem: any = {
      id: `api:${f.barcode || `${f.name}|${f.brand}`}`,
      name: f.name,
      brand: f.brand,
      amount: 1,
      unit: "serving",
      nutrition: {
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
      },
      timestamp: new Date(),
      mealType: mealType,
    };
    // Preserve category information for protein quality detection
    if (f.category) foodItem.category = f.category;
    if (f.categories) foodItem.categories = f.categories;
    return foodItem as FoodItem;
  };

  const currentList = useMemo(() => {
    if (selectedTab === "recipes") {
      // For recipes, we'll handle them separately since they're not FoodItem[]
      return [];
    }

    let base: FoodItem[] = [];
    if (selectedTab === "recent") base = uniqueRecentFoods;
    else if (selectedTab === "favorites") base = favoriteFoods;
    else base = addedFoods;

    if (!query.trim()) return base;
    const q = query.trim().toLowerCase();
    return base.filter((f) =>
      `${f.name} ${f.brand} ${f.mealType}`.toLowerCase().includes(q)
    );
  }, [selectedTab, uniqueRecentFoods, favoriteFoods, addedFoods, query]);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (selectedTab !== "recipes") return [];

    if (!query.trim()) return recipes;
    const q = query.trim().toLowerCase();
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(q));
  }, [selectedTab, recipes, query]);

  // When searching, merge API results with local filtered items (dedup by name|brand)
  const displayList: FoodItem[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return currentList;

    const seen = new Set<string>();
    const byKey = (f: FoodItem) => `${f.name}|${f.brand}`.toLowerCase();

    const localPart: FoodItem[] = currentList;
    const apiPart: FoodItem[] = apiResults.map(mapApiToFoodItem);

    const merged: FoodItem[] = [];
    for (const item of [...localPart, ...apiPart]) {
      const key = byKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
    return merged;
  }, [query, currentList, apiResults]);

  const addRecentFood = (food: FoodItem) => {
    if (isRecipeMode) {
      // In recipe mode, navigate to FoodDetailsScreen instead of adding directly
      navigateToDetails(food);
    } else {
      // Normal mode - add to daily intake
      // Use target date if available, otherwise use today
      let foodTimestamp = new Date();
      if (params.date) {
        const dateStr = params.date as string;
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
          foodTimestamp = new Date(year, month - 1, day);
          foodTimestamp.setHours(12, 0, 0, 0);
        }
      }

      const newFoodItem: FoodItem = {
        id: Date.now().toString(),
        name: food.name || "Unnamed Food",
        brand: food.brand || "Unknown Brand",
        amount: food.amount || 1,
        unit: food.unit || "serving",
        barcode: food.barcode,
        nutrition: {
          calories: food.nutrition.calories || 0,
          protein: food.nutrition.protein || 0,
          carbs: food.nutrition.carbs || 0,
          fat: food.nutrition.fat || 0,
        },
        timestamp: foodTimestamp,
        mealType: mealType,
      };

      addFood(newFoodItem);
      router.back();
    }
  };

  const navigateToDetails = (food: FoodItem) => {
    const category = (food as any).category || "";
    const categories = (food as any).categories || [];
    const categoriesParam = categories.length > 0 ? categories.join(",") : "";

    // Get date parameter if available
    const dateParam = params.date ? `&date=${encodeURIComponent(params.date as string)}` : "";

    const queryStr =
      `/components/screens/FoodDetailsScreen?` +
      `name=${encodeURIComponent(food.name)}` +
      `&brand=${encodeURIComponent(food.brand)}` +
      `&calories=${encodeURIComponent(String(food.nutrition.calories))}` +
      `&protein=${encodeURIComponent(String(food.nutrition.protein))}` +
      `&carbs=${encodeURIComponent(String(food.nutrition.carbs))}` +
      `&fat=${encodeURIComponent(String(food.nutrition.fat))}` +
      `&meal=${encodeURIComponent(String(mealType))}` +
      `&barcode=${encodeURIComponent(String(food.barcode || ""))}` +
      `&fiber=${encodeURIComponent(String(food.nutrition.fiber || 0))}` +
      `&sugars=${encodeURIComponent(String(food.nutrition.sugars || 0))}` +
      `&saturatedFat=${encodeURIComponent(
        String(food.nutrition.saturatedFat || 0)
      )}` +
      `&unsaturatedFat=${encodeURIComponent(
        String(food.nutrition.unsaturatedFat || 0)
      )}` +
      `&cholesterol=${encodeURIComponent(
        String(food.nutrition.cholesterol || 0)
      )}` +
      `&sodium=${encodeURIComponent(String(food.nutrition.sodium || 0))}` +
      `&potassium=${encodeURIComponent(
        String(food.nutrition.potassium || 0)
      )}` +
      (category ? `&category=${encodeURIComponent(category)}` : "") +
      (categoriesParam ? `&categories=${encodeURIComponent(categoriesParam)}` : "") +
      dateParam +
      (isRecipeMode ? `&mode=recipe` : "");

    router.push(queryStr);
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerLeftText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isRecipeMode ? "Add Ingredient" : String(mealType).toUpperCase()}
        </Text>
        {!isRecipeMode && (
          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => setShowOptionsModal(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.headerRightText}>⋯</Text>
          </TouchableOpacity>
        )}
        {isRecipeMode && <View style={{ width: 36 }} />}
      </View>

      {/* Search + camera row */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="food, meal, brand"
          placeholderTextColor="#9aa3aa"
        />
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={() =>
            router.push(
              `/scanner?meal=${mealType}${isRecipeMode ? "&mode=recipe" : ""}`
            )
          }
        >
          <Text style={styles.cameraIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Daily intake bar - hide in recipe mode */}
      {!isRecipeMode && (
        <View style={styles.card}>
          <View style={styles.dailyHeader}>
            <Text style={styles.dailyLabel}>Daily intake</Text>
            <Text
              style={styles.dailyValue}
            >{`${totals.calories}/${goals.calories} kcal`}</Text>
          </View>
          <View style={styles.dailyTrack}>
            <View
              style={[
                styles.dailyFill,
                { width: `${pct(totals.calories, goals.calories) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Macro bars */}
      {!isRecipeMode && (
        <View style={styles.card}>
          <View style={styles.macroRow}>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Protein</Text>
              <View style={styles.macroTrack}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${pct(totals.protein, goals.protein) * 100}%`,
                      backgroundColor: "#E57373",
                    },
                  ]}
                />
              </View>
              <Text style={styles.macroValue}>{`${totals.protein.toFixed(0)}/${
                goals.protein
              }g`}</Text>
            </View>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <View style={styles.macroTrack}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${pct(totals.carbs, goals.carbs) * 100}%`,
                      backgroundColor: "#FFB74D",
                    },
                  ]}
                />
              </View>
              <Text style={styles.macroValue}>{`${totals.carbs.toFixed(0)}/${
                goals.carbs
              }g`}</Text>
            </View>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Fat</Text>
              <View style={styles.macroTrack}>
                <View
                  style={[
                    styles.macroFill,
                    {
                      width: `${pct(totals.fat, goals.fat) * 100}%`,
                      backgroundColor: "#9575CD",
                    },
                  ]}
                />
              </View>
              <Text style={styles.macroValue}>{`${totals.fat.toFixed(0)}/${
                goals.fat
              }g`}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filters - hide in recipe mode */}
      {!isRecipeMode && (
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              selectedTab === "recent" && styles.filterBtnActive,
            ]}
            onPress={() => setSelectedTab("recent")}
          >
            <Text
              style={[
                styles.filterIcon,
                selectedTab === "recent" && styles.filterIconActive,
              ]}
            >
              ⏱️
            </Text>
            <Text
              style={[
                styles.filterText,
                selectedTab === "recent" && styles.filterTextActive,
              ]}
            >
              Last tracked
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              selectedTab === "favorites" && styles.filterBtnActive,
            ]}
            onPress={() => setSelectedTab("favorites")}
          >
            <Text
              style={[
                styles.filterIcon,
                selectedTab === "favorites" && styles.filterIconActive,
              ]}
            >
              ❤
            </Text>
            <Text
              style={[
                styles.filterText,
                selectedTab === "favorites" && styles.filterTextActive,
              ]}
            >
              Favorites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              selectedTab === "recipes" && styles.filterBtnActive,
            ]}
            onPress={() => setSelectedTab("recipes")}
          >
            <Text
              style={[
                styles.filterIcon,
                selectedTab === "recipes" && styles.filterIconActive,
              ]}
            >
              📝
            </Text>
            <Text
              style={[
                styles.filterText,
                selectedTab === "recipes" && styles.filterTextActive,
              ]}
            >
              Recipes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              selectedTab === "added" && styles.filterBtnActive,
            ]}
            onPress={() => setSelectedTab("added")}
          >
            <Text
              style={[
                styles.filterIcon,
                selectedTab === "added" && styles.filterIconActive,
              ]}
            >
              📋
            </Text>
            <Text
              style={[
                styles.filterText,
                selectedTab === "added" && styles.filterTextActive,
              ]}
            >
              You added
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Clear All Favorites Button - only show in favorites tab when there are favorites */}
      {selectedTab === "favorites" && favoriteFoods.length > 0 && (
        <View style={styles.clearFavoritesContainer}>
          <TouchableOpacity
            style={styles.clearFavoritesButton}
            onPress={() => {
              Alert.alert(
                "Clear All Favorites",
                `Are you sure you want to remove ${
                  favoriteFoods.length
                } favorite${favoriteFoods.length === 1 ? "" : "s"}?`,
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Clear All",
                    style: "destructive",
                    onPress: () => {
                      clearAllFavorites();
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.clearFavoritesText}>Clear All Favorites</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      <View style={styles.recentSection}>
        {selectedTab === "recipes" ? (
          filteredRecipes.length === 0 ? (
            <View style={styles.emptyRecipesContainer}>
              <Text style={styles.emptyText}>
                {recipes.length === 0
                  ? "No recipes yet. Create your first recipe!"
                  : "No recipes found"}
              </Text>
              {recipes.length === 0 && (
                <TouchableOpacity
                  style={styles.createRecipeButton}
                  onPress={() =>
                    router.push("/components/screens/CreateRecipeScreen")
                  }
                >
                  <Text style={styles.createRecipeButtonText}>
                    Create Recipe
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.foodItem}
                  onPress={() => {
                    console.log(
                      "Recipe item clicked, navigating to RecipeDetailsScreen for:",
                      item.name
                    );
                    router.push(
                      `/components/screens/RecipeDetailsScreen?id=${item.id}`
                    );
                  }}
                >
                  <View style={styles.foodInfo}>
                    <View style={styles.foodNameRow}>
                      <Text style={styles.foodName}>{item.name}</Text>
                      <Text style={styles.foodBrand}>
                        {item.servings} serving{item.servings !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text style={styles.foodCalories}>
                      {Math.round(item.nutritionPerServing.calories)} cal per
                      serving
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )
        ) : displayList.length === 0 ? (
          <Text style={styles.emptyText}>No foods found</Text>
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.foodItem}>
                <TouchableOpacity
                  style={styles.foodInfo}
                  onPress={() => navigateToDetails(item)}
                >
                  <Text style={styles.foodName}>{item.name}</Text>
                  <Text style={styles.foodDetails}>
                    {item.nutrition.calories} cal • {item.amount} {item.unit}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => addRecentFood(item)}
                  style={styles.addButtonContainer}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.addButton}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowOptionsModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                    <Text style={styles.modalClose}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Create Recipe</Text>
                  <View style={{ width: 24 }} />
                </View>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setShowOptionsModal(false);
                    router.push("/components/screens/CreateRecipeScreen");
                  }}
                >
                  <Text style={styles.modalOptionIcon}>📝</Text>
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Create Recipe</Text>
                    <Text style={styles.modalOptionSubtitle}>
                      Save ingredients with specific amounts as a reusable
                      recipe
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setShowOptionsModal(false);
                    // Navigate to RecipeSelectionScreen
                    router.push("/components/screens/RecipeSelectionScreen");
                  }}
                >
                  <Text style={styles.modalOptionIcon}>✏️</Text>
                  <View style={styles.modalOptionText}>
                    <Text style={styles.modalOptionTitle}>Edit Recipe</Text>
                    <Text style={styles.modalOptionSubtitle}>
                      Modify an existing recipe's ingredients and amounts
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerLeftText: {
    fontSize: 22,
    color: "#2c3e50",
    fontWeight: "700",
    lineHeight: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },
  headerRight: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  headerRightText: {
    fontSize: 18,
    color: "#2c3e50",
    fontWeight: "700",
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: "#7f8c8d",
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2c3e50",
  },
  cameraButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f4f7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cameraIcon: {
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
  },
  dailyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dailyLabel: {
    color: "#2c3e50",
    fontWeight: "600",
  },
  dailyValue: {
    color: "#7f8c8d",
  },
  dailyTrack: {
    height: 10,
    backgroundColor: "#f1f4f7",
    borderRadius: 6,
    overflow: "hidden",
  },
  dailyFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 6,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  macroCol: {
    flex: 1,
  },
  macroLabel: {
    color: "#2c3e50",
    fontWeight: "600",
    marginBottom: 6,
  },
  macroTrack: {
    height: 8,
    backgroundColor: "#f1f4f7",
    borderRadius: 6,
    overflow: "hidden",
  },
  macroFill: {
    height: "100%",
    borderRadius: 6,
  },
  macroValue: {
    color: "#7f8c8d",
    marginTop: 6,
    fontSize: 12,
  },
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  filterBtnActive: {
    borderColor: "#cbd5db",
    backgroundColor: "#f8fafc",
  },
  filterIcon: {
    marginRight: 6,
    color: "#7f8c8d",
  },
  filterIconActive: {
    color: "#2c3e50",
  },
  filterText: {
    color: "#7f8c8d",
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#2c3e50",
  },
  recentSection: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Add space at bottom to avoid phone navigation overlap
  },
  emptyText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontStyle: "italic",
  },
  emptyRecipesContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  createRecipeButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
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
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  foodNameRow: {
    flexDirection: "column",
  },
  foodBrand: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
  },
  foodDetails: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 2,
  },
  addButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3498db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF7FD",
  },
  addButton: {
    fontSize: 22,
    color: "#3498db",
    fontWeight: "bold",
    lineHeight: 22,
  },
  clearFavoritesContainer: {
    marginBottom: 12,
    alignItems: "center",
  },
  clearFavoritesButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ff5252",
  },
  clearFavoritesText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalClose: {
    fontSize: 24,
    color: "#2c3e50",
    width: 24,
    textAlign: "left",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#2c3e50",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  modalOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18,
  },
});
