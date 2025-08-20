
import { db } from '../server/db';
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
  console.log('🚀 Starting to add production users...');

  try {
    // Find PSI High School
    const [psiSchool] = await db.select().from(schools).where(eq(schools.name, 'PSI High School'));
    
    if (!psiSchool) {
      console.log('❌ PSI High School not found. Creating it...');
      const [newSchool] = await db.insert(schools).values({
        name: 'PSI High School',
        address: '123 Education Ave',
        city: 'Learning City',
        state: 'CA',
        zipCode: '90210'
      }).returning();
      console.log('✅ Created PSI High School with ID:', newSchool.id);
    }

    const schoolId = psiSchool?.id || (await db.select().from(schools).where(eq(schools.name, 'PSI High School')))[0].id;

    let addedCount = 0;
    let skippedCount = 0;

    for (const userData of productionUsers) {
      try {
        // Check if user already exists
        const [existingUser] = await db.select().from(users).where(eq(users.username, userData.username));
        
        if (existingUser) {
          console.log(`⚠️  User ${userData.username} already exists, skipping...`);
          skippedCount++;
          continue;
        }

        // Hash password
        const hashedPassword = await AuthService.hashPassword(userData.password);
        
        // Create user
        const [newUser] = await db.insert(users).values({
          username: userData.username,
          password: hashedPassword,
          role: 'student',
          schoolId: schoolId,
        }).returning();

        console.log(`✅ Added user: ${userData.username} (ID: ${newUser.id})`);
        addedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to add user ${userData.username}:`, error);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully added: ${addedCount} users`);
    console.log(`⚠️  Skipped (already exist): ${skippedCount} users`);
    console.log(`📝 Total processed: ${productionUsers.length} users`);

  } catch (error) {
    console.error('❌ Error adding production users:', error);
    throw error;
  }
}

// Run the script
addProductionUsers()
  .then(() => {
    console.log('🎉 Production users script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Production users script failed:', error);
    process.exit(1);
  });
