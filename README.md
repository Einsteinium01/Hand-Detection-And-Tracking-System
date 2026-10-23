# 🖐️ Hand Detection & Tracking System

Real-time hand detection and tracking system that processes webcam video and displays results in a web interface. Built with **MediaPipe Task Visions**, **FastAPI**, and **React + TypeScript**.

![Tech Stack](https://img.shields.io/badge/MediaPipe-Tasks_Vision-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## ✨ Features

### Core (MVP)
- ✅ Real-time hand detection using MediaPipe HandLandmarker (Task Vision API)
- ✅ 21-point hand landmark skeleton visualization
- ✅ Bounding boxes with handedness labels (Left/Right) and confidence scores
- ✅ Live webcam feed with detection overlays in the browser
- ✅ Start/Stop controls with connection status indicators
- ✅ Multi-hand support (up to 2 hands simultaneously)
- ✅ Responsive dark-themed UI
- ✅ Real-time FPS and processing time display

### Bonus (Optional)
- 🔲 Gesture recognition (thumbs up, peace sign, etc.)
- 🔲 Hand tracking with unique IDs across frames
- 🔲 Visualization toggle (skeleton / bounding boxes)
- 🔲 Recording capability
- 🔲 Heatmap visualization

## 🏗️ Architecture

```
Browser (React)                    Server (FastAPI)
┌──────────────┐    WebSocket     ┌──────────────┐
│  getUserMedia │ ──── frame ───▶ │  Decode JPEG  │
│  <video>     │                  │  MediaPipe    │
│  <canvas>    │ ◀── JSON ────── │  HandLandmark │
│  Draw overlay│                  │  Detection    │
└──────────────┘                  └──────────────┘
```

- **Frontend** captures webcam, sends frames as base64 JPEG via WebSocket (~15 FPS)
- **Backend** decodes frames, runs MediaPipe detection, returns landmark JSON
- **Frontend** renders landmark overlays on a `<canvas>` on top of the `<video>` element

## 🚀 Setup & Run

### Prerequisites
- **Python 3.10+** (tested with 3.12)
- **Node.js 18+** (tested with 20+)
- **Webcam** (built-in or external)

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Hand-Detection-And-Tracking-System.git
cd Hand-Detection-And-Tracking-System
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Download MediaPipe model (~12 MB)
python download_model.py

# Start the server
python main.py
```
The backend will start on `http://localhost:8000`.

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```
The frontend will start on `http://localhost:5173`.

### 4. Use the App
1. Open `http://localhost:5173` in your browser
2. Click **Start Detection**
3. Allow camera access when prompted
4. Hold your hand(s) in front of the camera
5. See real-time landmarks and bounding boxes!

## 📦 Dependencies

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.0 | Web framework with WebSocket support |
| uvicorn | 0.30.6 | ASGI server |
| mediapipe | 0.10.18 | Hand landmark detection (Task Vision API) |
| opencv-python-headless | 4.10.0 | Image decoding |
| numpy | ≥1.26.0 | Array operations |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.1.0 | UI framework |
| react-dom | 19.1.0 | DOM rendering |
| vite | 6.3.0 | Build tool & dev server |
| typescript | 5.7.0 | Type safety |

## 🤖 AI Tools Used

This project was built with the help of **Google Antigravity (AGY)** — an AI coding assistant:

- **Architecture design**: Used AI to plan the WebSocket-based architecture, choosing between sending processed frames vs. JSON landmarks (chose JSON for efficiency and flexibility)
- **Boilerplate code**: AI generated the FastAPI WebSocket handler, React hooks (`useWebSocket`, `useWebcam`), and canvas drawing utilities
- **MediaPipe integration**: AI provided the correct Task Vision API usage (not the legacy Solutions API), including proper model initialization and detection calls
- **Debugging**: AI helped debug canvas mirroring (matching video `scaleX(-1)` with canvas transforms) and WebSocket reconnection logic
- **Code review**: All AI-generated code was reviewed, validated, and tested for correctness

## 💡 Challenges Faced

1. **Canvas mirroring**: The video feed is mirrored (`scaleX(-1)`) for a natural selfie view, so the canvas overlay must apply matching transforms when drawing landmarks
2. **Frame rate balancing**: Sending every frame at 30fps to the backend would overload the WebSocket — settled on ~15fps for sending with requestAnimationFrame for smooth rendering
3. **MediaPipe API versions**: MediaPipe has multiple APIs (legacy Solutions vs. new Tasks API) — ensured usage of the modern Task Vision API as specified

## 📁 Project Structure

```
├── backend/
│   ├── main.py              # FastAPI app with WebSocket endpoint
│   ├── hand_detector.py     # MediaPipe HandLandmarker wrapper
│   ├── download_model.py    # Model download script
│   ├── requirements.txt     # Python dependencies
│   └── models/              # MediaPipe model files (auto-downloaded)
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main app — state management, detection loop
│   │   ├── components/
│   │   │   ├── WebcamFeed.tsx    # Video + canvas overlay
│   │   │   ├── ControlPanel.tsx  # Start/Stop, toggles, FPS
│   │   │   └── StatusBar.tsx     # Detection status info
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # WebSocket connection + reconnect
│   │   │   └── useWebcam.ts      # getUserMedia management
│   │   ├── utils/
│   │   │   └── drawLandmarks.ts  # Canvas drawing utilities
│   │   └── types/
│   │       └── hand.ts           # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```
