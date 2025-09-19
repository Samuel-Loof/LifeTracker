import { Stack } from "expo-router";
import { FoodProvider } from "./components/FoodContext";

export default function RootLayout() {
  return (
    <FoodProvider>
      {/*Wrap the stack inside foodProvider */}
      <Stack>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="scanner" options={{ title: "Scan Barcode" }} />{" "}
        <Stack.Screen name="manual" options={{ title: "Add Food Manually" }} />
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
          name="components/screens/FastingScreen"
          options={{ title: "Fasting" }}
        />
      </Stack>
    </FoodProvider>
  );
}
