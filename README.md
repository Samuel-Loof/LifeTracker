LifeTracker

A mobile application for tracking nutrition, fasting, habits, and health metrics, built with React Native, Expo, and TypeScript.
The project focuses on structured state management, local data persistence, and modular feature design.

<p align="center"> <img src="https://github.com/user-attachments/assets/eb9e6aa5-6506-48e3-9c3d-7912eee5d9d9" width="350" /> <img src="https://github.com/user-attachments/assets/83a580d0-01ba-483d-97ba-643dac5bb6fe" width="350" /> </p> <p align="center"> <img src="https://github.com/user-attachments/assets/62e4cdce-bc20-4426-985f-4e0f6015b6a7" width="350" /> <img src="https://github.com/user-attachments/assets/1cdddff7-6bdd-4b12-864e-4f2ef6a9ceb9" width="350" /> </p>
Features
Nutrition Tracking

Barcode scanning using Expo Camera

Nutrition data retrieval via OpenFoodFacts API

Manual food and meal entry

Daily calorie and macronutrient tracking

Recipe creation with ingredient-based nutrition calculation

Historical intake analytics

Fasting

Real-time fasting timer

Support for multiple fasting protocols

Fasting history and duration statistics

Habit Tracking

Daily habit tracking with streak logic

Calendar-based progress visualization

Configurable reminders using push notifications

Water Intake

Daily water consumption tracking

Goal-based progress visualization

Health Metrics

Weight tracking with chart visualization

Activity level configuration

Exercise logging

User profile management

Notifications

Habit reminders

Streak alerts

Supplement reminders

Technical Stack

React Native (0.81.4) – Cross-platform mobile development

Expo (^54.0.13) – Tooling and build system

TypeScript (~5.8.3) – Static typing and improved maintainability

Expo Router (~6.0.21) – File-based, type-safe navigation

React Context API – Global state management

AsyncStorage – Local-first data persistence

Expo Camera – Barcode scanning

Expo Notifications – Push notification handling

OpenFoodFacts API – External food database integration

Architectural Notes

Local-first design: All user data is persisted locally via AsyncStorage.

Context-based state management: Feature-specific contexts (Food, Habits) isolate logic and reduce coupling.

Modular screen structure: Screens and feature logic are separated to improve maintainability.

Type safety: Strict TypeScript configuration enforced across the codebase.

Project Structure

(din struktur är redan bra – den kan stå kvar som den är)

Build & Deployment

Production builds are handled via Expo Application Services (EAS) with separate profiles for development, preview, and production environments.

License

Private project. Not licensed for public use.
