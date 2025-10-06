import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define types
export interface FoodItem {
  id: string;
  name: string;
  brand: string;
  amount: number;
  unit: string;
  barcode?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugars?: number;
    saturatedFat?: number;
    unsaturatedFat?: number;
    cholesterol?: number; // mg
    sodium?: number; // mg
    potassium?: number; // mg
  };
  proteinQuality?: number; // PDCAAS/DIAAS-style 0..1 estimate
  timestamp: Date;
  mealType: string;
  isFavorite?: boolean;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  saturatedFat: number;
  unsaturatedFat: number;
  cholesterol: number;
  sodium: number;
  potassium: number;
}

export interface WaterSettings {
  dailyGoal: number; // in liters
  containerType: "glass" | "bottle"; // glass = 0.25L, bottle = 0.5L
}

export interface WaterIntake {
  id: string;
  amount: number; // in liters
  timestamp: Date;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  servings: number;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugars: number;
    saturatedFat: number;
    unsaturatedFat: number;
    cholesterol: number;
    sodium: number;
    potassium: number;
  };
  nutritionPerServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugars: number;
    saturatedFat: number;
    unsaturatedFat: number;
    cholesterol: number;
    sodium: number;
    potassium: number;
  };
  isFavorite: boolean;
  createdAt: Date;
}

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "veryActive";
export type GoalStrategy = "maintain" | "gain" | "lose";
export type GoalPace = "slow" | "moderate" | "custom";

export interface UserGoals {
  firstName?: string;
  sex: Sex;
  age: number; // years
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;

  strategy: GoalStrategy; // maintain/gain/lose
  pace: GoalPace; // slow/moderate/custom
  manualCalorieDelta?: number; // +/- kcal per day when pace==custom

  useManualCalories: boolean;
  manualCalories?: number; // direct override target kcal

  cuttingKeepMuscle: boolean; // toggles 2g/kg protein suggestion

  useManualMacros: boolean;
  manualProtein?: number;
  manualCarbs?: number;
  manualFat?: number;

  // Protein quality targets
  minAverageProteinQuality?: number; // e.g., 0.9
  minHighQualityProteinPercent?: number; // e.g., 75 (% of protein grams from quality >= threshold)

  // Units
  useImperialUnits: boolean; // true for lbs/ft, false for kg/cm
}

export interface HabitsState {
  daysAlcoholFree: number;
  daysNicotineFree: number;
  daysWeedFree: number;
}

export interface FastingSettings {
  fastingHours: number;
  eatingHours: number;
  notifyOneHourBefore: boolean;
  notifyAtEnd: boolean;
  notifyAtStart: boolean;
}

interface FoodContextType {
  dailyFoods: FoodItem[];
  addFood: (food: FoodItem) => void;
  removeFood: (foodId: string) => void;
  updateFood: (food: FoodItem) => void;
  getFoodsForDate: (date: Date) => FoodItem[];
  toggleFavorite: (foodId: string) => void;
  toggleFavoriteByBarcode: (barcode: string) => Promise<void>;
  getFavorites: () => FoodItem[];
  findFoodByBarcode: (barcode: string) => FoodItem | undefined;
  findFoodByNameAndBrand: (name: string, brand: string) => FoodItem | undefined;
  clearAllFavorites: () => Promise<void>;

  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => Promise<void>;
  removeRecipe: (recipeId: string) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  toggleRecipeFavorite: (recipeId: string) => Promise<void>;
  getFavoriteRecipes: () => Recipe[];

  userGoals: UserGoals | null;
  setUserGoals: (goals: UserGoals) => Promise<void>;
  habits: HabitsState;
  setHabits: (update: Partial<HabitsState>) => Promise<void>;
  fasting: FastingSettings;
  setFasting: (update: Partial<FastingSettings>) => Promise<void>;

  // Water tracking
  waterSettings: WaterSettings;
  waterIntakes: WaterIntake[];
  updateWaterSettings: (settings: WaterSettings) => Promise<void>;
  addWaterIntake: (amount: number) => void;
  removeWaterIntake: (id: string) => void;
  removeWaterIntakeByAmount: (amount: number) => void;
  getTodayWaterIntake: () => number;
}

// Create context
const FoodContext = createContext<FoodContextType | undefined>(undefined);

// Provider props interface
interface FoodProviderProps {
  children: ReactNode;
}

// Conversion functions
export const convertKgToLbs = (kg: number): number => kg * 2.20462;
export const convertLbsToKg = (lbs: number): number => lbs / 2.20462;
export const convertCmToFtIn = (
  cm: number
): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};
export const convertFtInToCm = (feet: number, inches: number): number =>
  (feet * 12 + inches) * 2.54;

export const FoodProvider = ({ children }: FoodProviderProps) => {
  const [dailyFoods, setDailyFoods] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userGoals, setUserGoalsState] = useState<UserGoals | null>(null);
  const [habits, setHabitsState] = useState<HabitsState>({
    daysAlcoholFree: 0,
    daysNicotineFree: 0,
    daysWeedFree: 0,
  });
  const [fasting, setFastingState] = useState<FastingSettings>({
    fastingHours: 16,
    eatingHours: 8,
    notifyOneHourBefore: false,
    notifyAtEnd: false,
    notifyAtStart: false,
  });
  const [waterSettings, setWaterSettingsState] = useState<WaterSettings>({
    dailyGoal: 3.0, // 3L default
    containerType: "glass", // 0.25L default
  });
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>([]);

  useEffect(() => {
    loadDailyFoods();
    loadRecipes();
    loadUserGoals();
    loadHabits();
    loadFasting();
    loadWaterSettings();
    loadWaterIntakes();
  }, []);

  const loadDailyFoods = async () => {
    try {
      const stored = await AsyncStorage.getItem("dailyFoods");
      if (stored) setDailyFoods(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading daily foods:", error);
    }
  };

  const loadRecipes = async () => {
    try {
      const stored = await AsyncStorage.getItem("recipes");
      if (stored) {
        const parsedRecipes = JSON.parse(stored);
        // Convert createdAt strings back to Date objects
        const recipesWithDates = parsedRecipes.map((recipe: any) => ({
          ...recipe,
          createdAt: new Date(recipe.createdAt),
        }));
        setRecipes(recipesWithDates);
      }
    } catch (error) {
      console.error("Error loading recipes:", error);
    }
  };

  const addFood = async (food: FoodItem) => {
    // Use functional update to avoid race conditions
    setDailyFoods((prevDailyFoods) => {
      // Allow adding the same food multiple times, but prevent duplicate favorites
      // If this food is being added as a favorite, check if it's already favorited
      if (food.isFavorite && food.barcode) {
        const existingFavorite = prevDailyFoods.find(
          (f) => f.barcode === food.barcode && f.isFavorite
        );
        if (existingFavorite) {
          console.log("Food with barcode already favorited:", food.barcode);
          // Remove the favorite flag from the new food since it's already favorited
          food.isFavorite = false;
        }
      }

      const updated = [...prevDailyFoods, food];
      // Save to AsyncStorage asynchronously
      AsyncStorage.setItem("dailyFoods", JSON.stringify(updated)).catch(
        (error) => {
          console.error("Error saving daily foods:", error);
        }
      );

      return updated;
    });
  };

  const removeFood = async (foodId: string) => {
    setDailyFoods((prevDailyFoods) => {
      const updated = prevDailyFoods.filter((food) => food.id !== foodId);
      // Save to AsyncStorage asynchronously
      AsyncStorage.setItem("dailyFoods", JSON.stringify(updated)).catch(
        (error) => {
          console.error("Error saving daily foods:", error);
        }
      );
      return updated;
    });
  };

  const updateFood = async (food: FoodItem) => {
    setDailyFoods((prevDailyFoods) => {
      const updated = prevDailyFoods.map((f) => (f.id === food.id ? food : f));
      // Save to AsyncStorage asynchronously
      AsyncStorage.setItem("dailyFoods", JSON.stringify(updated)).catch(
        (error) => {
          console.error("Error saving daily foods:", error);
        }
      );
      return updated;
    });
  };

  const getFoodsForDate = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return dailyFoods.filter((food) => {
      const foodDate = new Date(food.timestamp);
      return foodDate >= targetDate && foodDate < nextDay;
    });
  };

  const toggleFavorite = async (foodId: string) => {
    setDailyFoods((prevDailyFoods) => {
      const updated = prevDailyFoods.map((food) =>
        food.id === foodId ? { ...food, isFavorite: !food.isFavorite } : food
      );
      // Save to AsyncStorage asynchronously
      AsyncStorage.setItem("dailyFoods", JSON.stringify(updated)).catch(
        (error) => {
          console.error("Error saving daily foods:", error);
        }
      );
      return updated;
    });
  };

  const toggleFavoriteByBarcode = async (barcode: string) => {
    // Check if any food with this barcode is currently favorited
    const favoritedFood = dailyFoods.find(
      (food) => food.barcode === barcode && food.isFavorite
    );

    if (favoritedFood) {
      // If there's a favorited food with this barcode, unfavorite ALL foods with this barcode
      const updated = dailyFoods.map((food) =>
        food.barcode === barcode ? { ...food, isFavorite: false } : food
      );
      setDailyFoods(updated);
      await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
    } else {
      // If no favorited food with this barcode, favorite the first one we find
      const firstFood = dailyFoods.find((food) => food.barcode === barcode);
      if (firstFood) {
        const updated = dailyFoods.map((food) =>
          food.id === firstFood.id ? { ...food, isFavorite: true } : food
        );
        setDailyFoods(updated);
        await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
      }
    }
  };

  const getFavorites = () => {
    return dailyFoods.filter((food) => food.isFavorite);
  };

  const findFoodByBarcode = (barcode: string) => {
    return dailyFoods.find((food) => food.barcode === barcode);
  };

  const findFoodByNameAndBrand = (name: string, brand: string) => {
    return dailyFoods.find(
      (food) => food.name === name && food.brand === brand
    );
  };

  const clearAllFavorites = async () => {
    const updated = dailyFoods.map((food) => ({
      ...food,
      isFavorite: false,
    }));
    setDailyFoods(updated);
    await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
  };

  const loadUserGoals = async () => {
    try {
      const stored = await AsyncStorage.getItem("userGoals");
      if (stored) setUserGoalsState(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading user goals:", error);
    }
  };

  const setUserGoals = async (goals: UserGoals) => {
    setUserGoalsState(goals);
    try {
      await AsyncStorage.setItem("userGoals", JSON.stringify(goals));
    } catch (error) {
      console.error("Error saving user goals:", error);
    }
  };

  const loadHabits = async () => {
    try {
      const stored = await AsyncStorage.getItem("habits");
      if (stored) setHabitsState(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading habits:", error);
    }
  };

  const setHabits = async (update: Partial<HabitsState>) => {
    const next = { ...habits, ...update };
    setHabitsState(next);
    try {
      await AsyncStorage.setItem("habits", JSON.stringify(next));
    } catch (error) {
      console.error("Error saving habits:", error);
    }
  };

  const loadFasting = async () => {
    try {
      const stored = await AsyncStorage.getItem("fastingSettings");
      if (stored) setFastingState(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading fasting settings:", error);
    }
  };

  const setFasting = async (update: Partial<FastingSettings>) => {
    const merged = { ...fasting, ...update };
    if (typeof merged.fastingHours === "number") {
      merged.fastingHours = Math.max(
        12,
        Math.min(23, Math.round(merged.fastingHours))
      );
      merged.eatingHours = 24 - merged.fastingHours;
    }
    setFastingState(merged);
    try {
      await AsyncStorage.setItem("fastingSettings", JSON.stringify(merged));
    } catch (error) {
      console.error("Error saving fasting settings:", error);
    }
  };

  // Water tracking functions
  const loadWaterSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem("waterSettings");
      if (stored) setWaterSettingsState(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading water settings:", error);
    }
  };

  const loadWaterIntakes = async () => {
    try {
      const stored = await AsyncStorage.getItem("waterIntakes");
      if (stored) {
        const parsedIntakes = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const intakesWithDates = parsedIntakes.map((intake: any) => ({
          ...intake,
          timestamp: new Date(intake.timestamp),
        }));
        setWaterIntakes(intakesWithDates);
      }
    } catch (error) {
      console.error("Error loading water intakes:", error);
    }
  };

  const updateWaterSettings = async (settings: WaterSettings) => {
    setWaterSettingsState(settings);
    try {
      await AsyncStorage.setItem("waterSettings", JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving water settings:", error);
    }
  };

  const addWaterIntake = (amount: number) => {
    const newIntake: WaterIntake = {
      id: Date.now().toString(),
      amount,
      timestamp: new Date(),
    };
    setWaterIntakes((prev) => {
      const updated = [...prev, newIntake];
      // Save to AsyncStorage asynchronously
      AsyncStorage.setItem("waterIntakes", JSON.stringify(updated)).catch(
        (error) => {
          console.error("Error saving water intakes:", error);
        }
      );
      return updated;
    });
  };

  const removeWaterIntake = (id: string) => {
    setWaterIntakes((prev) => {
      const updated = prev.filter((intake) => intake.id !== id);
      // Save to AsyncStorage asynchronously
      AsyncStorage.setItem("waterIntakes", JSON.stringify(updated)).catch(
        (error) => {
          console.error("Error saving water intakes:", error);
        }
      );
      return updated;
    });
  };

  const removeWaterIntakeByAmount = (amount: number) => {
    setWaterIntakes((prev) => {
      // Find the most recent intake with the specified amount
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayIntakes = prev.filter((intake) => {
        const intakeDate = new Date(intake.timestamp);
        return intakeDate >= today && intakeDate < tomorrow;
      });

      console.log(
        `Looking for amount ${amount}L in today's intakes:`,
        todayIntakes.map((i) => ({ amount: i.amount, id: i.id }))
      );

      // First try to find exact matches
      let matchingIntakes = todayIntakes.filter(
        (intake) => intake.amount === amount
      );

      // If no exact matches and we're trying to remove 0.5L, try to remove two 0.25L intakes
      if (matchingIntakes.length === 0 && amount === 0.5) {
        const smallIntakes = todayIntakes.filter(
          (intake) => intake.amount === 0.25
        );
        if (smallIntakes.length >= 2) {
          // Remove the two most recent 0.25L intakes
          const sortedSmallIntakes = smallIntakes.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          const toRemove = sortedSmallIntakes.slice(0, 2);
          console.log(
            `Removing two 0.25L intakes to simulate 0.5L removal:`,
            toRemove.map((i) => i.id)
          );
          const updated = prev.filter(
            (intake) => !toRemove.some((remove) => remove.id === intake.id)
          );
          AsyncStorage.setItem("waterIntakes", JSON.stringify(updated)).catch(
            (error) => {
              console.error("Error saving water intakes:", error);
            }
          );
          return updated;
        }
      }

      // If no exact matches and we're trying to remove 0.25L, try to split a 0.5L intake
      if (matchingIntakes.length === 0 && amount === 0.25) {
        const largeIntakes = todayIntakes.filter(
          (intake) => intake.amount === 0.5
        );
        if (largeIntakes.length > 0) {
          // Find the most recent 0.5L intake and split it
          const sortedLargeIntakes = largeIntakes.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          const toSplit = sortedLargeIntakes[0];
          console.log(
            `Splitting 0.5L intake to simulate 0.25L removal:`,
            toSplit.id
          );

          // Remove the 0.5L intake and add a 0.25L intake back
          const updated = prev.filter((intake) => intake.id !== toSplit.id);
          const newIntake = {
            ...toSplit,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            amount: 0.25,
            timestamp: new Date(),
          };
          updated.push(newIntake);

          AsyncStorage.setItem("waterIntakes", JSON.stringify(updated)).catch(
            (error) => {
              console.error("Error saving water intakes:", error);
            }
          );
          return updated;
        }
      }

      console.log(
        `Found ${matchingIntakes.length} matching intakes for ${amount}L`
      );

      if (matchingIntakes.length > 0) {
        const mostRecentMatchingIntake =
          matchingIntakes[matchingIntakes.length - 1];
        console.log(
          `Removing intake: ${mostRecentMatchingIntake.amount}L (ID: ${mostRecentMatchingIntake.id})`
        );
        const updated = prev.filter(
          (intake) => intake.id !== mostRecentMatchingIntake.id
        );
        // Save to AsyncStorage asynchronously
        AsyncStorage.setItem("waterIntakes", JSON.stringify(updated)).catch(
          (error) => {
            console.error("Error saving water intakes:", error);
          }
        );
        return updated;
      }
      console.log(`No matching intakes found for ${amount}L`);
      return prev;
    });
  };

  const getTodayWaterIntake = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return waterIntakes
      .filter((intake) => {
        const intakeDate = new Date(intake.timestamp);
        return intakeDate >= today && intakeDate < tomorrow;
      })
      .reduce((total, intake) => total + intake.amount, 0);
  };

  // Recipe management functions
  const addRecipe = async (recipe: Recipe) => {
    const updated = [...recipes, recipe];
    setRecipes(updated);
    try {
      await AsyncStorage.setItem("recipes", JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recipes:", error);
    }
  };

  const removeRecipe = async (recipeId: string) => {
    const updated = recipes.filter((recipe) => recipe.id !== recipeId);
    setRecipes(updated);
    try {
      await AsyncStorage.setItem("recipes", JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recipes:", error);
    }
  };

  const updateRecipe = async (recipe: Recipe) => {
    console.log("updateRecipe called with:", recipe.name, "ID:", recipe.id);
    const updated = recipes.map((r) => (r.id === recipe.id ? recipe : r));
    console.log("Updated recipes count:", updated.length);
    setRecipes(updated);
    try {
      await AsyncStorage.setItem("recipes", JSON.stringify(updated));
      console.log("Recipe saved to AsyncStorage successfully");
    } catch (error) {
      console.error("Error saving recipes:", error);
    }
  };

  const toggleRecipeFavorite = async (recipeId: string) => {
    const updated = recipes.map((recipe) =>
      recipe.id === recipeId
        ? { ...recipe, isFavorite: !recipe.isFavorite }
        : recipe
    );
    setRecipes(updated);
    try {
      await AsyncStorage.setItem("recipes", JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving recipes:", error);
    }
  };

  const getFavoriteRecipes = () => {
    return recipes.filter((recipe) => recipe.isFavorite);
  };

  return (
    <FoodContext.Provider
      value={{
        dailyFoods,
        addFood,
        removeFood,
        updateFood,
        getFoodsForDate,
        toggleFavorite,
        toggleFavoriteByBarcode,
        getFavorites,
        findFoodByBarcode,
        findFoodByNameAndBrand,
        clearAllFavorites,
        recipes,
        addRecipe,
        removeRecipe,
        updateRecipe,
        toggleRecipeFavorite,
        getFavoriteRecipes,
        userGoals,
        setUserGoals,
        habits,
        setHabits,
        fasting,
        setFasting,
        waterSettings,
        waterIntakes,
        updateWaterSettings,
        addWaterIntake,
        removeWaterIntake,
        removeWaterIntakeByAmount,
        getTodayWaterIntake,
      }}
    >
      {children}
    </FoodContext.Provider>
  );
};

export const useFood = () => {
  const context = useContext(FoodContext);
  if (context === undefined) {
    throw new Error("useFood must be used within a FoodProvider");
  }
  return context;
};
