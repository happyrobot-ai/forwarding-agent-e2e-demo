// Redis channel constants - safe to import on client and server
export const CHANNELS = {
  EMAIL_RECEIVED: 'dsv:email:received',
  BOOKING_CREATED: 'dsv:booking:created',
  SHIPMENT_UPDATED: 'dsv:shipment:updated',
  TEMPERATURE_ALERT: 'dsv:temperature:alert',
  MILESTONE_UPDATED: 'dsv:milestone:updated',
  DEMO_RESET: 'dsv:demo:reset',
} as const;

export type Channel = typeof CHANNELS[keyof typeof CHANNELS];
