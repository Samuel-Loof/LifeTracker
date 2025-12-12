import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFood, FoodItem } from "../FoodContext";
import * as FileSystem from "expo-file-system";
import BarcodeScanner from "../BarcodeScanner";
import { getFoodData, FoodData } from "../FoodDataService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// AI SCANNER FUNCTIONALITY COMMENTED OUT - Requires paid OpenAI API
// IMPORTANT: You'll need to add your OpenAI API key here
// For production, store this in environment variables or use Expo Constants
// Get your API key from: https://platform.openai.com/api-keys
// 
// Option 1: Replace directly (not recommended for production)
// const OPENAI_API_KEY = "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"; 

// Option 2: Use environment variables (recommended)
// import Constants from 'expo-constants';
// const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || "";
const OPENAI_API_KEY: string = ""; // Disabled - AI scanner requires paid API

interface AIVisionResponse {
  foodName: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
  servingSize?: string;
  confidence?: number;
}

// AI scanner mode disabled - only barcode mode available
type ScannerMode = "barcode"; // | "ai"; // AI mode commented out

export default function AICameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addFood } = useFood();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [aiResult, setAiResult] = useState<AIVisionResponse | null>(null);
  const [manualAdjustments, setManualAdjustments] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const mealParam = Array.isArray(params.meal) ? params.meal[0] : (params.meal as string);
  const modeParam = params.mode;
  const [mealType, setMealType] = useState<string>(mealParam || "breakfast");
  const [scannerMode, setScannerMode] = useState<ScannerMode>("barcode"); // Only barcode mode available
  const [resetKey, setResetKey] = useState(0);

  const cameraRef = useRef<CameraView>(null);

  // Load saved scanner mode preference - AI mode disabled
  useEffect(() => {
    const loadScannerMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("scannerMode");
        // Only allow barcode mode - AI mode is disabled
        if (savedMode === "barcode") {
          setScannerMode(savedMode);
        }
        // Force barcode mode if AI was previously selected
        if (savedMode === "ai") {
          await AsyncStorage.setItem("scannerMode", "barcode");
        }
      } catch (error) {
        console.error("Error loading scanner mode:", error);
      }
    };
    loadScannerMode();
  }, []);

  // Save scanner mode preference when it changes
  const handleModeChange = async (mode: ScannerMode) => {
    setScannerMode(mode);
    try {
      await AsyncStorage.setItem("scannerMode", mode);
    } catch (error) {
      console.error("Error saving scanner mode:", error);
    }
  };

  // Handle barcode scanning
  const handleFoodScanned = async (barcode: string) => {
    console.log("Processing barcode:", barcode);

    try {
      const foodData: FoodData | null = await getFoodData(barcode);

      if (foodData) {
        const categoriesParam = foodData.categories
          ? foodData.categories.join(",")
          : "";

        router.push({
          pathname: "/components/screens/FoodDetailsScreen",
          params: {
            name: foodData.name,
            brand: foodData.brand,
            calories: foodData.calories.toString(),
            protein: foodData.protein.toString(),
            carbs: foodData.carbs.toString(),
            fat: foodData.fat.toString(),
            barcode: foodData.barcode,
            servingSize: foodData.servingSize || "100g",
            meal: mealParam || "breakfast",
            fromScanner: "true",
            targetMeal: mealParam || "breakfast",
            fromAddFood: "true",
            mode: modeParam || undefined,
            fiber: (foodData.fiber || 0).toString(),
            sugars: (foodData.sugars || 0).toString(),
            saturatedFat: (foodData.saturatedFat || 0).toString(),
            unsaturatedFat: (foodData.unsaturatedFat || 0).toString(),
            cholesterol: (foodData.cholesterol || 0).toString(),
            sodium: (foodData.sodium || 0).toString(),
            potassium: (foodData.potassium || 0).toString(),
            category: foodData.category || "",
            categories: categoriesParam,
          },
        });
      } else {
        Alert.alert(
          "Product not found",
          "This product isn't in our database yet. Would you like to add it manually?",
          [
            {
              text: "No",
              style: "cancel",
              onPress: () => {
                setResetKey((k) => k + 1);
              },
            },
            {
              text: "Yes",
              onPress: () => {
                router.push("/components/screens/ManualFoodEntry");
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error processing barcode:", error);
    }
  };

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  // AI IMAGE ANALYSIS FUNCTION - COMMENTED OUT (requires paid OpenAI API)
  /* eslint-disable */
  const analyzeImageWithAI = async (imageUri: string): Promise<AIVisionResponse | null> => {
    try {
      // Check if API key is configured
      if (!OPENAI_API_KEY || OPENAI_API_KEY === "" || (typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.includes("YOUR_OPENAI_API_KEY"))) {
        throw new Error("API_KEY_NOT_CONFIGURED");
      }

      // Convert image to base64 using FileSystem
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call OpenAI Vision API
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Analyze this food image and provide nutritional information. Return ONLY a JSON object with this exact structure:
{
  "foodName": "name of the food",
  "estimatedCalories": number,
  "estimatedProtein": number (in grams),
  "estimatedCarbs": number (in grams),
  "estimatedFat": number (in grams),
  "servingSize": "description of serving size",
  "confidence": number (0-100)
}
Be realistic with estimates. If you can't identify the food clearly, set confidence below 50.`,
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 300,
          }),
        }
      );

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `API error: ${openaiResponse.status}`;
        
        if (openaiResponse.status === 401) {
          throw new Error("API_KEY_INVALID");
        } else if (openaiResponse.status === 429) {
          throw new Error("API_RATE_LIMIT");
        } else {
          throw new Error(`API_ERROR: ${errorMessage}`);
        }
      }

      const data = await openaiResponse.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from AI");
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response");
      }

      const result = JSON.parse(jsonMatch[0]);
      return result;
    } catch (error: any) {
      console.error("Error analyzing image:", error);
      // Return error details for better user feedback
      throw error;
    }
  };
  /* eslint-enable */

  // AI CAMERA PICTURE FUNCTION - COMMENTED OUT (requires paid OpenAI API)
  /* eslint-disable */
  const takePicture = async () => {
    Alert.alert("AI Scanner Disabled", "The AI scanner feature has been disabled as it requires a paid OpenAI API key. Please use the barcode scanner instead.");
    return;
    /*
    if (!cameraRef.current) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        try {
          const result = await analyzeImageWithAI(photo.uri);
          if (result) {
            setAiResult(result);
            setManualAdjustments({
              calories: result.estimatedCalories.toString(),
              protein: result.estimatedProtein.toString(),
              carbs: result.estimatedCarbs.toString(),
              fat: result.estimatedFat.toString(),
            });
            setShowResult(true);
          }
        } catch (error: any) {
          console.error("Error analyzing image:", error);
          let errorMessage = "Could not analyze the image. Please try again or add food manually.";
          
          if (error.message === "API_KEY_NOT_CONFIGURED") {
            errorMessage = "OpenAI API key is not configured. Please set your API key in AICameraScreen.tsx to use the AI scanner feature.";
          } else if (error.message === "API_KEY_INVALID") {
            errorMessage = "Invalid OpenAI API key. Please check your API key configuration.";
          } else if (error.message === "API_RATE_LIMIT") {
            errorMessage = "API rate limit exceeded. Please try again in a moment.";
          } else if (error.message?.includes("API_ERROR")) {
            errorMessage = `API Error: ${error.message.replace("API_ERROR: ", "")}`;
          }
          
          Alert.alert("Error", errorMessage);
        }
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
    */
  };
  /* eslint-enable */

  const pickImage = async () => {
    // Use CameraView's built-in image picker or implement with expo-image-picker
    // For now, we'll show an alert to use the camera instead
    Alert.alert(
      "Image Picker",
      "Please use the camera to take a photo. Gallery selection coming soon!",
      [{ text: "OK" }]
    );
    return;
  };

  const handleSaveFood = () => {
    if (!aiResult) return;

    const calories = parseFloat(manualAdjustments.calories) || 0;
    const protein = parseFloat(manualAdjustments.protein) || 0;
    const carbs = parseFloat(manualAdjustments.carbs) || 0;
    const fat = parseFloat(manualAdjustments.fat) || 0;

    if (calories <= 0) {
      Alert.alert("Error", "Please enter valid calories");
      return;
    }

    const foodItem: FoodItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: aiResult.foodName,
      brand: "AI Detected",
      amount: 1,
      unit: aiResult.servingSize || "serving",
      nutrition: {
        calories,
        protein,
        carbs,
        fat,
        fiber: 0,
        sugars: 0,
        saturatedFat: 0,
        unsaturatedFat: 0,
        cholesterol: 0,
        sodium: 0,
        potassium: 0,
      },
      timestamp: new Date(),
      mealType,
      isFavorite: false,
    };

    addFood(foodItem);
    Alert.alert("Success", "Food added successfully!", [
      {
        text: "OK",
        onPress: () => {
          setShowResult(false);
          router.back();
        },
      },
    ]);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to use the camera
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render mode switcher component - AI mode disabled
  const renderModeSwitcher = () => (
    <View style={styles.modeSwitcher}>
      <TouchableOpacity
        style={[
          styles.modeButton,
          scannerMode === "barcode" && styles.modeButtonActive,
        ]}
            onPress={() => handleModeChange("barcode")}
      >
        <Text
          style={[
            styles.modeButtonText,
            scannerMode === "barcode" && styles.modeButtonTextActive,
          ]}
        >
          📊 Barcode
        </Text>
      </TouchableOpacity>
      {/* AI Scanner button disabled - requires paid OpenAI API */}
      {/* <TouchableOpacity
        style={[
          styles.modeButton,
          scannerMode === "ai" && styles.modeButtonActive,
        ]}
            onPress={() => handleModeChange("ai")}
      >
        <Text
          style={[
            styles.modeButtonText,
            scannerMode === "ai" && styles.modeButtonTextActive,
          ]}
        >
          🤖 AI Scanner
        </Text>
      </TouchableOpacity> */}
    </View>
  );

  // Only barcode mode available - AI mode disabled
  // Always return barcode scanner (AI mode is disabled)
  return (
    <View style={styles.container}>
      {renderModeSwitcher()}
      <Text style={styles.title}>Scan Food Barcode</Text>
      <BarcodeScanner onFoodScanned={handleFoodScanned} resetKey={resetKey} />
    </View>
  );

  /* AI MODE CODE COMMENTED OUT - Requires paid OpenAI API
  // The following code is disabled as it requires a paid OpenAI API key
  
  if (scannerMode === "ai") {
    return (
      <View style={styles.container}>
        {renderModeSwitcher()}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => router.back()}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>AI Food Scanner</Text>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() =>
                  setFacing(facing === "back" ? "front" : "back")
                }
              >
                <Text style={styles.flipButtonText}>🔄</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={pickImage}
              >
                <Text style={styles.galleryButtonText}>📷 Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  isProcessing && styles.captureButtonDisabled,
                ]}
                onPress={takePicture}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </TouchableOpacity>

              <View style={{ width: 100 }} />
            </View>
          </View>
        </CameraView>

        <Modal
          visible={showResult}
          transparent
          animationType="slide"
          onRequestClose={() => setShowResult(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>AI Analysis Result</Text>
                <TouchableOpacity
                  onPress={() => setShowResult(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {aiResult && (
                  <>
                    <View style={styles.resultSection}>
                      <Text style={styles.resultLabel}>Food Name</Text>
                      <Text style={styles.resultValue}>{aiResult.foodName}</Text>
                      {aiResult.confidence && (
                        <Text style={styles.confidenceText}>
                          Confidence: {aiResult.confidence}%
                        </Text>
                      )}
                    </View>

                    <View style={styles.resultSection}>
                      <Text style={styles.resultLabel}>Serving Size</Text>
                      <Text style={styles.resultValue}>
                        {aiResult.servingSize || "1 serving"}
                      </Text>
                    </View>

                    <View style={styles.resultSection}>
                      <Text style={styles.resultLabel}>Nutrition (adjustable)</Text>
                      <View style={styles.nutritionInputs}>
                        <View style={styles.inputRow}>
                          <Text style={styles.inputLabel}>Calories</Text>
                          <TextInput
                            style={styles.input}
                            value={manualAdjustments.calories}
                            onChangeText={(text) =>
                              setManualAdjustments({
                                ...manualAdjustments,
                                calories: text,
                              })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.inputRow}>
                          <Text style={styles.inputLabel}>Protein (g)</Text>
                          <TextInput
                            style={styles.input}
                            value={manualAdjustments.protein}
                            onChangeText={(text) =>
                              setManualAdjustments({
                                ...manualAdjustments,
                                protein: text,
                              })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.inputRow}>
                          <Text style={styles.inputLabel}>Carbs (g)</Text>
                          <TextInput
                            style={styles.input}
                            value={manualAdjustments.carbs}
                            onChangeText={(text) =>
                              setManualAdjustments({
                                ...manualAdjustments,
                                carbs: text,
                              })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.inputRow}>
                          <Text style={styles.inputLabel}>Fat (g)</Text>
                          <TextInput
                            style={styles.input}
                            value={manualAdjustments.fat}
                            onChangeText={(text) =>
                              setManualAdjustments({
                                ...manualAdjustments,
                                fat: text,
                              })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.resultSection}>
                      <Text style={styles.resultLabel}>Meal Type</Text>
                      <View style={styles.mealTypeButtons}>
                        {["breakfast", "lunch", "dinner", "snack"].map(
                          (type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.mealTypeButton,
                                mealType === type && styles.mealTypeButtonActive,
                              ]}
                              onPress={() => setMealType(type)}
                            >
                              <Text
                                style={[
                                  styles.mealTypeButtonText,
                                  mealType === type &&
                                    styles.mealTypeButtonTextActive,
                                ]}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveFood}
                >
                  <Text style={styles.saveButtonText}>Add to Diary</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
  */
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  modeSwitcher: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    paddingTop: 50,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7f8c8d",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    margin: 20,
    color: "#2c3e50",
    backgroundColor: "#fff",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  flipButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  flipButtonText: {
    color: "white",
    fontSize: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  galleryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
  },
  galleryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4CAF50",
  },
  message: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 24,
    color: "#666",
  },
  modalScroll: {
    padding: 20,
  },
  resultSection: {
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
  },
  confidenceText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  nutritionInputs: {
    gap: 12,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "right",
  },
  mealTypeButtons: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  mealTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mealTypeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: "#666",
  },
  mealTypeButtonTextActive: {
    color: "white",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

