
import { config } from 'dotenv';
config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, schools } from '../shared/schema';
import { AuthService } from '../server/domains/auth/auth.service';
import { eq } from 'drizzle-orm';

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

async function addProductionUsers() {
  console.log('🚀 Starting to add production users to PRODUCTION database...');

  // Use production database URL from secrets
  const prodDbUrl = process.env.PRODUCTION_DATABASE_URL;
  if (!prodDbUrl) {
    console.error('❌ PRODUCTION_DATABASE_URL environment variable is required');
    console.log('Please ensure PRODUCTION_DATABASE_URL is set in your Replit secrets');
    process.exit(1);
  }

  console.log(`📍 Connecting to production database: ${prodDbUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);

  const connection = postgres(prodDbUrl);
  const prodDb = drizzle(connection);

  try {
    // Find PSI High School in production
    const [psiSchool] = await prodDb.select().from(schools).where(eq(schools.name, 'PSI High School'));
    
    if (!psiSchool) {
      console.log('❌ PSI High School not found in production. Creating it...');
      const [newSchool] = await prodDb.insert(schools).values({
        name: 'PSI High School',
        address: '123 Education Ave',
        city: 'Learning City',
        state: 'CA',
        zipCode: '90210'
      }).returning();
      console.log('✅ Created PSI High School in production with ID:', newSchool.id);
    }

    const schoolId = psiSchool?.id || (await prodDb.select().from(schools).where(eq(schools.name, 'PSI High School')))[0].id;

    let addedCount = 0;
    let skippedCount = 0;

    for (const userData of productionUsers) {
      try {
        // Check if user already exists in production
        const [existingUser] = await prodDb.select().from(users).where(eq(users.username, userData.username));
        
        if (existingUser) {
          console.log(`⚠️  User ${userData.username} already exists in production, skipping...`);
          skippedCount++;
          continue;
        }

        // Hash password
        const hashedPassword = await AuthService.hashPassword(userData.password);
        
        // Create user in production
        const [newUser] = await prodDb.insert(users).values({
          username: userData.username,
          password: hashedPassword,
          role: 'student',
          schoolId: schoolId,
        }).returning();

        console.log(`✅ Added user to PRODUCTION: ${userData.username} (ID: ${newUser.id})`);
        addedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to add user ${userData.username} to production:`, error);
      }
    }

    console.log('\n📊 PRODUCTION Database Summary:');
    console.log(`✅ Successfully added to PRODUCTION: ${addedCount} users`);
    console.log(`⚠️  Skipped (already exist): ${skippedCount} users`);
    console.log(`📝 Total processed: ${productionUsers.length} users`);

  } catch (error) {
    console.error('❌ Error adding users to production database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the script
addProductionUsers()
  .then(() => {
    console.log('🎉 Production users added to PRODUCTION database successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to add users to production database:', error);
    process.exit(1);
  });
