# Lightning TV App

LightningJS / Blits application for synchronized HLS video playback across multiple Android TV devices.

## Overview

The application uses a server-based common timeline to synchronize video playback across multiple TV devices.

A Node.js synchronization service provides a shared time reference. Each TV independently calculates its current position on the common timeline and synchronizes its HLS video playback accordingly.

The current implementation supports:

- Common timeline initialization
- Multiple TV clients joining the same timeline
- Late-joining TVs
- Independent calculation of the common playback position
- Buffering recovery
- Continuous video looping
- HLS playback using HLS.js
- Android TV testing

Play/Pause controls are **not implemented in the current version**.

---

## Project Structure

```text
lightning-tv-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── poc/
│   │   └── VideoSyncTimelinePoc.js
│   ├── services/
│   ├── App.js
│   └── index.js
│
├── android/
├── public/
├── sync-server1.cjs
├── package.json
├── package-lock.json
├── capacitor.config.json
└── vite.config.js
```

---

## Prerequisites

Install the following before setting up the project:

- Node.js
- npm
- Git
- Android Studio
- Android SDK
- Android TV / Google TV emulator

---

## Project Setup

Clone the repository:

```sh
git clone <REPOSITORY_URL>
```

Navigate to the project directory:

```sh
cd lightning-tv-app
```

Install dependencies:

```sh
npm install
```

---

## Synchronization Server

The project contains a Node.js synchronization server:

```text
sync-server1.cjs
```

Start the synchronization server with:

```sh
node sync-server1.cjs
```

The server runs on port `3001`.

The session endpoint is:

```text
/session
```

The endpoint provides:

- `commonTimelineStart`
- `serverNow`

The first TV that requests the session creates the common timeline.

Subsequent TVs receive the same `commonTimelineStart` and join the existing timeline.

---

## Sync Server Address

The current development configuration uses the local network IP address of the computer running the synchronization server:

```text
http://192.168.29.250:3001/session
```

This address is currently used by:

```text
src/pages/Login.js
src/poc/VideoSyncTimelinePoc.js
```

If the synchronization server is running on a different computer or the computer's local IP address changes, update the server address in these files.

The Android TV devices/emulators must be able to reach the computer running the synchronization server over the network.

---

## Run in Development Mode

Start the Vite development server:

```sh
npm run dev
```

For Android TV testing, make sure the synchronization server is also running:

```sh
node sync-server1.cjs
```

Both the application and synchronization server must be accessible from the Android TV environment.

---

## Build the Web Application

Create a production build:

```sh
npm run build
```

---

## Android TV Build

Build the application first:

```sh
npm run build
```

Synchronize the web application with the Android project:

```sh
npx cap sync android
```

Go to the Android project:

```sh
cd android
```

Build the debug APK:

```sh
.\gradlew.bat assembleDebug
```

The generated APK can be found at:

```text
android/app/build/outputs/apk/debug/
```

---

## Android TV Emulator Testing

The application can be tested using Android Studio with an Android TV or Google TV emulator.

After creating and starting the emulator:

1. Start the synchronization server.
2. Make sure the server IP address configured in the application is reachable from the emulator.
3. Build the Android application.
4. Install the APK on the emulator.
5. Launch the application.
6. Repeat the process on multiple TV emulators/devices.
7. Log in on each TV.
8. Observe the synchronized video playback.

Each TV calculates its own playback position from the shared timeline.

---

## Synchronization Flow

The synchronization flow is:

```text
                ┌──────────────────────┐
                │   Sync Server        │
                │                      │
                │ commonTimelineStart  │
                │ serverNow            │
                └──────────┬───────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          TV 1          TV 2          TV 3
             │             │             │
             ▼             ▼             ▼
       Calculate      Calculate      Calculate
       timeline       timeline       timeline
       position       position       position
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                    HLS Video Playback
```

There is no permanent master TV.

The synchronization server provides the common time reference, while each TV independently calculates where it should be in the video.

---

## Common Timeline

The common timeline starts when the first TV requests a session.

The server stores:

```text
commonTimelineStart
```

Each TV receives the same timeline start value.

The common playback position is calculated from the current shared time reference.

Conceptually:

```text
commonPosition =
(currentServerTime - commonTimelineStart) / 1000
```

The result represents the number of seconds elapsed on the common timeline.

---

## Video Playback Position

The video continuously loops.

Once the common timeline position reaches the end of the video, playback starts again from the beginning while remaining synchronized with the common timeline.

The playback position is calculated conceptually as:

```text
videoPosition = commonPosition % videoDuration
```

For example, if:

```text
videoDuration = 600 seconds
commonPosition = 650 seconds
```

then:

```text
videoPosition = 650 % 600
              = 50 seconds
```

Therefore, all TVs calculate the same position independently.

---

## Late-Joining TVs

A TV can join after the common timeline has already started.

For example:

```text
TV 1 joins → common timeline starts
        ↓
        30 seconds
        ↓
TV 2 joins
        ↓
TV 2 calculates current common position
        ↓
TV 2 starts from the current synchronized position
```

The late-joining TV does not start from the beginning of the video.

It calculates its position using the existing common timeline.

---

## Buffering Recovery

If a TV experiences slow internet or temporary buffering, its local video playback may fall behind the common timeline.

After playback becomes available again, the TV resynchronizes against the current common timeline instead of continuing from an old stale position.

Conceptually:

```text
Common Timeline
──────────────────────────────────────────────►
                         Current Position
                               │
                               ▼
TV playback ────────────────► Buffering
                               │
                               ▼
                         Recovery
                               │
                               ▼
                    Resynchronize to
                    current timeline
```

This allows a TV that temporarily falls behind to return to the current synchronized position.

---

## HLS Video

The current proof-of-concept uses an HLS video stream:

```text
https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8
```

HLS playback is handled using HLS.js where supported.

---

## Current Limitations

The current version is a proof-of-concept.

Currently:

- Play/Pause controls are not implemented.
- Individual playback controls are intentionally disabled for the current synchronization testing.
- The synchronization server stores the timeline in memory.
- Restarting the synchronization server creates a new common timeline.
- The server IP address is currently configured directly in the application.
- The current synchronization server is intended for development/POC testing rather than production deployment.
- Authentication and persistent session management are not part of the current synchronization server.
- Automatic playback-rate catch-up is not implemented.

---

## Development Notes

The synchronization architecture is based on a shared timeline rather than one TV controlling the other TVs.

The important concept is:

```text
Sync Server
     │
     │ Shared timeline
     ▼
┌─────────┬─────────┬─────────┐
│   TV 1  │   TV 2  │   TV 3  │
└─────────┴─────────┴─────────┘
     │         │         │
     ▼         ▼         ▼
 Independent local calculations
```

This means that a TV does not become the permanent master of playback.

The synchronization server provides the common time reference, and the TVs independently determine their expected playback position.

---

## Useful Commands

Install dependencies:

```sh
npm install
```

Start development server:

```sh
npm run dev
```

Build the application:

```sh
npm run build
```

Start the synchronization server:

```sh
node sync-server1.cjs
```

Synchronize Capacitor Android project:

```sh
npx cap sync android
```

Build Android debug APK:

```sh
cd android
.\gradlew.bat assembleDebug
```

---

## Technologies

- LightningJS
- Blits
- HLS
- HLS.js
- Node.js
- Capacitor
- Android
- Android TV / Google TV

---

## Status

**Current status: Proof of Concept**

The current POC focuses on:

1. Establishing a common timeline.
2. Allowing multiple TVs to join the same timeline.
3. Synchronizing late-joining TVs.
4. Recovering synchronization after buffering.
5. Maintaining synchronization while the video continuously loops.

Further playback controls and production-level synchronization infrastructure can be added in future development.