# Test your Travel Email Parser API
# Make sure your server is running: npm run dev

# Test 1: Basic Health Check
echo "🔍 Testing health check..."
curl -s http://localhost:3000/api/v1/health | jq .

echo -e "\n📧 Testing email parsing with sample flight confirmation..."

# Test 2: Parse a Sample Flight Email
curl -X POST http://localhost:3000/api/v1/parse/email \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Flight Confirmation - American Airlines\n\nConfirmation Code: ABC123\nPassenger: John Doe\n\nFlight Details:\nAA1234 - December 15, 2024\nDeparture: Los Angeles (LAX) at 8:30 AM\nArrival: New York (JFK) at 5:15 PM\nSeat: 12A\nClass: Economy\n\nTotal Cost: $299.99\n\nThank you for choosing American Airlines!",
    "user_email": "test@example.com"
  }' | jq .

echo -e "\n✅ Test completed! Check the response above."