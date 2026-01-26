#!/bin/bash

# UI Content Verification Script
# This script checks if all the UI content from your screenshots is present in the codebase

echo "🔍 Verifying UI Content Implementation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_content() {
  local search_term="$1"
  local description="$2"
  
  if grep -rq "$search_term" client/src/ 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Found: $description"
    return 0
  else
    echo -e "${RED}✗${NC} Missing: $description"
    return 1
  fi
}

# Check onboarding flow text
echo "Onboarding Flow:"
check_content "Pick one area to start with" "Step 3: Pick one area..."
check_content "Meet DW" "Step 4: Meet DW"
check_content "Your personal wellness companion" "DW description"
check_content "Create my first starter block" "Starter block CTA"
check_content "You're set" "Success screen title"
check_content "Small structure.*Real momentum" "Success screen subtitle"
check_content "Weekly rhythm saved" "Success checklist item"

echo ""
echo "Focus Areas:"
check_content "Body" "Body focus area"
check_content "Food" "Food focus area"
check_content "Mind" "Mind focus area"
check_content "Money" "Money focus area"
check_content "Spirit" "Spirit focus area"
check_content "School / Work" "Work/School focus area"

echo ""
echo "Workout Page:"
check_content "Planning Horizon" "Planning Horizon feature"
check_content "Focusing your training scope" "Planning Horizon description"
check_content "Start with a Body Scan" "Body Scan prompt"

echo ""
echo "DW Chat:"
check_content "Your first block is live" "Starter block notification"
check_content "I set up a simple movement block" "Movement block message (Body)"

echo ""
echo "Components:"
check_content "soft-onboarding-modal" "Soft onboarding modal component"
check_content "onboarding-wizard" "Onboarding wizard component"
if [ -f "client/src/pages/welcome.tsx" ]; then
  echo -e "${GREEN}✓${NC} Found: Welcome page component"
else
  echo -e "${RED}✗${NC} Missing: Welcome page component"
fi
if [ -f "client/src/pages/workout.tsx" ]; then
  echo -e "${GREEN}✓${NC} Found: Workout page component"
else
  echo -e "${RED}✗${NC} Missing: Workout page component"
fi

echo ""
echo "─────────────────────────────────────────"
echo "✅ Verification Complete!"
echo ""
echo "If all items show ✓, the UI content is properly implemented."
echo "If you see ✗, there may be missing content."
echo ""
echo "If everything checks out but you still don't see changes:"
echo "1. Run: ./script/fresh-build.sh"
echo "2. Hard refresh your browser"
echo "3. See: docs/TROUBLESHOOTING_UI_CHANGES.md"
