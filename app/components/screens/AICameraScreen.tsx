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
import { useRouter } from "expo-router";
import { useFood, FoodItem } from "../FoodContext";
import * as FileSystem from "expo-file-system";

// IMPORTANT: You'll need to add your OpenAI API key here
// For production, store this in environment variables or use Expo Constants
// Get your API key from: https://platform.openai.com/api-keys
// 
// Option 1: Replace directly (not recommended for production)
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"; // Replace with your API key

// Option 2: Use environment variables (recommended)
// import Constants from 'expo-constants';
// const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey || "";

interface AIVisionResponse {
  foodName: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
  servingSize?: string;
  confidence?: number;
}

export default function AICameraScreen() {
  const router = useRouter();
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
  const [mealType, setMealType] = useState<string>("breakfast");

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const analyzeImageWithAI = async (imageUri: string): Promise<AIVisionResponse | null> => {
    try {
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
        throw new Error(`API error: ${openaiResponse.status}`);
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
    } catch (error) {
      console.error("Error analyzing image:", error);
      return null;
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
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
        } else {
          Alert.alert(
            "Error",
            "Could not analyze the image. Please try again or add food manually."
          );
        }
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const pickImage = async () => {
    // Use CameraView's built-in image picker or implement with expo-image-picker
    // For now, we'll show an alert to use the camera instead
    Alert.alert(
      "Image Picker",
      "Please use the camera to take a photo. Gallery selection coming soon!",
      [{ text: "OK" }]
    );
    return;

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      try {
        const analysisResult = await analyzeImageWithAI(result.assets[0].uri);
        if (analysisResult) {
          setAiResult(analysisResult);
          setManualAdjustments({
            calories: analysisResult.estimatedCalories.toString(),
            protein: analysisResult.estimatedProtein.toString(),
            carbs: analysisResult.estimatedCarbs.toString(),
            fat: analysisResult.estimatedFat.toString(),
          });
          setShowResult(true);
        } else {
          Alert.alert(
            "Error",
            "Could not analyze the image. Please try again."
          );
        }
      } catch (error) {
        console.error("Error analyzing image:", error);
        Alert.alert("Error", "Failed to analyze image.");
      } finally {
        setIsProcessing(false);
      }
    }
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

  return (
    <View style={styles.container}>
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

      {/* Result Modal */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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

