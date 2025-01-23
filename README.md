# Toolkitty (working title) 😻

> Autonomous coordination toolkit for collectives, organisers and venues to share resources and organise events in a collaborative calendar.

Toolkitty is built for iOS, Android and Desktop with [Tauri](https://tauri.app/), [SvelteKit](https://svelte.dev/) and [p2panda](https://p2panda.org/).

## About

Toolkitty is a peer-to-peer (P2P), [local-first](https://www.inkandswitch.com/local-first/) application for desktop and mobile designed to help collectives, festivals, organizers, venues and community spaces by facilitating decentralized resource exchanging and event coordination in a collaborative calendar. We are building it for groups that value autonomy, resilience, and privacy in their organisational practices.

### Key features

- **Peer-to-Peer Networking.** Using p2panda under the hood, networking is done directly between peers instead of using a centralised server.
- **Offline-First Functionality.** Data is stored locally and synced to peers when an internet connection is available. Ensuring you can organise no matter what environment you are in.
- **Resource Sharing.** Easy to list, discover and manage shared resources like spaces and tools or equipment, encouraging sustainable and collaborative practices.
- **Shared Calendar and Events.** Plan your venue, festival, collective through a shared calendar.
- **Encryption.** All data is encrypted on your device by default and can only be synced with verified peers.

## Timeline

We are planning to launch the app in mid-2025.

## Development

Make sure you have installed the prerequisites for your OS: https://tauri.app/start/prerequisites/, then run:

```bash
# Install dependencies
npm install

# Initialize environments for Android and iOS development
npm run tauri android init
npm run tauri ios init

# Start Desktop application in development mode
npm run tauri dev

# Start Android app in development mode
npm run tauri android dev

# Start iOS app in development mode
npm run tauri ios dev

# For testing the p2p functionality you can run the application multiple times
# on the same machine, repeat this command per peer you want to launch
npm run peer
```

## License

[`GPL-3.0 license`](/LICENSE)
