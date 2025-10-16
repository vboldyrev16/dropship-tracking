import { serve } from 'inngest/remix';
import { inngest } from '~/inngest/client';
import { functions } from '~/inngest/functions';

const handler = serve({
  client: inngest,
  functions,
});

export { handler as action, handler as loader };
