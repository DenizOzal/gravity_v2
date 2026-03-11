#!/bin/bash
# DocShift — Start Both Dev Servers
# Run this from the project root: gravity_v2/
# It opens two terminal tabs/panes (requires macOS Terminal or iTerm2)

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Starting DocShift ==="
echo ""

# Start Flask backend in a new terminal tab
osascript -e "
tell application \"Terminal\"
  activate
  tell application \"System Events\" to keystroke \"t\" using command down
  delay 0.5
  do script \"cd '$ROOT/backend' && source venv/bin/activate && python app.py\" in front window
end tell
" 2>/dev/null

# Start Vite frontend in another new tab
osascript -e "
tell application \"Terminal\"
  activate
  tell application \"System Events\" to keystroke \"t\" using command down
  delay 0.5
  do script \"cd '$ROOT/frontend' && npm run dev\" in front window
end tell
" 2>/dev/null

echo "✅ Launched both servers in new Terminal tabs."
echo ""
echo "   Backend:  http://localhost:5001"
echo "   Frontend: http://localhost:5173"
