// Redis channel constants - safe to import on client and server
export const CHANNELS = {
  EMAIL_RECEIVED: 'hr:email:received',
  BOOKING_CREATED: 'hr:booking:created',
  SHIPMENT_UPDATED: 'hr:shipment:updated',
  TEMPERATURE_ALERT: 'hr:temperature:alert',
  MILESTONE_UPDATED: 'hr:milestone:updated',
  DEMO_RESET: 'hr:demo:reset',
} as const;

export type Channel = typeof CHANNELS[keyof typeof CHANNELS];
