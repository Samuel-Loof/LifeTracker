import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, Link } from "expo-router";
import { useFood, FoodItem } from "../FoodContext"; // To get recent foods
import { FlatList } from "react-native";
import { FoodData, searchFoodByName } from "../FoodDataService";

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { dailyFoods, addFood } = useFood();
  // Search and filters
  const [query, setQuery] = useState("");
  const [apiResults, setApiResults] = useState<FoodData[]>([]);
  const [searching, setSearching] = useState(false);

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
    "recent" | "favorites" | "added"
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

  // Favorites and added: placeholders for now
  const favoriteFoods: FoodItem[] = [];
  const addedFoods: FoodItem[] = [];

  // Convert API FoodData -> UI FoodItem (default 1 serving)
  const mapApiToFoodItem = (f: FoodData): FoodItem => ({
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
  });

  const currentList = useMemo(() => {
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
    const newFoodItem: FoodItem = {
      id: Date.now().toString(),
      name: food.name || "Unnamed Food",
      brand: food.brand || "Unknown Brand",
      amount: food.amount || 1,
      unit: food.unit || "serving",
      nutrition: {
        calories: food.nutrition.calories || 0,
        protein: food.nutrition.protein || 0,
        carbs: food.nutrition.carbs || 0,
        fat: food.nutrition.fat || 0,
      },
      proteinQuality:
        food.proteinQuality ??
        lookupProteinQuality(`${food.name} ${food.brand}`),
      timestamp: new Date(),
      mealType: mealType,
    };

    addFood(newFoodItem);
    router.back();
  };

  const navigateToDetails = (food: FoodItem) => {
    const queryStr =
      `/components/screens/FoodDetailsScreen?` +
      `name=${encodeURIComponent(food.name)}` +
      `&brand=${encodeURIComponent(food.brand)}` +
      `&calories=${encodeURIComponent(String(food.nutrition.calories))}` +
      `&protein=${encodeURIComponent(String(food.nutrition.protein))}` +
      `&carbs=${encodeURIComponent(String(food.nutrition.carbs))}` +
      `&fat=${encodeURIComponent(String(food.nutrition.fat))}` +
      `&meal=${encodeURIComponent(String(mealType))}`;

    router.push(queryStr);
  };

  // Simple heuristic to estimate protein quality by name
  function lookupProteinQuality(name: string): number {
    const n = (name || "").toLowerCase();
    if (/(egg|whey|casein|milk protein|beef|fish)/.test(n)) return 1.0;
    if (/(soy isolate|soy protein isolate)/.test(n)) return 1.0;
    if (/quinoa|pea protein|canola protein|potato protein/.test(n)) return 0.8;
    if (/lentil|chickpea|bean|kidney bean|black bean|navy bean|pinto/.test(n))
      return 0.65;
    if (/oat|wheat|rice|barley|grain/.test(n)) return 0.5;
    if (/almond|peanut|nut|seed/.test(n)) return 0.4;
    return 0.7;
  }

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
        <Text style={styles.headerTitle}>{String(mealType).toUpperCase()}</Text>
        <TouchableOpacity
          style={styles.headerRight}
          onPress={() => {
            /* open menu later */
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerRightText}>⋯</Text>
        </TouchableOpacity>
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
          onPress={() => router.push(`/scanner?meal=${mealType}`)}
        >
          <Text style={styles.cameraIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Daily intake bar */}
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

      {/* Macro bars */}
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

      {/* Filters */}
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
            📝
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

      {/* List */}
      <View style={styles.recentSection}>
        {displayList.length === 0 ? (
          <Text style={styles.emptyText}>No foods found</Text>
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item.id}
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
  emptyText: {
    textAlign: "center",
    color: "#7f8c8d",
    fontStyle: "italic",
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
});
