// In app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="scanner" options={{ title: "Scan Barcode" }} />
      <Stack.Screen name="manual" options={{ title: "Add Food Manually" }} />
      <Stack.Screen
        name="components/screens/FoodDetailsScreen"
        options={{ title: "Food Details" }}
      />
      <Stack.Screen
        name="components/screens/DailyIntakeScreen"
        options={{ title: "Today's Intake" }}
      />
    </Stack>
  );
}
