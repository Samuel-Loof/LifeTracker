// In app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="scanner" options={{ title: "Scan Barcode" }} />
      <Stack.Screen name="manual" options={{ title: "Add Food Manually" }} />
    </Stack>
  );
}
