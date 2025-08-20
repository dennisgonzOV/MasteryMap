
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const productionUsers = [
  { username: 'ADan315', password: 'PSIHigh2025' },
  { username: 'HPri196', password: 'PSIHigh2025' },
  { username: 'RCar927', password: 'PSIHigh2025' },
  { username: 'TOrt818', password: 'PSIHigh2025' },
  { username: 'SAll286', password: 'PSIHigh2025' },
  { username: 'IDuc674', password: 'PSIHigh2025' },
  { username: 'ARic755', password: 'PSIHigh2025' },
  { username: 'JMar824', password: 'PSIHigh2025' },
  { username: 'JCop702', password: 'PSIHigh2025' },
  { username: 'TMir900', password: 'PSIHigh2025' },
  { username: 'NVal875', password: 'PSIHigh2025' },
  { username: 'KSto867', password: 'PSIHigh2025' },
  { username: 'EAza419', password: 'PSIHigh2025' },
  { username: 'JSer696', password: 'PSIHigh2025' },
];

async function addUsers() {
  const pool = new Pool({
    connectionString: process.env.PRODUCTION_DATABASE_URL
  });

  try {
    console.log('Adding users to production database...');
    
    // Ensure school exists
    const schoolResult = await pool.query(
      "INSERT INTO schools (name, address, city, state, zip_code) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      ['PSI High School', '123 Education Ave', 'Learning City', 'CA', '90210']
    );
    
    const schoolId = schoolResult.rows[0]?.id || (await pool.query("SELECT id FROM schools WHERE name = 'PSI High School'")).rows[0].id;
    
    for (const user of productionUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const result = await pool.query(
        "INSERT INTO users (username, password, role, school_id) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING RETURNING id",
        [user.username, hashedPassword, 'student', schoolId]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ Added user: ${user.username}`);
      } else {
        console.log(`⚠️ User already exists: ${user.username}`);
      }
    }
    
    console.log('✅ All users processed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

addUsers();
