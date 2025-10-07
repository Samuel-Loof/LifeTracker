import { Stack } from "expo-router";
import { FoodProvider } from "./components/FoodContext";
import { HabitProvider } from "./components/HabitContext";

export default function RootLayout() {
  return (
    <FoodProvider>
      <HabitProvider>
        {/*Wrap the stack inside providers */}
        <Stack>
          <Stack.Screen name="index" options={{ title: "Home" }} />
          <Stack.Screen
            name="scanner"
            options={{ title: "Scan Barcode" }}
          />{" "}
          <Stack.Screen
            name="manual"
            options={{ title: "Add Food Manually" }}
          />
          <Stack.Screen
            name="components/screens/FoodDetailsScreen"
            options={{ title: "Food Details" }}
          />
          <Stack.Screen
            name="components/screens/DailyIntakeScreen"
            options={{ title: "Today's Intake" }}
          />
          <Stack.Screen
            name="components/screens/UserProfileScreen"
            options={{ title: "Profile" }}
          />
          <Stack.Screen
            name="components/screens/WaterSettingsScreen"
            options={{ title: "Water Settings" }}
          />
          <Stack.Screen
            name="components/screens/HabitDashboardScreen"
            options={{ title: "Streaks & Fasting" }}
          />
          <Stack.Screen
            name="components/screens/HabitCalendarScreen"
            options={{ title: "My Progress" }}
          />
          <Stack.Screen
            name="components/screens/HabitBenefitsScreen"
            options={{ title: "Benefits Timeline" }}
          />
          <Stack.Screen
            name="components/screens/FastingScreen"
            options={{ title: "Fasting" }}
          />
        </Stack>
      </HabitProvider>
    </FoodProvider>
  );
}
