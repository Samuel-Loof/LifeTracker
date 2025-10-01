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

  userGoals: UserGoals | null;
  setUserGoals: (goals: UserGoals) => Promise<void>;
  habits: HabitsState;
  setHabits: (update: Partial<HabitsState>) => Promise<void>;
  fasting: FastingSettings;
  setFasting: (update: Partial<FastingSettings>) => Promise<void>;
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

  useEffect(() => {
    loadDailyFoods();
    loadUserGoals();
    loadHabits();
    loadFasting();
  }, []);

  const loadDailyFoods = async () => {
    try {
      const stored = await AsyncStorage.getItem("dailyFoods");
      if (stored) setDailyFoods(JSON.parse(stored));
    } catch (error) {
      console.error("Error loading daily foods:", error);
    }
  };

  const addFood = async (food: FoodItem) => {
    // Allow adding the same food multiple times, but prevent duplicate favorites
    // If this food is being added as a favorite, check if it's already favorited
    if (food.isFavorite && food.barcode) {
      const existingFavorite = dailyFoods.find(
        (f) => f.barcode === food.barcode && f.isFavorite
      );
      if (existingFavorite) {
        console.log("Food with barcode already favorited:", food.barcode);
        // Remove the favorite flag from the new food since it's already favorited
        food.isFavorite = false;
      }
    }

    const updated = [...dailyFoods, food];
    setDailyFoods(updated);
    await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
  };

  const removeFood = async (foodId: string) => {
    const updated = dailyFoods.filter((food) => food.id !== foodId);
    setDailyFoods(updated);
    await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
  };

  const updateFood = async (food: FoodItem) => {
    const updated = dailyFoods.map((f) => (f.id === food.id ? food : f));
    setDailyFoods(updated);
    await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
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
    const updated = dailyFoods.map((food) =>
      food.id === foodId ? { ...food, isFavorite: !food.isFavorite } : food
    );
    setDailyFoods(updated);
    await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
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
        userGoals,
        setUserGoals,
        habits,
        setHabits,
        fasting,
        setFasting,
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
