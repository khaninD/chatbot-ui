#!/bin/sh
set -e

echo "Starting chatbot-ui with runtime environment variables..."

# Replace NEXT_PUBLIC_ environment variables in the built Next.js files
if [ -d ".next/static" ]; then
  echo "Replacing environment variables in static files..."

  # Find all JS files in .next/static and replace the placeholder values
  find .next/static -type f -name "*.js" -exec sed -i \
    -e "s|NEXT_PUBLIC_SUPABASE_URL_PLACEHOLDER|${NEXT_PUBLIC_SUPABASE_URL}|g" \
    -e "s|NEXT_PUBLIC_SUPABASE_ANON_KEY_PLACEHOLDER|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" \
    {} \;

  echo "Environment variables replaced successfully"
fi

# Execute the original command
exec "$@"
