#!/bin/bash

# WhatsApp Health Check - Quick Terminal Verification
# Run: chmod +x verify-health.sh && ./verify-health.sh

echo ""
echo "=================================="
echo "WhatsApp Health Check"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:5050"
TOKEN="${1:-YOUR_JWT_TOKEN}"

# Check 1: API Health
echo -e "${BLUE}1️⃣  Checking API Health...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API is healthy${NC}\n"
else
    echo -e "${RED}❌ API not responding (HTTP $RESPONSE)${NC}"
    echo -e "${YELLOW}Make sure backend is running: cd backend && npm run dev${NC}\n"
    exit 1
fi

# Check 2: WhatsApp Status
echo -e "${BLUE}2️⃣  Checking WhatsApp Connection...${NC}"
if [ "$TOKEN" = "YOUR_JWT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Replace token with actual JWT${NC}"
    echo "   Usage: ./verify-health.sh 'your_jwt_token_here'"
    echo ""
else
    RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$API_URL/api/integrations/whatsapp/status")
    
    if echo "$RESPONSE" | grep -q '"connected":true'; then
        echo -e "${GREEN}✅ WhatsApp is connected${NC}"
        echo -e "${BLUE}Details:${NC}"
        echo "$RESPONSE" | grep -o '"wabaId":"[^"]*"' | head -1
        echo "$RESPONSE" | grep -o '"businessName":"[^"]*"' | head -1
        PHONE_COUNT=$(echo "$RESPONSE" | grep -o '"phoneNumberId"' | wc -l)
        echo -e "   📱 Phone Numbers: $PHONE_COUNT"
        echo ""
    elif echo "$RESPONSE" | grep -q '"connected":false'; then
        echo -e "${YELLOW}⚠️  WhatsApp not connected${NC}"
        echo "   Go to dashboard and click 'Connect WhatsApp' to authenticate"
        echo ""
    else
        echo -e "${RED}❌ Error getting WhatsApp status${NC}"
        echo "   Response: $RESPONSE"
        echo ""
    fi
fi

# Check 3: Conversations
echo -e "${BLUE}3️⃣  Checking Conversations...${NC}"
if [ "$TOKEN" != "YOUR_JWT_TOKEN" ]; then
    RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$API_URL/api/conversations")
    
    CONV_COUNT=$(echo "$RESPONSE" | grep -o '"_id"' | wc -l)
    if [ "$CONV_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ $CONV_COUNT conversation(s) found${NC}\n"
    else
        echo -e "${YELLOW}⚠️  No conversations yet (this is normal at first)${NC}\n"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping (need valid token)${NC}\n"
fi

# Check 4: Webhook
echo -e "${BLUE}4️⃣  Checking Webhook Endpoint...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/webhook/whatsapp")
if [ "$RESPONSE" = "405" ] || [ "$RESPONSE" = "400" ]; then
    echo -e "${GREEN}✅ Webhook endpoint exists (HTTP $RESPONSE)${NC}\n"
elif [ "$RESPONSE" = "404" ]; then
    echo -e "${RED}❌ Webhook endpoint not found${NC}\n"
else
    echo -e "${YELLOW}⚠️  Webhook returned HTTP $RESPONSE${NC}\n"
fi

# Summary
echo -e "${BLUE}=================================="
echo "Summary"
echo "==================================${NC}"
echo ""
echo -e "${GREEN}✅ API is running${NC}"

if [ "$TOKEN" != "YOUR_JWT_TOKEN" ]; then
    if echo "$RESPONSE" | grep -q '"connected":true' 2>/dev/null; then
        echo -e "${GREEN}✅ WhatsApp is connected${NC}"
        echo -e "${GREEN}✅ Workflow looks healthy!${NC}"
    else
        echo -e "${YELLOW}⚠️  WhatsApp needs authentication${NC}"
    fi
else
    echo -e "${YELLOW}📝 Run with token to check full status:${NC}"
    echo "   ./verify-health.sh 'your_jwt_token_here'"
fi

echo ""
