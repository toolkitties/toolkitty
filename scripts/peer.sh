#!/usr/bin/env bash

# peer.sh - Starts Tauri with an user-defined (or otherwise randomized) port.
# This allows us to launch multiple Tauri instances in developer mode at the
# same time and helps with testing the p2p network on the same machine.
#
# Example:
#
# TAURI_CLI_PORT=1234 ./peer.sh

random_port=$((49152 + $RANDOM % (65535 - 49152)))

TAURI_CLI_PORT="${TAURI_CLI_PORT:-$random_port}"

tauri_json_config="{
  \"build\": {
    \"devUrl\": \"http://localhost:$TAURI_CLI_PORT\",
    \"beforeDevCommand\": \"npm run dev -- --port $TAURI_CLI_PORT\"
  }
}"

# Disable hot-mode-reloading via --no-watch for now as it breaks
# re-initialization of the frontend-backend Tauri channel.
./node_modules/.bin/tauri dev \
  --no-dev-server \
  --no-watch \
  --config "$tauri_json_config"
