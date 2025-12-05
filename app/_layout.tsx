import React from "react";
import { Stack } from "expo-router";
import { FoodProvider } from "./components/FoodContext";
import { HabitProvider } from "./components/HabitContext";
import { TouchableOpacity, Text, View, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFood } from "./components/FoodContext";

function SettingsHeaderButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={{ marginRight: 15 }}
      onPress={() => {
        router.push("/components/screens/StreakNotificationSettingsScreen");
      }}
    >
      <Text style={{ fontSize: 20 }}>⚙️</Text>
    </TouchableOpacity>
  );
}

function EditRecipeHeaderButtons() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { recipes, toggleRecipeFavorite, removeRecipe } = useFood();
  const recipeId = params.editId as string;
  const recipe = recipes.find((r) => r.id === recipeId);

  if (!recipe) {
    // Return placeholder to maintain layout
    return <View style={{ width: 60, marginRight: 15 }} />;
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeRecipe(recipeId);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flexDirection: "row", gap: 12, marginRight: 15 }}>
      <TouchableOpacity
        onPress={() => toggleRecipeFavorite(recipe.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={{ fontSize: 24 }}>
          {recipe.isFavorite ? "❤️" : "🤍"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={{ fontSize: 22 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  return (
    <FoodProvider>
      <HabitProvider>
        {/*Wrap the stack inside providers */}
        <Stack>
          <Stack.Screen name="index" options={{ title: "Home" }} />
          <Stack.Screen
            name="scanner"
            options={{ title: "Scan Barcode", headerShown: false }}
          />
          <Stack.Screen
            name="manual"
            options={{ title: "Add Food Manually" }}
          />
          <Stack.Screen
            name="components/screens/AddFoodScreen"
            options={{ headerShown: false }}
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
            options={{ title: "Your Profile" }}
          />
          <Stack.Screen
            name="components/screens/WaterSettingsScreen"
            options={{ title: "Water Settings" }}
          />
          <Stack.Screen
            name="components/screens/HabitDashboardScreen"
            options={{
              title: "Streaks",
              headerRight: () => <SettingsHeaderButton />,
            }}
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
          <Stack.Screen
            name="components/screens/SupplementReminderScreen"
            options={{ title: "Supplement Reminders" }}
          />
          <Stack.Screen
            name="components/screens/StreakNotificationSettingsScreen"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="components/screens/TodoListScreen"
            options={{ title: "To-Do List" }}
          />
          <Stack.Screen
            name="components/screens/AddExerciseScreen"
            options={{ title: "Exercise" }}
          />
          <Stack.Screen
            name="components/screens/WeightGraphScreen"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="components/screens/NutritionInsightsScreen"
            options={{ title: "Nutrition Insights" }}
          />
          <Stack.Screen
            name="components/screens/AICameraScreen"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="components/screens/PersonalDetailsScreen"
            options={{ title: "Personal Details" }}
          />
          <Stack.Screen
            name="components/screens/CaloriesMacrosScreen"
            options={{ title: "Calories & Macros" }}
          />
          <Stack.Screen
            name="components/screens/CreateRecipeScreen"
            options={{ title: "Create Recipe" }}
          />
          <Stack.Screen
            name="components/screens/EditRecipeScreen"
            options={{
              title: "Edit Recipe",
            }}
          />
          <Stack.Screen
            name="components/screens/RecipeDetailsScreen"
            options={{ title: "Recipe Details" }}
          />
          <Stack.Screen
            name="components/screens/RecipeSelectionScreen"
            options={{ title: "Edit Recipe" }}
          />
          <Stack.Screen
            name="components/screens/ActivityLevelScreen"
            options={{ headerShown: false }}
          />
        </Stack>
      </HabitProvider>
    </FoodProvider>
  );
}
