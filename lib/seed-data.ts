// DSV Demo Seed Data
import emailData from './seed-data/email-inbox.json';
import shipmentsData from './seed-data/shipments-dashboard.json';
import mapData from './seed-data/map-view.json';
import milestonesData from './seed-data/shipment-milestones.json';

export const SEED_DATA = {
  emails: emailData.emails,
  shipments: shipmentsData.shipments,
  mapShipments: mapData.mapShipments,
  milestones: milestonesData.shipmentMilestones,
};
