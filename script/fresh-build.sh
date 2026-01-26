#!/bin/bash

# Fresh Build Script
# This script clears all caches and performs a clean build
# Use this when you want to ensure you're running the latest code

echo "🧹 Clearing build artifacts and caches..."

# Remove dist folder
if [ -d "dist" ]; then
  echo "  - Removing dist folder..."
  rm -rf dist
fi

# Remove node_modules (optional - uncomment if needed)
# echo "  - Removing node_modules..."
# rm -rf node_modules

# Clear npm cache (optional)
# npm cache clean --force

# Clear Vite cache
if [ -d "node_modules/.vite" ]; then
  echo "  - Clearing Vite cache..."
  rm -rf node_modules/.vite
fi

# Clear TypeScript build cache
if [ -f ".tsbuildinfo" ]; then
  echo "  - Clearing TypeScript cache..."
  rm -f .tsbuildinfo
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Fresh build complete!"
echo ""
echo "To run the app:"
echo "  • Development: npm run dev"
echo "  • Production: npm start"
echo ""
echo "For mobile:"
echo "  • iOS: npm run sync:ios && open ios/App/App.xcworkspace"
echo "  • Android: npm run sync:android && cd android && ./gradlew assembleDebug"
