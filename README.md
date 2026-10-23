# 🖐️ Hand Detection & Tracking System

A real-time hand detection, tracking, and gesture recognition system that processes live webcam video and displays interactive overlays in a modern web interface. Built for the **Dheera AI Internship Assessment**.

![Tech Stack](https://img.shields.io/badge/MediaPipe-Tasks_Vision_API-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange) ![License](https://img.shields.io/badge/Status-Complete-brightgreen)

---

## 📋 Table of Contents
- [Features](#-features)
  - [Core Requirements (MVP)](#core-requirements-mvp)
  - [Bonus Features](#bonus-features)
- [Architecture](#-architecture)
- [How to Run the Application (Setup Instructions)](#-how-to-run-the-application-setup-instructions)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Running Automated Tests](#4-running-automated-tests)
- [Dependencies & Requirements](#-dependencies--requirements)
- [Which AI Tools Were Used & How](#-which-ai-tools-were-used--how)
- [Challenges Faced & Solutions](#-challenges-faced--solutions)
- [Project Structure](#-project-structure)

---

## ✨ Features

### Core Requirements (MVP)
- ✅ **Real-Time Hand Detection**: Utilizes MediaPipe HandLandmarker (Task Vision API) to detect hands at ~15–30 FPS.
- ✅ **21-Point Landmark Skeleton**: Precise rendering of all 21 3D joint landmarks and bone interconnects.
- ✅ **Bounding Boxes & Handedness**: Padded bounding rectangles displaying handedness (`Left` / `Right`) and model confidence score.
- ✅ **Live Webcam Stream with Canvas Overlays**: Smooth web browser video playback with high-DPI canvas overlay synchronization.
- ✅ **Start/Stop Controls**: Responsive UI to toggle video capture, WebSocket connection, and detection processing.
- ✅ **Real-Time Metrics**: Live client & server FPS counter, end-to-end processing latency display, and connection status.

### Bonus Features
- ✅ **Gesture Recognition (8 Gestures)**: Accurately classifies 8 distinct gestures using rotation-invariant joint kinematics:
  - 👍 **Thumbs Up**
  - 👎 **Thumbs Down**
  - ✌️ **Peace**
  - 🖐️ **Open Palm**
  - ✊ **Fist**
  - ☝️ **Pointing Up**
  - 🤟 **Rock**
  - 👌 **OK**
- ✅ **Hand Tracking with Persistent IDs**: Assigns and maintains unique IDs across frames (`Hand #1`, `Hand #2`) using predictive centroid tracking, velocity smoothing, and cost-matrix matching.
- ✅ **Occlusion & Dropout Tolerance**: Handles brief dropouts (up to 8 frames / ~0.5s) without losing or swapping hand IDs.
- ✅ **Multi-Hand Support**: Simultaneously tracks and classifies gestures independently for multiple hands.
- ✅ **Session Video Recording & Download**: Built-in recorder that captures the synchronized composite video (mirrored webcam feed + skeleton landmarks + bounding boxes + Hand IDs + gesture pills) and exports it as `.webm` / `.mp4`.
- ✅ **Visualization Toggles**: Instant runtime switches to toggle the skeleton mesh and bounding boxes independently.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Browser (React 19)                   │
│                                                        │
│   Webcam Feed ──▶ Canvas Frame Capture (~15 FPS)       │
│                            │ (Base64 JPEG)             │
│                            ▼                           │
│                     WebSocket Client                   │
└────────────────────────────┬───────────────────────────┘
                             │ ws://localhost:8000/ws/detect
┌────────────────────────────▼───────────────────────────┐
│                   Server (FastAPI)                     │
│                                                        │
│   Base64 Decoder ──▶ MediaPipe Tasks Vision API        │
│                            │ (21 Landmarks + BBox)     │
│                            ▼                           │
│                  HandTracker (Persistent IDs)          │
│                            ▼                           │
│               Gesture Recognizer (8 Gestures)          │
│                            │                           │
│                            ▼                           │
│             JSON Response (Landmarks + ID + Gesture)   │
└────────────────────────────┬───────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────┐
│               Browser Overlay Renderer                 │
│                                                        │
│  Canvas 2D Context:                                    │
│  - Mirrored skeleton connections & landmark nodes      │
│  - Un-mirrored bounding boxes, Hand #IDs & confidence  │
│  - Gesture badge pills & live status updates           │
│  - Composite MediaRecorder (Webcam + Overlays)         │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run the Application (Setup Instructions)

### Prerequisites
- **Python**: 3.10 or newer (tested on Python 3.12)
- **Node.js**: 18.0 or newer (tested on Node.js 20+)
- **npm**: 9.0 or newer
- **Webcam**: Built-in or external USB camera

---

### 1. Clone Repository

```bash
git clone https://github.com/Einsteinium01/Hand-Detection-And-Tracking-System.git
cd Hand-Detection-And-Tracking-System
```

---

### 2. Backend Setup

1. Open a terminal in the project directory and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. (Optional but recommended) Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Download the MediaPipe HandLandmarker task model:
   ```bash
   python download_model.py
   ```
   *(Downloads `hand_landmarker.task` (~7.5 MB) into `backend/models/`)*

5. Start the FastAPI backend server:
   ```bash
   python main.py
   ```
   The backend starts at `http://localhost:8000`. You can verify health at `http://localhost:8000/health`.

---

### 3. Frontend Setup

1. Open a **new terminal** and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend starts at `http://localhost:5173`.

4. Open `http://localhost:5173` in Google Chrome or any modern browser.
5. Click **Start Detection** and allow camera access.

---

### 4. Running Automated Tests

To ensure everything is working correctly, run the test suites:

- **Backend Unit Tests (Tracking & Algorithms)**:
  ```bash
  python -m pytest backend/ -v
  ```
  *(Verifies single-hand tracking, multi-hand persistent IDs, occlusion grace periods, track expiration, and resets)*

- **Frontend Build & Type Check**:
  ```bash
  cd frontend
  npm run build
  ```
  *(Runs `tsc -b` and compiles production assets with Vite)*

---

## 📦 Dependencies & Requirements

### Backend (`requirements.txt`)
| Package | Version | Purpose |
|---|---|---|
| `fastapi` | `^0.115.0` | High-performance asynchronous web framework |
| `uvicorn` | `^0.30.6` | Production ASGI web server with WebSocket support |
| `mediapipe` | `0.10.18` | Google's HandLandmarker Task Vision API |
| `opencv-python-headless`| `^4.10.0` | Server-side image decoding and RGB color matrix conversion |
| `numpy` | `>=1.26.0` | Vector and matrix calculations for landmarks |
| `pytest` | `^9.1.0` | Automated test runner for tracker and recognition algorithms |

### Frontend (`package.json`)
| Package | Version | Purpose |
|---|---|---|
| `react` | `^19.1.0` | Modern React 19 UI component library |
| `react-dom` | `^19.1.0` | React DOM renderer |
| `typescript` | `~5.7.2` | Static type checking and interface contracts |
| `vite` | `^6.2.0` | Fast modern frontend bundler and dev server |

---

## 🤖 Which AI Tools Were Used & How

Throughout this project, **Google Antigravity (AGY)** was leveraged as the primary AI coding assistant:

1. **Architecture & Pipeline Design**:
   - Consulted AI to evaluate design trade-offs between server-side image processing vs. browser-side models vs. WebRTC.
   - Decided on WebSocket JSON landmark streaming (~15 FPS send rate with decoupled 60 FPS requestAnimationFrame rendering) to optimize bandwidth and maintain sub-30ms round-trip latency.
2. **MediaPipe Task Vision Migration**:
   - Used AI to correctly configure the modern **MediaPipe Task Vision API** (`mediapipe.tasks.python.vision.HandLandmarker`), avoiding deprecated legacy `mp.solutions.hands` methods.
3. **Multi-Object Hand Tracking Design**:
   - Generated the mathematical framework for persistent hand tracking ([`hand_tracker.py`](file:///C:/Projects/Hand-Detection-And-Tracking-System/backend/hand_tracker.py)), incorporating exponential moving-average velocity prediction and cost matrix matching.
4. **Diagnostic Scripting & Automated Test Suites**:
   - Created isolated diagnostic scripts and unit tests ([`test_hand_tracker.py`](file:///C:/Projects/Hand-Detection-And-Tracking-System/backend/test_hand_tracker.py)) to simulate hand occlusions, motion transitions, and gesture edge cases.
5. **Code Review & Validation**:
   - Every AI-suggested implementation was manually reviewed, verified with automated test suites (`pytest`, `tsc`), and tested against real-world webcam video feeds.

---

## 💡 Challenges Faced & Solutions

### 1. Canvas Mirroring vs. Text Inversion
- **Issue**: The webcam feed was mirrored (`transform: scaleX(-1)`) so the user feels like they are looking in a mirror. However, when drawing labels (handedness, confidence score, Hand ID, gesture text), the canvas mirror caused text to appear backwards.
- **Solution**: Implemented localized inverse coordinate transformations in [`drawLandmarks.ts`](file:///C:/Projects/Hand-Detection-And-Tracking-System/frontend/src/utils/drawLandmarks.ts#L182-L191). Before drawing any text, the canvas translates to the text center, applies `ctx.scale(-1, 1)`, renders the text, and restores context.

### 2. Rotation-Invariant Gesture Recognition
- **Issue**: Standard gesture recognition checks compare y-coordinates (e.g. `tip.y < pip.y`), which fail whenever the hand is tilted, rotated sideways, or upside-down (such as differentiating a thumbs up from a thumbs down).
- **Solution**: Refactored [`gesture_recognizer.py`](file:///C:/Projects/Hand-Detection-And-Tracking-System/backend/gesture_recognizer.py) to use **joint-angle kinematics**. Calculated bone segment angles at the PIP and DIP joints using the cosine dot product, making finger flexion rotation-invariant. For thumb direction, computed the projection of the thumb vector onto the perpendicular hand coordinate axis.

### 3. MediaPipe Memory Contiguity (`TypeError`)
- **Issue**: Decoding BGR frames and flipping color channels via numpy slicing (`frame[:, :, ::-1]`) produced non-contiguous memory arrays, causing MediaPipe's underlying C++ bindings to throw a runtime error.
- **Solution**: Swapped array slicing with `cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)`, ensuring a contiguous memory layout for `mp.Image`.

### 4. Synchronized Session Video Recording
- **Issue**: Canvas `captureStream()` on the overlay canvas only recorded transparent skeleton lines on a black background, while recording the `<video>` element omitted all detection overlays.
- **Solution**: Engineered [`useVideoRecorder.ts`](file:///C:/Projects/Hand-Detection-And-Tracking-System/frontend/src/hooks/useVideoRecorder.ts) with an offscreen composite renderer. During recording, each frame renders the mirrored webcam feed followed by synchronized skeleton meshes, bounding boxes, Hand IDs, and gesture pills, directly piping the composite stream into a browser `MediaRecorder`.

### 5. Persistent Hand IDs with Occlusion Recovery
- **Issue**: MediaPipe's `IMAGE` mode has no state memory across frames. If a user quickly moved their hand or had momentary motion blur, hand IDs would flicker or reset.
- **Solution**: Developed a tracker with an 8-frame grace period (~0.5s). When a detection drops out, the track remains active in memory. When the hand reappears nearby, the tracker seamlessly rebinds the existing ID.

---

## 📁 Project Structure

```
Hand-Detection-And-Tracking-System/
├── backend/
│   ├── main.py                  # FastAPI server & WebSocket (/ws/detect)
│   ├── hand_detector.py         # MediaPipe Task Vision API wrapper
│   ├── hand_tracker.py          # Persistent multi-hand tracker & ID manager
│   ├── gesture_recognizer.py    # 8-gesture rotation-invariant recognizer
│   ├── test_hand_tracker.py     # Unit test suite for hand tracking
│   ├── download_model.py        # Model download utility
│   ├── requirements.txt         # Backend Python dependencies
│   └── models/                  # HandLandmarker .task model storage
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Root React component & pipeline coordinator
│   │   ├── App.css              # Dark-mode styling, grid layout & animations
│   │   ├── components/
│   │   │   ├── WebcamFeed.tsx   # Video display & canvas overlay renderer
│   │   │   ├── ControlPanel.tsx # Control triggers, FPS & recorder controls
│   │   │   └── StatusBar.tsx    # Live tracking info & gesture summary bar
│   │   ├── hooks/
│   │   │   ├── useWebcam.ts     # Camera lifecycle & captureFrame helper
│   │   │   ├── useWebSocket.ts  # Auto-reconnecting WebSocket client
│   │   │   └── useVideoRecorder.ts # Composite video recorder (.webm/.mp4)
│   │   ├── utils/
│   │   │   └── drawLandmarks.ts # Canvas skeleton & bounding box drawing
│   │   └── types/
│   │       └── hand.ts          # TypeScript interfaces & types
│   ├── package.json             # Frontend dependencies & scripts
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite bundler configuration
├── assignment.pdf               # Dheera AI assessment brief
├── .gitignore                   # Git ignore patterns
└── README.md                    # Comprehensive documentation
```
