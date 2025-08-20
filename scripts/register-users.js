
const fetch = require('node-fetch');

const users = [
  { username: 'ADan315', password: 'PSIHigh2025' },
  { username: 'HPri196', password: 'PSIHigh2025' },
  // ... add all users
];

async function registerUsers() {
  const baseUrl = process.env.PRODUCTION_URL || 'https://your-repl-name.username.repl.co';
  
  for (const user of users) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          role: 'student',
          schoolId: 1 // Adjust based on your PSI High School ID
        })
      });
      
      if (response.ok) {
        console.log(`✅ Registered: ${user.username}`);
      } else {
        console.log(`❌ Failed: ${user.username} - ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Error registering ${user.username}:`, error.message);
    }
  }
}

registerUsers();
