# Nova Arcade Collection

Nova Arcade Collection is a lightweight, offline-first touch arcade built with React, TypeScript, Vite, and Capacitor.

## Included

- 19 touch-first arcade games
- AMOLED-first dark interface
- Local XP, scores, and play-time persistence
- Procedural Web Audio feedback with no bundled sound library
- Compact in-app menu with GitHub, Played Time, About, and Appearance controls
- Android release configuration for Capacitor

## Development

Requirements: Node.js 22+

```bash
npm ci
npm run dev
```

Create a production web build with:

```bash
npm run build
```

Type-check the project with:

```bash
npm run lint
```

## Android

The Android project uses the `com.novaarcade.app` application ID.

For a local release build:

```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew assembleRelease --no-daemon
```

Codemagic uses the same production sequence and preserves npm optional native dependencies for macOS ARM64 builds.
