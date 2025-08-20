"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const schema_1 = require("../shared/schema");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const drizzle_orm_1 = require("drizzle-orm");
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
    // Debug: Show all available environment variables related to database
    console.log('🔍 Available database environment variables:');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('PRODUCTION_DATABASE_URL exists:', !!process.env.PRODUCTION_DATABASE_URL);
    // Use production database URL from secrets
    const prodDbUrl = process.env.PRODUCTION_DATABASE_URL;
    const devDbUrl = process.env.DATABASE_URL;
    console.log('🔍 Dev DB URL (partial):', devDbUrl ? devDbUrl.substring(0, 20) + '...' : 'NOT SET');
    console.log('🔍 Prod DB URL (partial):', prodDbUrl ? prodDbUrl.substring(0, 20) + '...' : 'NOT SET');
    if (!prodDbUrl) {
        console.error('❌ PRODUCTION_DATABASE_URL environment variable is required');
        console.log('Please ensure PRODUCTION_DATABASE_URL is set in your Replit secrets');
        process.exit(1);
    }
    console.log(`📍 Connecting to production database: ${prodDbUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);
    const connection = (0, postgres_1.default)(prodDbUrl);
    const prodDb = (0, postgres_js_1.drizzle)(connection);
    try {
        // Find PSI High School in production
        const [psiSchool] = await prodDb.select().from(schema_1.schools).where((0, drizzle_orm_1.eq)(schema_1.schools.name, 'PSI High School'));
        if (!psiSchool) {
            console.log('❌ PSI High School not found in production. Creating it...');
            const [newSchool] = await prodDb.insert(schema_1.schools).values({
                name: 'PSI High School',
                address: '123 Education Ave',
                city: 'Learning City',
                state: 'CA',
                zipCode: '90210'
            }).returning();
            console.log('✅ Created PSI High School in production with ID:', newSchool.id);
        }
        const schoolId = psiSchool?.id || (await prodDb.select().from(schema_1.schools).where((0, drizzle_orm_1.eq)(schema_1.schools.name, 'PSI High School')))[0].id;
        let addedCount = 0;
        let skippedCount = 0;
        for (const userData of productionUsers) {
            try {
                // Check if user already exists in production
                const [existingUser] = await prodDb.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, userData.username));
                if (existingUser) {
                    console.log(`⚠️  User ${userData.username} already exists in production, skipping...`);
                    skippedCount++;
                    continue;
                }
                // Hash password
                const salt = await bcryptjs_1.default.genSalt(12);
                const hashedPassword = await bcryptjs_1.default.hash(userData.password, salt);
                // Create user in production
                const [newUser] = await prodDb.insert(schema_1.users).values({
                    username: userData.username,
                    password: hashedPassword,
                    role: 'student',
                    schoolId: schoolId,
                }).returning();
                console.log(`✅ Added user to PRODUCTION: ${userData.username} (ID: ${newUser.id})`);
                addedCount++;
            }
            catch (error) {
                console.error(`❌ Failed to add user ${userData.username} to production:`, error);
            }
        }
        console.log('\n📊 PRODUCTION Database Summary:');
        console.log(`✅ Successfully added to PRODUCTION: ${addedCount} users`);
        console.log(`⚠️  Skipped (already exist): ${skippedCount} users`);
        console.log(`📝 Total processed: ${productionUsers.length} users`);
    }
    catch (error) {
        console.error('❌ Error adding users to production database:', error);
        throw error;
    }
    finally {
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
