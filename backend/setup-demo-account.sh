#!/bin/bash

# Demo Account Setup Script
# Quickly set up a complete test demo account for WhatsApp testing

echo "🎭 WhatsApp Demo Account Setup"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the backend directory:"
    echo "  cd backend"
    echo "  bash ../setup-demo-account.sh"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install > /dev/null 2>&1

echo "✅ Dependencies installed"
echo ""

echo "🚀 Creating demo account..."
echo ""

# Run the setup script
node setup-demo-account.mjs

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup Complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Start the backend: npm run dev"
    echo "2. Start the frontend: cd ../frontend && npm run dev"
    echo "3. Login with:"
    echo "   Email: demo@whatsapp-test.local"
    echo "   Password: (any password)"
    echo ""
    echo "📖 See DEMO-ACCOUNT-SETUP.md for detailed guide"
else
    echo ""
    echo "❌ Setup failed. Check error messages above."
    exit 1
fi
