<div align="center">

# 🏙️ NagarSeva

### AI-Powered Smart Civic Issue Reporting Platform

Empowering citizens to report civic issues intelligently using **Google Gemini AI**, enabling authorities to prioritize, analyze, and resolve complaints efficiently.

![Google AI](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=for-the-badge&logo=google)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 📖 Overview

**NagarSeva** is an AI-powered civic issue reporting platform that enables citizens to quickly report public infrastructure problems such as:

| Issue Type | Description |
|---|---|
| 🛣️ Potholes | Road damage and surface hazards |
| 💧 Water Leakage | Pipeline and supply issues |
| 🗑️ Garbage Dumps | Waste management concerns |
| 💡 Broken Streetlights | Public lighting failures |
| 🚧 Road Damage | Infrastructure deterioration |
| 🌧️ Drainage Blockages | Stormwater and sewage issues |
| 🌳 Fallen Trees | Obstruction and safety hazards |
| ⚡ Electrical Hazards | Public safety risks |

Unlike traditional complaint portals, NagarSeva leverages **Google Gemini AI** to intelligently analyze uploaded images and descriptions — classifying issues, estimating severity, recommending actions, detecting duplicate reports, and helping authorities prioritize complaints with real precision.

---

## 🎯 Problem Statement

Municipal authorities receive thousands of civic complaints every day. Current systems suffer from:

- ❌ Manual complaint processing
- ❌ Duplicate reports flooding the system
- ❌ Poor prioritization of critical issues
- ❌ Slow response and resolution times
- ❌ Lack of intelligent analysis
- ❌ Minimal citizen engagement

**NagarSeva solves this** using Google's Generative AI to automate issue understanding, streamline routing, and improve municipal decision-making at scale.

---

## ✨ Key Features

### 🤖 AI-Powered Issue Analysis
- Image analysis using Gemini Vision
- Natural language understanding of descriptions
- Automatic issue classification & categorization
- Severity detection and priority estimation
- Automated department assignment
- AI-generated summaries and suggested resolutions
- Estimated repair cost projection

### 📍 Smart Issue Reporting
- Photo/video-based reporting
- Detailed description input
- Interactive live map with GPS auto-detection
- Real-time status tracking

### 🔍 Duplicate Detection
Automatically detects similar reports within a set radius to prevent redundant complaints and consolidate citizen voices on the same issue.

### 🏆 Community Engagement
- Public leaderboard & civic score
- Community upvoting/verification
- User reputation and badges
- Comment threads on issues
- Gamified civic participation

### 📊 Analytics Dashboard
- Live platform-wide statistics
- Category-wise issue breakdown
- Department-level insights
- Resolution time tracking
- AI-generated trend analytics

### 🛡️ Officer Dashboard
Municipal authorities can:
- View and filter incoming reports
- Prioritize complaints by AI-assigned severity
- Update resolution status in real time
- Monitor progress across departments
- Analyze recurring issue trends

---

## 🧠 AI Capabilities

Google Gemini powers the core intelligence layer:

- Image understanding & visual damage assessment
- Natural language processing of user reports
- Civic issue classification
- Severity prediction & priority scoring
- Duplicate detection via semantic similarity
- Structured JSON output for downstream automation
- Department routing recommendations

---

## 🏗️ System Architecture

```
Citizen
   │
   ▼
React + TypeScript Frontend
   │
   ▼
Application APIs (Node.js / Express)
   │
   ▼
Google Gemini AI (Analysis Engine)
   │
   ▼
Firebase Firestore / Storage
   │
   ▼
Officer Dashboard
```

---

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- TypeScript
- CSS

**Backend**
- Node.js
- Express.js

**Artificial Intelligence**
- Google Gemini API

**Database**
- Firebase Firestore

**Storage**
- Firebase Storage

**Deployment**
- Google AI Studio
- Google Cloud Run

---

## ☁️ Google Technologies Used

- **Google Gemini API** — Core AI engine for image/text analysis and classification
- **Google AI Studio** — Prototyping and deployment environment
- **Google Cloud Run** — Scalable, serverless application hosting
- **Firebase** — Backend-as-a-service platform
- **Firestore** — Real-time NoSQL database
- **Firebase Storage** — Media storage for issue evidence

---

## 📂 Project Structure

```
src/
 ├── components/
 ├── pages/
 ├── services/
 ├── utils/
 ├── assets/
 └── App.tsx

server/
uploads/
data/
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm
- Google Gemini API Key

### Installation

Clone the repository:
```bash
git clone https://github.com/yourusername/nagarseva.git
```

Navigate to the project directory:
```bash
cd nagarseva
```

Install dependencies:
```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### Run Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

---

## 🎯 Future Scope

- 🎙️ Voice-based issue reporting
- 🌐 Multilingual support
- 🏛️ Government API integration for direct ticket routing
- 📡 IoT sensor integration for automated detection
- 🔮 Predictive infrastructure maintenance
- 📱 Native mobile application
- 🔔 Push notifications for status updates
- 🤖 AI-assisted resolution planning for officers

---

## 🌍 Expected Impact

**For Citizens**
- Faster complaint registration
- Greater transparency into resolution status
- Improved civic engagement and ownership

**For Government**
- Automated prioritization reduces manual workload
- Data-driven resource allocation
- Faster response to critical infrastructure issues

**For Smart Cities**
- Cleaner, better-maintained public spaces
- Faster issue resolution cycles
- Long-term data-driven governance

---

## 📄 License

This project is developed for educational and hackathon purposes under the MIT License.

---

<div align="center">

### 🚀 Building Smarter Cities with Google Gemini AI

**NagarSeva — Intelligent Civic Issue Reporting Platform**

</div>
