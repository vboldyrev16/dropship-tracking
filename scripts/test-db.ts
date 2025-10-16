import { db } from '../app/lib/utils/db';

async function main() {
  try {
    await db.$connect();
    console.log('✅ Connected to database successfully');

    // Test a simple query
    const result = await db.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query works:', result);

    await db.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

main();
