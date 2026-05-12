#!/bin/bash

# 🚀 FAST STARTUP SCRIPT - Optimized for Performance

echo "🔧 Optimizing workspace for speed..."

# 1. Clear any stray processes
echo "✓ Clearing old processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "node server" 2>/dev/null || true
sleep 1

# 2. Clear .next cache
echo "✓ Clearing build caches..."
rm -rf frontend/.next
rm -rf backend/.next 2>/dev/null || true

# 3. Install dependencies if missing
if [ ! -d "backend/node_modules" ]; then
  echo "✓ Installing backend dependencies..."
  cd backend && npm install
  cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "✓ Installing frontend dependencies..."
  cd frontend && npm install
  cd ..
fi

# 4. Start services
echo ""
echo "🚀 Starting services..."
echo ""
echo "📱 Frontend running on: http://localhost:3000"
echo "🔌 Backend running on: http://localhost:5050"
echo ""

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend in background
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Keep script running and show output
wait

echo "✅ All services started"
