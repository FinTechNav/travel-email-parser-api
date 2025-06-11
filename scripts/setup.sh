#!/bin/bash

echo "🚀 Setting up Travel Email Parser API..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Configure your Supabase database connection!"
    echo ""
    echo "📋 Supabase Setup Instructions:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project → Settings → Database"
    echo "3. Get BOTH connection strings:"
    echo "   • Transaction pooler (port 6543) → DATABASE_URL"
    echo "   • Session pooler (port 5432) → DIRECT_URL"
    echo "4. Update .env file with both URLs"
    echo "5. Add your OpenAI API key"
    echo "6. Generate a long JWT secret (32+ characters)"
    echo ""
    echo "Example .env configuration:"
    echo 'DATABASE_URL="postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"'
    echo 'DIRECT_URL="postgresql://postgres:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"'
    echo ""
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env with your Supabase connection strings (see instructions above)"
echo "2. Run 'npx prisma migrate dev --name init' to set up database"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "🔧 Troubleshooting:"
echo "• If migration hangs: Make sure you have BOTH DATABASE_URL and DIRECT_URL"
echo "• If connection fails: Use Session/Transaction poolers (not Direct connection)"
echo "• For IPv4 networks: Poolers are required (Direct connection is IPv6 only)"
echo ""
echo "📖 Documentation: Check README.md for detailed setup guide"
echo ""
echo "Happy coding! 🎉"
