export interface RegisterTrackingJob {
  trackingId: string;
}

export interface ProcessEventJob {
  eventRawId: string;
}

export interface UpdateStatusJob {
  trackingId: string;
}
