import { json } from '@remix-run/node';
import { db } from '~/lib/utils/db';

export async function loader() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;

    return json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    return json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'error',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
