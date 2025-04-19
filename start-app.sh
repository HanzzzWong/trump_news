#!/bin/bash
echo "Starting Trump News Tracker application..."
echo
echo "Please wait while the server starts..."
node server.js &
SERVER_PID=$!
echo
echo "Server starting on port 3000..."
sleep 3
echo "Opening application in your default browser..."

# Try to open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux with xdg-open
    xdg-open http://localhost:3000 || sensible-browser http://localhost:3000 || firefox http://localhost:3000 || google-chrome http://localhost:3000
fi

echo
echo "If the application doesn't open automatically, please navigate to:"
echo "http://localhost:3000"
echo
echo "To stop the server, press Ctrl+C"

# Keep script running to allow manual termination
wait $SERVER_PID 