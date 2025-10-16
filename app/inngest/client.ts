import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({ 
  id: 'dropship-tracking',
  name: 'Dropship Tracking App',
});

// Event types for type safety
export type Events = {
  'tracking/register': {
    data: {
      trackingId: string;
      trackingNumber: string;
      shopId: string;
    };
  };
  'tracking/event.process': {
    data: {
      rawEventId: string;
    };
  };
  'tracking/status.update': {
    data: {
      trackingId: string;
    };
  };
};
