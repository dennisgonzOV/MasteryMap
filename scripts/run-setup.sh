#!/bin/bash

echo "Setting up Teacher Dashboard..."
echo "================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set."
    echo "Please set it to your database connection string."
    echo "Example: export DATABASE_URL='postgresql://user:password@localhost:5432/dbname'"
    exit 1
fi

echo "Database URL is set. Proceeding with setup..."

# Run the setup script
echo "Running teacher dashboard setup..."
npx tsx scripts/setup-teacher-dashboard.ts

echo ""
echo "Setup completed!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Login as teacher: teacher@test.com / teacher123"
echo "3. Check the Student Progress Overview card on the dashboard"
echo ""
echo "If you still don't see students, run the test script:"
echo "npx tsx scripts/test-teacher-dashboard.ts"
