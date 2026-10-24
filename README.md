<div align="center">

# 🖐️ Hand Detection & Tracking System

A real-time hand detection, tracking, and gesture recognition system that processes live webcam video and displays interactive overlays in a modern web interface. Built for the **Dheera AI Internship Assessment**.

<p align="center">
  <img src="https://img.shields.io/badge/MediaPipe-Tasks_Vision_API-blue" alt="MediaPipe" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-green" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19-blue" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/WebSocket-Real--time-orange" alt="WebSocket" />
  <img src="https://img.shields.io/badge/Status-Complete-brightgreen" alt="Status" />
</p>

</div>

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
  - ☝️ **Pointing Up**
  - 🤟 **Rock**
  - 👌 **OK**
- ✅ **Hand Tracking with Persistent IDs**: Assigns and maintains unique IDs across frames (`Hand #1`, `Hand #2`) using predictive centroid tracking, velocity smoothing, and cost-matrix matching.
- ✅ **Multi-Hand Support**: Simultaneously tracks and classifies gestures independently for multiple hands.
- ✅ **Session Video Recording & Download**: Built-in recorder that captures the synchronized composite video (mirrored webcam feed + skeleton landmarks + bounding boxes + Hand IDs + gesture pills) and exports it as `.webm`.
- ✅ **Visualization Toggles**: Instant runtime switches to toggle the skeleton mesh and bounding boxes independently.

---

## 🚀 How to Run the Application

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

## 🤖 AI Tools

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

### 1. Rotation-Invariant Gesture Recognition
- **Challenge**: Naive coordinate checks (e.g. `tip.y < pip.y`) failed whenever the hand was tilted, held sideways, or inverted (such as confusing Thumbs Down with Thumbs Up, or failing to recognize a Peace sign at an angle).
- **Solution**: Refactored gesture classification in [`gesture_recognizer.py`](file:///C:/Projects/Hand-Detection-And-Tracking-System/backend/gesture_recognizer.py) to use **joint-angle kinematics**. Calculated bone segment angles at the PIP and DIP joints using cosine dot products for rotation-invariant finger flexion, and projected the thumb vector onto the perpendicular hand coordinate axis for gravity-aware orientation.

### 2. Multi-Hand Tracking & ID Slot Reuse
- **Challenge**: MediaPipe's `IMAGE` mode operates statelessly per frame. An unbounded incrementing counter caused IDs to climb to `Hand #20+` as hands left and re-entered, and brief motion blur caused IDs to flicker.
- **Solution**: Built [`hand_tracker.py`](file:///C:/Projects/Hand-Detection-And-Tracking-System/backend/hand_tracker.py) with predictive centroid tracking, velocity smoothing, an 8-frame (~0.5s) occlusion grace period, and a **lowest available ID slot allocator**. Hands reliably maintain their IDs while in view and cleanly reuse freed slots (`#1`, `#2`, `#3`, `#4`) when returning.

### 3. Synchronized Composite Video Recording
- **Challenge**: Capturing the raw `<video>` element omitted all landmark overlays, while capturing the overlay `<canvas>` only recorded floating skeleton lines against a transparent/black background.
- **Solution**: Developed [`useVideoRecorder.ts`](file:///C:/Projects/Hand-Detection-And-Tracking-System/frontend/src/hooks/useVideoRecorder.ts) with an offscreen composite renderer. Each frame draws the mirrored camera stream followed synchronously by skeleton meshes, bounding boxes, Hand IDs, and gesture pills, streaming directly into a browser `MediaRecorder` (`.webm`/`.mp4`).

### 4. Layout Containment & Single-Display Responsiveness
- **Challenge**: When 3–4 hands were detected, long telemetry strings with `white-space: nowrap` expanded the CSS Grid column beyond the viewport, shifting the control sidebar off-screen and creating unwanted scrollbars.
- **Solution**: Clamped the grid layout with `minmax(0, 1fr)`, applied `min-width: 0` with text truncation on status cells, and locked the application to a `100vh` zero-scroll boundary with an auto-scaling 16:9 video viewport.

### 5. Canvas Mirroring vs. Label Text Inversion
- **Challenge**: Mirroring the webcam feed (`transform: scaleX(-1)`) provides a natural selfie-mirror experience, but applying the same mirror transform to the overlay canvas caused all text (handedness, confidence %, Hand IDs, and gesture labels) to render backwards.
- **Solution**: Implemented localized counter-transformations in [`drawLandmarks.ts`](file:///C:/Projects/Hand-Detection-And-Tracking-System/frontend/src/utils/drawLandmarks.ts). Before rendering text, the canvas translates to the label center, applies `ctx.scale(-1, 1)`, draws the text, and restores context for left-to-right legibility.

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
