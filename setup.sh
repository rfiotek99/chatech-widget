#!/bin/bash

# ====================================
# CHATECH V2 - SETUP SCRIPT
# ====================================

echo "🚀 ChatEch v2.0 - Setup Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Install from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js $NODE_VERSION installed${NC}"
echo ""

# Check npm
echo "📦 Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm $NPM_VERSION installed${NC}"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Check for .env file
echo "🔧 Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}   ⚠️  Please edit .env with your credentials${NC}"
    echo ""
    echo "   Required variables:"
    echo "   - OPENAI_API_KEY"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_KEY"
    echo ""
else
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check required variables
    if grep -q "OPENAI_API_KEY=sk-" .env && \
       grep -q "SUPABASE_URL=https://" .env && \
       grep -q "SUPABASE_SERVICE_KEY=eyJ" .env; then
        echo -e "${GREEN}✅ Required environment variables configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Some environment variables may be missing${NC}"
        echo "   Please verify your .env file"
    fi
fi
echo ""

# Check for clients.json (for migration)
echo "📋 Checking for existing data..."
if [ -f clients.json ]; then
    echo -e "${GREEN}✅ clients.json found${NC}"
    echo "   You can migrate data with: npm run migrate"
else
    echo -e "${YELLOW}⚠️  clients.json not found${NC}"
    echo "   This is OK for new installations"
fi
echo ""

# Summary
echo "================================"
echo "📋 SETUP SUMMARY"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure Supabase:"
echo "   - Create project at https://supabase.com"
echo "   - Run supabase-schema.sql in SQL Editor"
echo "   - Copy credentials to .env"
echo ""
echo "2. (Optional) Migrate existing data:"
echo "   npm run migrate"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Test the widget:"
echo "   Open http://localhost:3000/demo-shopnow.html"
echo ""
echo "📖 Full guide: Read GUIA-MIGRACION.md"
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
