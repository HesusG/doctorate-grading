#!/bin/bash

# =====================================================
# Doctorate Grading Database Setup Script
# Cross-platform setup automation
# =====================================================

echo "🎓 Doctorate Grading Database Setup"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

version_ge() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

if ! version_ge "$NODE_VERSION" "$REQUIRED_VERSION"; then
    echo "❌ Node.js $REQUIRED_VERSION or higher is required. Current: v$NODE_VERSION"
    exit 1
fi

echo "✅ Node.js v$NODE_VERSION detected"

# Run the main setup script
echo "🚀 Starting database setup..."
node scripts/setup.js

# Check if setup was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Open index.html in VS Code Live Server"
    echo "2. The database is ready at: db/doctorate.sqlite"
    echo "3. Check db/README.md for usage documentation"
    echo ""
else
    echo ""
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi