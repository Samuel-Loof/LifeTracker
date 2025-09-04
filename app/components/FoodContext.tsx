import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define types
interface FoodItem {
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
}

interface FoodContextType {
  dailyFoods: FoodItem[];
  addFood: (food: FoodItem) => void;
}

// Create context
const FoodContext = createContext<FoodContextType | undefined>(undefined);

// Provider props interface
interface FoodProviderProps {
  children: ReactNode;
}

export const FoodProvider = ({ children }: FoodProviderProps) => {
  const [dailyFoods, setDailyFoods] = useState<FoodItem[]>([]);

  useEffect(() => {
    loadDailyFoods();
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

  return (
    <FoodContext.Provider value={{ dailyFoods, addFood }}>
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
