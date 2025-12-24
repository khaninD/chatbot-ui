#!/bin/bash
# Quick restart script for chatbot-ui
# Use this when you only change .env.local and don't need full rebuild

echo "Restarting chatbot-ui with new environment variables..."

# Stop the container
docker compose down

# Start with new env vars (no rebuild)
docker compose up -d

echo "Done! But remember: NEXT_PUBLIC_* variables require rebuild to take effect."
echo "If you changed NEXT_PUBLIC_SUPABASE_URL, run: docker compose up -d --build"
