# LifeTrack3r

A comprehensive health and nutrition tracking mobile application built with React Native and Expo. Track your daily nutrition, monitor fasting periods, manage habits, and gain insights into your health journey.

## Features

### 🍎 Nutrition Tracking
- **Barcode Scanner**: Scan product barcodes to automatically retrieve nutrition information from OpenFoodFacts API
- **Manual Food Entry**: Add custom foods and meals with detailed nutrition data
- **Daily Intake Tracking**: Monitor calories, macros (protein, carbs, fats), and micronutrients
- **Recipe Management**: Create, edit, and save custom recipes with ingredient tracking
- **Nutrition Insights**: View detailed analytics and trends of your eating habits

### ⏱️ Fasting Tracker
- Real-time fasting timer with multiple fasting protocols
- Visual progress indicators
- Fasting history and statistics

### 🎯 Habit Tracking
- Streak tracking for daily habits
- Calendar view of habit progress
- Customizable habit benefits timeline
- Push notifications for habit reminders

### 💧 Water Intake
- Daily water consumption tracking
- Customizable water goals
- Visual progress indicators

### 📊 Health Metrics
- Weight tracking with graph visualization
- Activity level monitoring
- Exercise logging
- Personal profile management

### 🔔 Notifications
- Push notifications for habit reminders
- Streak maintenance alerts
- Supplement reminders

## Technologies Used

- **React Native** (0.81.4) - Cross-platform mobile development
- **Expo** (^54.0.13) - Development platform and tooling
- **TypeScript** (~5.8.3) - Type-safe development
- **Expo Router** (~6.0.21) - File-based routing system
- **React Context API** - Global state management
- **AsyncStorage** - Local data persistence
- **Expo Camera** - Barcode scanning functionality
- **Expo Notifications** - Push notification system
- **React Navigation** - Screen navigation
- **OpenFoodFacts API** - Food database integration

## Prerequisites

- Node.js (>= 16.17.4)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- For physical device testing: Expo Go app or development build

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd LifeTrack3r
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## Project Structure

```
LifeTrack3r/
├── app/
│   ├── _layout.tsx              # Root layout with navigation
│   ├── index.tsx                 # Home screen
│   ├── scanner.tsx               # Barcode scanner screen
│   ├── manual.tsx                # Manual food entry
│   └── components/
│       ├── BarcodeScanner.tsx    # Barcode scanning component
│       ├── FoodContext.tsx       # Food data state management
│       ├── HabitContext.tsx      # Habit tracking state management
│       ├── FoodDataService.ts    # OpenFoodFacts API integration
│       └── screens/              # All app screens
│           ├── HomeScreen.tsx
│           ├── AddFoodScreen.tsx
│           ├── DailyIntakeScreen.tsx
│           ├── FastingScreen.tsx
│           ├── HabitDashboardScreen.tsx
│           └── ... (other screens)
├── assets/                       # Images and icons
├── Data/
│   └── mockFoodData.ts          # Mock data for development
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
└── package.json                  # Dependencies
```

## Building for Production

### Using EAS Build

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to your Expo account:
```bash
eas login
```

3. Configure your project:
```bash
eas build:configure
```

4. Build for production:
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### Build Profiles

- **Development**: Development client with hot reload
- **Preview**: Internal distribution builds
- **Production**: App Store and Play Store ready builds

## Configuration

### App Configuration

Edit `app.json` to customize:
- App name and slug
- Bundle identifiers
- Permissions
- Icons and splash screens

### API Integration

The app uses OpenFoodFacts API for barcode scanning. No API key required, but ensure proper User-Agent header is set (configured in `FoodDataService.ts`).

## Features in Detail

### State Management

The app uses React Context API for state management:
- **FoodContext**: Manages food items, recipes, and daily intake
- **HabitContext**: Manages habits, streaks, and progress

### Data Persistence

All data is stored locally using AsyncStorage:
- Food entries and history
- Recipes
- Habit progress
- User profile and settings

### Navigation

File-based routing with Expo Router:
- Automatic route generation from file structure
- Type-safe navigation
- Deep linking support

## Development

### Running on Different Platforms

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### TypeScript

The project uses strict TypeScript mode. Ensure all components and functions are properly typed.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and not licensed for public use.

## Acknowledgments

- OpenFoodFacts for providing the food database API
- Expo team for the excellent development platform
- React Native community for the amazing ecosystem

## Support

For issues and questions, please open an issue in the repository.

---

Built with ❤️ using React Native and Expo

