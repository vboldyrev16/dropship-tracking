import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { db } from '../utils/db';

export interface TrackingEvent {
  trackingNumber: string;
  statusCode: string;
  message: string;
  location?: string;
  occurredAt: string;
}

export async function registerTracking(
  trackingNumber: string,
  carrierCode?: string
): Promise<void> {
  const body = [
    {
      number: trackingNumber,
      carrier: carrierCode || 0, // 0 = auto-detect
    },
  ];

  const response = await fetch('https://api.17track.net/track/v2.2/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      '17token': env.SEVENTEEN_TRACK_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`17TRACK registration failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  logger.info('Tracking registered with 17TRACK', { trackingNumber, response: data });
}

export function parseWebhookPayload(payload: any): TrackingEvent[] {
  // 17TRACK webhook structure (example - adjust based on real API)
  const events: TrackingEvent[] = [];

  if (!payload.data || !Array.isArray(payload.data)) {
    return events;
  }

  for (const item of payload.data) {
    const trackingNumber = item.number;
    const trackArray = item.track || [];

    for (const track of trackArray) {
      events.push({
        trackingNumber,
        statusCode: track.event || track.status || 'Unknown',
        message: track.z || track.c || '',
        location: track.a || undefined,
        occurredAt: track.a ? new Date(track.a).toISOString() : new Date().toISOString(),
      });
    }
  }

  return events;
}

export async function storeRawEvents(events: TrackingEvent[]): Promise<string[]> {
  const eventIds: string[] = [];

  for (const event of events) {
    // Find tracking by number
    const tracking = await db.tracking.findFirst({
      where: { trackingNumber: event.trackingNumber },
    });

    if (!tracking) {
      logger.warn('Tracking not found for event', { trackingNumber: event.trackingNumber });
      continue;
    }

    const rawEvent = await db.eventRaw.create({
      data: {
        trackingId: tracking.id,
        provider: '17track',
        payloadJson: JSON.stringify(event),
        occurredAt: new Date(event.occurredAt),
      },
    });

    eventIds.push(rawEvent.id);
  }

  return eventIds;
}
