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
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  timestamp: Date;
  mealType: string;
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
    const updated = [...dailyFoods, food];
    setDailyFoods(updated);
    await AsyncStorage.setItem("dailyFoods", JSON.stringify(updated));
  };

  const removeFood = async (foodId: string) => {
    const updated = dailyFoods.filter((food) => food.id !== foodId);
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
