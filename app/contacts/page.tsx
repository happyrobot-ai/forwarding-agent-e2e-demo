"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  Clock,
  BarChart3,
  Shield,
  Truck,
  Thermometer,
  Weight,
  AlertCircle,
  Package,
  FileText,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Globe,
  Star,
  UserCircle,
  Sparkles,
  Send,
} from "lucide-react";

// --- Types ---

interface Contact {
  name: string;
  role: string;
  email: string;
  phone: string;
  preferredChannel: "Email" | "WhatsApp" | "Phone";
}

interface QuoteDefaults {
  defaultEquipment: string;
  defaultCommodity: string;
  defaultWeight: string;
  defaultAccessorials: string;
  defaultPriority: string;
  temperatureReq?: string;
}

interface SOPGenerated {
  workingNotes: string[];
  communicationPrefs: {
    preferredChannel: string;
    responseTime: string;
    escalationContact: string;
    specialNotes: string;
  };
  emphasis: string;
}

interface SOPPool {
  workingNotes: string[];
  communicationPrefs: {
    preferredChannel: string;
    responseTime: string;
    escalationContact: string;
    specialNotes: string;
  }[];
  emphases: string[];
}

interface Customer {
  id: string;
  company: string;
  contact: string;
  industry: string;
  relationshipTier: "Strategic" | "Key" | "Standard";
  lastInteraction: string;
  activityLevel: "high" | "medium" | "low";
  sentiment: { score: number; label: "Positive" | "Neutral" | "Needs Attention" };
  contacts: Contact[];
  quoteDefaults: QuoteDefaults;
  behaviors: {
    responsivenessRate: string;
    responsivenessDetail: string;
    issueRate: { label: string; pct: string }[];
    conversionRate: string;
    volumeTrend: string;
  };
  topics: { label: string; pct: number }[];
  preferences: {
    insurance: string;
    lanes: { origin: string; destination: string; frequency: string }[];
    dangerousGoods: string;
    preferredCarrier: string;
    tempControlled: string;
    avgWeight: string;
  };
  recentActivity: {
    channel: "email" | "whatsapp" | "voice";
    action: string;
    time: string;
    summary: string;
  }[];
  insightBanner: string;
  sopPool: SOPPool;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// --- Mock Data ---

const customers: Customer[] = [
  {
    id: "1",
    company: "Ferrari",
    contact: "Enzo Bianchi",
    industry: "Automotive",
    relationshipTier: "Strategic",
    lastInteraction: "1 hour ago",
    activityLevel: "high",
    sentiment: { score: 95, label: "Positive" },
    contacts: [
      { name: "Enzo Bianchi", role: "Logistics Director", email: "enzo.bianchi@ferrari.com", phone: "+1 (201) 816-2600", preferredChannel: "Phone" },
      { name: "Marco Rossi", role: "Supply Chain Manager", email: "marco.rossi@ferrari.com", phone: "+1 (201) 816-2601", preferredChannel: "Email" },
      { name: "Giulia Conti", role: "Shipping Coordinator", email: "giulia.conti@ferrari.com", phone: "+1 (201) 816-2602", preferredChannel: "WhatsApp" },
    ],
    quoteDefaults: {
      defaultEquipment: "Enclosed Auto Transport",
      defaultCommodity: "Luxury Vehicles & Auto Parts",
      defaultWeight: "~8,500 lbs",
      defaultAccessorials: "White Glove, Liftgate, Inside Delivery",
      defaultPriority: "Express",
    },
    behaviors: {
      responsivenessRate: "98%",
      responsivenessDetail: "Enzo responds within 30 minutes",
      issueRate: [
        { label: "Handling damage claims", pct: "2%" },
        { label: "Delivery scheduling", pct: "5%" },
      ],
      conversionRate: "92%",
      volumeTrend: "+25% vs last quarter",
    },
    topics: [
      { label: "Vehicle tracking", pct: 40 },
      { label: "Delivery scheduling", pct: 30 },
      { label: "Special handling", pct: 20 },
      { label: "Rate inquiries", pct: 10 },
    ],
    preferences: {
      insurance: "Always includes full value coverage",
      lanes: [
        { origin: "Miami, FL", destination: "Dallas, TX", frequency: "3x/month" },
        { origin: "Los Angeles, CA", destination: "Miami, FL", frequency: "2x/month" },
        { origin: "New York, NY", destination: "Chicago, IL", frequency: "2x/month" },
        { origin: "Atlanta, GA", destination: "Phoenix, AZ", frequency: "1x/month" },
      ],
      dangerousGoods: "None",
      preferredCarrier: "Premium enclosed transport specialists",
      tempControlled: "Climate-controlled for luxury vehicles",
      avgWeight: "~8,500 lbs",
    },
    recentActivity: [
      { channel: "voice", action: "Quote Request", time: "1 hour ago", summary: "Called to request expedited transport Miami→Dallas for SF90 Stradale" },
      { channel: "email", action: "Booking Confirmed", time: "4 hours ago", summary: "Confirmed enclosed transport for 2 Portofino M units" },
      { channel: "voice", action: "Status Inquiry", time: "Yesterday", summary: "Enzo called for ETA update on Dallas delivery" },
      { channel: "whatsapp", action: "Documentation Submitted", time: "Yesterday", summary: "Sent vehicle inspection photos pre-transport" },
      { channel: "voice", action: "Booking Request", time: "2 days ago", summary: "Called to schedule LA→Miami transport for 296 GTB" },
    ],
    insightBanner: "Enzo prefers phone calls — high-value strategic account",
    sopPool: {
      workingNotes: [
        "Enzo Bianchi ALWAYS prefers phone calls for quotes and updates — do not email first.",
        "All Ferrari vehicles require enclosed auto transport with climate control.",
        "Pre-transport and post-delivery vehicle inspections are mandatory with photo documentation.",
        "White glove service is standard for all Ferrari shipments — no exceptions.",
        "Insurance must cover full vehicle value (typically $300K-$500K per unit).",
        "Enzo expects real-time GPS tracking updates for all in-transit vehicles.",
        "Delivery windows must be coordinated directly with dealership managers.",
        "Priority account — escalate any delays immediately to Enzo's cell phone.",
      ],
      communicationPrefs: [
        { preferredChannel: "Phone (primary), Email for documentation only", responseTime: "Immediate for Enzo — answer calls within 2 rings", escalationContact: "Marco Rossi — Supply Chain Manager", specialNotes: "Enzo prefers direct calls over voicemail; call back within 10 minutes" },
        { preferredChannel: "Phone for urgent, Email for routine", responseTime: "Same-day response guaranteed", escalationContact: "Marco Rossi", specialNotes: "Use WhatsApp for photo updates only" },
      ],
      emphases: [
        "Focus on white glove service and damage prevention",
        "Focus on real-time communication and proactive updates",
        "Focus on premium carrier selection and transit time optimization",
        "Focus on relationship excellence — Ferrari is our flagship account",
      ],
    },
  },
  {
    id: "2",
    company: "Target Corporation",
    contact: "Sarah Mitchell",
    industry: "Retail",
    relationshipTier: "Strategic",
    lastInteraction: "45 min ago",
    activityLevel: "high",
    sentiment: { score: 88, label: "Positive" },
    contacts: [
      { name: "Sarah Mitchell", role: "Transportation Manager", email: "sarah.mitchell@target.com", phone: "+1 (612) 304-5500", preferredChannel: "Email" },
      { name: "James Rodriguez", role: "Logistics Coordinator", email: "james.rodriguez@target.com", phone: "+1 (612) 304-5501", preferredChannel: "WhatsApp" },
      { name: "Emily Chen", role: "Carrier Relations", email: "emily.chen@target.com", phone: "+1 (612) 304-5502", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Dry Van",
      defaultCommodity: "General Merchandise",
      defaultWeight: "~42,000 lbs",
      defaultAccessorials: "Lumper, Pallet Jack, Dock Delivery",
    },
    behaviors: {
      responsivenessRate: "90%",
      responsivenessDetail: "Replies within 4 hours",
      issueRate: [
        { label: "Appointment scheduling", pct: "8%" },
        { label: "Lumper fee disputes", pct: "5%" },
      ],
      conversionRate: "85%",
      volumeTrend: "+18% vs last quarter",
    },
    topics: [
      { label: "Load tracking", pct: 35 },
      { label: "Rate negotiations", pct: 30 },
      { label: "Appointment times", pct: 25 },
      { label: "Carrier performance", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 70% of the time",
      lanes: [
        { origin: "Minneapolis, MN", destination: "Los Angeles, CA", frequency: "8x/month" },
        { origin: "Chicago, IL", destination: "Dallas, TX", frequency: "6x/month" },
        { origin: "Atlanta, GA", destination: "Phoenix, AZ", frequency: "4x/month" },
        { origin: "New York, NY", destination: "Miami, FL", frequency: "3x/month" },
      ],
      dangerousGoods: "None",
      preferredCarrier: "Asset carriers with OTIF > 95%",
      tempControlled: "5% of shipments (seasonal)",
      avgWeight: "~42,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Quote Request", time: "45 min ago", summary: "RFQ for Minneapolis→LA, 20 loads per week starting March" },
      { channel: "email", action: "Load Tender", time: "3 hours ago", summary: "Tendered 5 loads Chicago→Dallas for this week" },
      { channel: "whatsapp", action: "Status Inquiry", time: "Yesterday", summary: "ETD update request for load #TGT-44821" },
      { channel: "email", action: "Carrier Assignment", time: "Yesterday", summary: "Approved Schneider for Atlanta→Phoenix lane" },
      { channel: "voice", action: "Rate Negotiation", time: "2 days ago", summary: "Discussed Q2 contract rates for core lanes" },
    ],
    insightBanner: "High-volume shipper — contract renewal in 6 weeks",
    sopPool: {
      workingNotes: [
        "Target DCs have strict appointment windows — confirm 48 hours in advance.",
        "Lumper fees must be pre-approved — get confirmation from James before authorizing.",
        "Sarah prefers consolidated weekly emails with performance metrics.",
        "Target requires OTIF > 95% — track and report weekly.",
        "Minneapolis→LA is their highest-volume lane — priority capacity allocation.",
        "All drivers must have valid TWIC cards for certain DC locations.",
        "Holiday season (Nov-Dec) requires capacity commitments 4 weeks in advance.",
        "Target has a vendor scorecard — monthly reviews with Emily Chen.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (primary), Phone for escalations only", responseTime: "Within 4 hours during business hours (CST)", escalationContact: "Emily Chen — Carrier Relations", specialNotes: "Sarah prefers weekly summary emails every Monday at 8AM CST" },
        { preferredChannel: "Email with TMS integration updates", responseTime: "Same-day response", escalationContact: "Sarah Mitchell → Target VP Supply Chain", specialNotes: "Use Target's carrier portal for all load tenders" },
      ],
      emphases: [
        "Focus on on-time delivery and appointment compliance",
        "Focus on capacity planning and rate competitiveness",
        "Focus on carrier performance metrics and scorecards",
        "Focus on contract renewal preparation and volume growth",
      ],
    },
  },
  {
    id: "3",
    company: "Caterpillar Inc.",
    contact: "Mike Johnson",
    industry: "Heavy Machinery",
    relationshipTier: "Key",
    lastInteraction: "2 hours ago",
    activityLevel: "high",
    sentiment: { score: 78, label: "Positive" },
    contacts: [
      { name: "Mike Johnson", role: "Freight Operations Manager", email: "mike.johnson@cat.com", phone: "+1 (309) 675-1000", preferredChannel: "Email" },
      { name: "Tom Williams", role: "Oversized Load Coordinator", email: "tom.williams@cat.com", phone: "+1 (309) 675-1001", preferredChannel: "Phone" },
      { name: "Rachel Green", role: "Logistics Analyst", email: "rachel.green@cat.com", phone: "+1 (309) 675-1002", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "Flatbed / Step Deck / RGN",
      defaultCommodity: "Heavy Machinery & Parts",
      defaultWeight: "~35,000 lbs (oversized loads up to 80,000 lbs)",
      defaultAccessorials: "Permits, Escorts, Crane Service",
      defaultPriority: "Standard",
    },
    behaviors: {
      responsivenessRate: "85%",
      responsivenessDetail: "Replies within 3 hours",
      issueRate: [
        { label: "Permit delays", pct: "12%" },
        { label: "Load securement issues", pct: "5%" },
      ],
      conversionRate: "76%",
      volumeTrend: "+10% vs last quarter",
    },
    topics: [
      { label: "Oversized permits", pct: 35 },
      { label: "Equipment availability", pct: 30 },
      { label: "Load tracking", pct: 25 },
      { label: "Rate inquiries", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 100% of the time (high-value equipment)",
      lanes: [
        { origin: "Peoria, IL", destination: "Houston, TX", frequency: "5x/month" },
        { origin: "Chicago, IL", destination: "Los Angeles, CA", frequency: "3x/month" },
        { origin: "Dallas, TX", destination: "Atlanta, GA", frequency: "2x/month" },
        { origin: "Denver, CO", destination: "Phoenix, AZ", frequency: "2x/month" },
      ],
      dangerousGoods: "None",
      preferredCarrier: "Specialized heavy-haul carriers with pilot cars",
      tempControlled: "None",
      avgWeight: "~35,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Quote Request", time: "2 hours ago", summary: "RFQ for oversized excavator Peoria→Houston" },
      { channel: "voice", action: "Permit Discussion", time: "5 hours ago", summary: "Tom called about multi-state permit for CA route" },
      { channel: "email", action: "Load Tender", time: "Yesterday", summary: "Tendered 3 flatbed loads Chicago→LA" },
      { channel: "whatsapp", action: "Status Inquiry", time: "Yesterday", summary: "ETD check on Dallas→Atlanta shipment" },
      { channel: "email", action: "Carrier Assignment", time: "2 days ago", summary: "Approved heavy-haul carrier for Denver→Phoenix" },
    ],
    insightBanner: "Oversized load permits requiring coordination",
    sopPool: {
      workingNotes: [
        "Caterpillar oversized loads require permits 2 weeks in advance — Tom handles all permit coordination.",
        "Peoria→Houston is their primary lane for finished equipment — priority capacity allocation.",
        "All heavy-haul moves require certified drivers and pilot car escorts.",
        "Mike prefers detailed email quotes with equipment specs and route maps.",
        "Load securement must meet DOT standards — chains and binders inspection required.",
        "Multi-state permits (especially CA, TX) require early coordination — 10+ business days.",
        "Rachel handles all analytics and reporting — monthly volume reports due by 5th.",
        "Construction season (Apr-Oct) increases volume 40% — pre-book capacity.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Mike), Phone (Tom for permits)", responseTime: "Within 3 hours during business hours (CST)", escalationContact: "Tom Williams — Oversized Load Coordinator", specialNotes: "Mike expects detailed quotes with equipment diagrams" },
        { preferredChannel: "Email for quotes, Phone for urgent permit issues", responseTime: "Same-day for permit matters", escalationContact: "Mike Johnson → CAT VP Supply Chain", specialNotes: "Weekly capacity planning call every Monday 9AM CST" },
      ],
      emphases: [
        "Focus on permit coordination and oversized load expertise",
        "Focus on equipment availability and driver certification",
        "Focus on load securement compliance and DOT standards",
        "Focus on capacity planning for construction season",
      ],
    },
  },
  {
    id: "4",
    company: "Sysco Corporation",
    contact: "Jennifer Martinez",
    industry: "Food Distribution",
    relationshipTier: "Strategic",
    lastInteraction: "30 min ago",
    activityLevel: "high",
    sentiment: { score: 92, label: "Positive" },
    contacts: [
      { name: "Jennifer Martinez", role: "Transportation Director", email: "jennifer.martinez@sysco.com", phone: "+1 (281) 584-1390", preferredChannel: "Email" },
      { name: "Carlos Reyes", role: "Cold Chain Manager", email: "carlos.reyes@sysco.com", phone: "+1 (281) 584-1391", preferredChannel: "WhatsApp" },
      { name: "Amanda Foster", role: "Carrier Procurement", email: "amanda.foster@sysco.com", phone: "+1 (281) 584-1392", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Reefer",
      defaultCommodity: "Perishable Foods & Frozen Goods",
      defaultWeight: "~40,000 lbs",
      defaultAccessorials: "Temperature Monitoring, Multi-Stop",
      defaultPriority: "Express",
      temperatureReq: "28°F to 38°F (refrigerated) / -10°F (frozen)",
    },
    behaviors: {
      responsivenessRate: "96%",
      responsivenessDetail: "Replies within 1 hour",
      issueRate: [
        { label: "Temperature excursions", pct: "3%" },
        { label: "Delivery delays", pct: "4%" },
      ],
      conversionRate: "91%",
      volumeTrend: "+22% vs last quarter",
    },
    topics: [
      { label: "Temperature monitoring", pct: 40 },
      { label: "Delivery scheduling", pct: 30 },
      { label: "Rate negotiations", pct: 20 },
      { label: "Carrier compliance", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 85% of the time",
      lanes: [
        { origin: "Houston, TX", destination: "Miami, FL", frequency: "10x/month" },
        { origin: "Dallas, TX", destination: "Atlanta, GA", frequency: "8x/month" },
        { origin: "Chicago, IL", destination: "New York, NY", frequency: "6x/month" },
        { origin: "Los Angeles, CA", destination: "Phoenix, AZ", frequency: "5x/month" },
      ],
      dangerousGoods: "None",
      preferredCarrier: "Reefer specialists with real-time temp monitoring",
      tempControlled: "100% of shipments",
      avgWeight: "~40,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Load Tender", time: "30 min ago", summary: "Tendered 12 reefer loads Houston→Miami for this week" },
      { channel: "whatsapp", action: "Temp Alert", time: "2 hours ago", summary: "Carlos flagged temp variance on load #SYS-88421" },
      { channel: "email", action: "Carrier Approval", time: "4 hours ago", summary: "Approved new reefer carrier for Chicago→NY lane" },
      { channel: "voice", action: "Rate Negotiation", time: "Yesterday", summary: "Discussed Q2 contract rates for core reefer lanes" },
      { channel: "email", action: "Performance Review", time: "2 days ago", summary: "Monthly carrier scorecard shared with Amanda" },
    ],
    insightBanner: "High-volume reefer account — temp compliance critical",
    sopPool: {
      workingNotes: [
        "All Sysco shipments require real-time temperature monitoring — no exceptions.",
        "Carlos Reyes must be notified immediately of any temp excursions above 40°F.",
        "Houston→Miami is their highest-volume lane — dedicated capacity required.",
        "Pre-cool trailers to target temp 2 hours before loading.",
        "Sysco requires FSMA compliance documentation for all food shipments.",
        "Multi-stop deliveries must maintain cold chain between stops — verify door seals.",
        "Jennifer reviews carrier scorecards monthly — OTIF > 96% required.",
        "Holiday seasons (Thanksgiving, Christmas) triple volume — book 3 weeks ahead.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Jennifer), WhatsApp (Carlos for temp alerts)", responseTime: "Within 1 hour, immediate for temp issues", escalationContact: "Carlos Reyes — Cold Chain Manager", specialNotes: "Temp excursion notifications must include time, location, and corrective action" },
        { preferredChannel: "Email with carrier portal integration", responseTime: "Same-day response guaranteed", escalationContact: "Jennifer Martinez → Sysco VP Logistics", specialNotes: "Weekly ops call Tuesday 2PM CST with Amanda" },
      ],
      emphases: [
        "Focus on temperature compliance and cold chain integrity",
        "Focus on capacity planning for perishable goods",
        "Focus on carrier performance and FSMA compliance",
        "Focus on seasonal volume planning and rate competitiveness",
      ],
    },
  },
  {
    id: "5",
    company: "Home Depot",
    contact: "Robert Thompson",
    industry: "Home Improvement Retail",
    relationshipTier: "Key",
    lastInteraction: "3 hours ago",
    activityLevel: "medium",
    sentiment: { score: 72, label: "Positive" },
    contacts: [
      { name: "Robert Thompson", role: "Inbound Logistics Manager", email: "robert.thompson@homedepot.com", phone: "+1 (770) 433-8211", preferredChannel: "Email" },
      { name: "Lisa Parker", role: "DC Operations", email: "lisa.parker@homedepot.com", phone: "+1 (770) 433-8212", preferredChannel: "Phone" },
      { name: "Steve Adams", role: "Carrier Relations", email: "steve.adams@homedepot.com", phone: "+1 (770) 433-8213", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Dry Van / Flatbed",
      defaultCommodity: "Building Materials & Hardware",
      defaultWeight: "~44,000 lbs",
      defaultAccessorials: "Liftgate, Driver Assist, Appointment Required",
      defaultPriority: "Standard",
    },
    behaviors: {
      responsivenessRate: "82%",
      responsivenessDetail: "Replies within 4 hours",
      issueRate: [
        { label: "Appointment no-shows", pct: "8%" },
        { label: "Freight damage claims", pct: "6%" },
      ],
      conversionRate: "79%",
      volumeTrend: "+8% vs last quarter",
    },
    topics: [
      { label: "Appointment scheduling", pct: 35 },
      { label: "Load tracking", pct: 28 },
      { label: "Damage claims", pct: 22 },
      { label: "Rate inquiries", pct: 15 },
    ],
    preferences: {
      insurance: "Includes 80% of the time",
      lanes: [
        { origin: "Atlanta, GA", destination: "Dallas, TX", frequency: "6x/month" },
        { origin: "Chicago, IL", destination: "Denver, CO", frequency: "4x/month" },
        { origin: "Los Angeles, CA", destination: "Phoenix, AZ", frequency: "4x/month" },
        { origin: "New York, NY", destination: "Miami, FL", frequency: "3x/month" },
      ],
      dangerousGoods: "5% of shipments (paints, chemicals)",
      preferredCarrier: "Carriers with DC delivery experience",
      tempControlled: "None",
      avgWeight: "~44,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Quote Request", time: "3 hours ago", summary: "RFQ for Atlanta→Dallas, 8 loads of lumber" },
      { channel: "voice", action: "Appointment Issue", time: "Yesterday", summary: "Lisa called about missed appointment at Denver DC" },
      { channel: "email", action: "Load Tender", time: "Yesterday", summary: "Tendered 4 flatbed loads Chicago→Denver" },
      { channel: "email", action: "Damage Claim", time: "2 days ago", summary: "Submitted claim for damaged pallet on LA→Phoenix" },
      { channel: "whatsapp", action: "Status Inquiry", time: "3 days ago", summary: "ETD update for NY→Miami shipment" },
    ],
    insightBanner: "Appointment compliance needs improvement",
    sopPool: {
      workingNotes: [
        "Home Depot DCs have strict appointment windows — confirm 72 hours in advance with Lisa.",
        "No-show rate of 8% is above tolerance — implement driver confirmation calls day before.",
        "Lumber and building materials require flatbed with proper load securement.",
        "Robert prefers email for all formal communications.",
        "Freight damage claims must be filed within 24 hours with photos.",
        "Spring season (Mar-May) increases volume 35% — book capacity early.",
        "DG shipments (paints/chemicals) require hazmat-certified drivers.",
        "Steve Adams handles all rate negotiations and carrier onboarding.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Robert), Phone (Lisa for DC issues)", responseTime: "Within 4 hours during business hours (EST)", escalationContact: "Lisa Parker — DC Operations", specialNotes: "Appointment confirmations must be sent 72h and 24h before delivery" },
        { preferredChannel: "Email with TMS updates", responseTime: "Same-day response", escalationContact: "Robert Thompson → Home Depot VP Supply Chain", specialNotes: "Weekly performance review with Steve every Friday" },
      ],
      emphases: [
        "Focus on appointment compliance and driver reliability",
        "Focus on load securement and damage prevention",
        "Focus on seasonal capacity planning",
        "Focus on carrier performance and claims reduction",
      ],
    },
  },
  {
    id: "6",
    company: "Amazon",
    contact: "David Chen",
    industry: "E-commerce",
    relationshipTier: "Strategic",
    lastInteraction: "15 min ago",
    activityLevel: "high",
    sentiment: { score: 85, label: "Positive" },
    contacts: [
      { name: "David Chen", role: "Transportation Manager", email: "david.chen@amazon.com", phone: "+1 (206) 266-1000", preferredChannel: "Email" },
      { name: "Priya Sharma", role: "Carrier Operations", email: "priya.sharma@amazon.com", phone: "+1 (206) 266-1001", preferredChannel: "WhatsApp" },
      { name: "Jason Williams", role: "Procurement Lead", email: "jason.williams@amazon.com", phone: "+1 (206) 266-1002", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Dry Van",
      defaultCommodity: "General Merchandise & Consumer Goods",
      defaultWeight: "~38,000 lbs",
      defaultAccessorials: "Drop Trailer, Detention-Free",
      defaultPriority: "Express",
    },
    behaviors: {
      responsivenessRate: "94%",
      responsivenessDetail: "Replies within 30 minutes",
      issueRate: [
        { label: "Carrier fallouts", pct: "4%" },
        { label: "Late deliveries", pct: "3%" },
      ],
      conversionRate: "88%",
      volumeTrend: "+30% vs last quarter",
    },
    topics: [
      { label: "Capacity planning", pct: 40 },
      { label: "Real-time tracking", pct: 30 },
      { label: "Rate negotiations", pct: 20 },
      { label: "Carrier compliance", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 75% of the time",
      lanes: [
        { origin: "Seattle, WA", destination: "Los Angeles, CA", frequency: "15x/month" },
        { origin: "Chicago, IL", destination: "Dallas, TX", frequency: "12x/month" },
        { origin: "Atlanta, GA", destination: "Miami, FL", frequency: "10x/month" },
        { origin: "New York, NY", destination: "Chicago, IL", frequency: "8x/month" },
      ],
      dangerousGoods: "3% of shipments (batteries, aerosols)",
      preferredCarrier: "High-capacity carriers with drop trailer capability",
      tempControlled: "5% of shipments (grocery)",
      avgWeight: "~38,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Load Tender", time: "15 min ago", summary: "Tendered 25 loads Seattle→LA for Prime Week surge" },
      { channel: "whatsapp", action: "Capacity Alert", time: "1 hour ago", summary: "Priya requested 10 additional trucks Chicago→Dallas" },
      { channel: "email", action: "Rate Negotiation", time: "4 hours ago", summary: "Jason sent RFP for Q2 contracted lanes" },
      { channel: "voice", action: "Carrier Fallout", time: "Yesterday", summary: "Emergency coverage needed for Atlanta→Miami" },
      { channel: "email", action: "Performance Report", time: "Yesterday", summary: "Weekly carrier scorecard shared with David" },
    ],
    insightBanner: "Prime Week surge — capacity critical",
    sopPool: {
      workingNotes: [
        "Amazon requires 99%+ OTIF — any fallout must be covered within 2 hours.",
        "Drop trailer program is mandatory — carriers must have extra trailer capacity.",
        "David Chen expects real-time visibility on all loads — integrate with Amazon TMS.",
        "Prime events (July, November) require 3x normal capacity — book 4 weeks ahead.",
        "Carrier fallouts are tracked meticulously — minimize at all costs.",
        "Seattle→LA is their flagship lane — dedicated capacity required.",
        "Jason handles all RFPs — respond within 48 hours with competitive rates.",
        "Priya manages day-to-day operations — WhatsApp for urgent capacity needs.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (David), WhatsApp (Priya for urgent)", responseTime: "Within 30 minutes, 5 min for fallouts", escalationContact: "Priya Sharma — Carrier Operations", specialNotes: "Carrier fallout protocol: notify immediately, provide backup within 2 hours" },
        { preferredChannel: "Email with Amazon TMS integration", responseTime: "Real-time visibility required", escalationContact: "David Chen → Amazon VP Transportation", specialNotes: "Daily capacity call during peak events at 7AM PST" },
      ],
      emphases: [
        "Focus on capacity reliability and fallout prevention",
        "Focus on real-time visibility and TMS integration",
        "Focus on drop trailer efficiency and detention reduction",
        "Focus on peak event preparation and volume scaling",
      ],
    },
  },
  {
    id: "7",
    company: "Tyson Foods",
    contact: "Maria Gonzalez",
    industry: "Food Processing",
    relationshipTier: "Key",
    lastInteraction: "1 hour ago",
    activityLevel: "medium",
    sentiment: { score: 80, label: "Positive" },
    contacts: [
      { name: "Maria Gonzalez", role: "Logistics Manager", email: "maria.gonzalez@tyson.com", phone: "+1 (479) 290-4000", preferredChannel: "Email" },
      { name: "Brian Murphy", role: "Cold Chain Coordinator", email: "brian.murphy@tyson.com", phone: "+1 (479) 290-4001", preferredChannel: "Phone" },
      { name: "Kelly White", role: "Shipping Supervisor", email: "kelly.white@tyson.com", phone: "+1 (479) 290-4002", preferredChannel: "WhatsApp" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Reefer",
      defaultCommodity: "Protein Products (Chicken, Beef, Pork)",
      defaultWeight: "~42,000 lbs",
      defaultAccessorials: "Temperature Monitoring, FSMA Compliance",
      defaultPriority: "Express",
      temperatureReq: "-10°F to 35°F depending on product",
    },
    behaviors: {
      responsivenessRate: "88%",
      responsivenessDetail: "Replies within 2 hours",
      issueRate: [
        { label: "Temperature variance", pct: "5%" },
        { label: "Transit delays", pct: "4%" },
      ],
      conversionRate: "82%",
      volumeTrend: "+15% vs last quarter",
    },
    topics: [
      { label: "Cold chain compliance", pct: 45 },
      { label: "Capacity planning", pct: 25 },
      { label: "Rate inquiries", pct: 20 },
      { label: "Load tracking", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 90% of the time",
      lanes: [
        { origin: "Springdale, AR", destination: "Dallas, TX", frequency: "8x/month" },
        { origin: "Chicago, IL", destination: "Atlanta, GA", frequency: "6x/month" },
        { origin: "Kansas City, MO", destination: "Los Angeles, CA", frequency: "5x/month" },
        { origin: "Denver, CO", destination: "Phoenix, AZ", frequency: "3x/month" },
      ],
      dangerousGoods: "None",
      preferredCarrier: "USDA-certified reefer carriers",
      tempControlled: "100% of shipments",
      avgWeight: "~42,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Load Tender", time: "1 hour ago", summary: "Tendered 6 reefer loads Springdale→Dallas" },
      { channel: "voice", action: "Temp Discussion", time: "4 hours ago", summary: "Brian called about frozen product temp specs" },
      { channel: "email", action: "Carrier Approval", time: "Yesterday", summary: "Approved new reefer carrier for KC→LA lane" },
      { channel: "whatsapp", action: "Status Inquiry", time: "Yesterday", summary: "Kelly asked for ETD on Chicago→Atlanta load" },
      { channel: "email", action: "Quote Request", time: "2 days ago", summary: "RFQ for Denver→Phoenix, 4 loads weekly" },
    ],
    insightBanner: "USDA compliance documentation required for all loads",
    sopPool: {
      workingNotes: [
        "All Tyson shipments require USDA inspection documentation — verify before pickup.",
        "Brian Murphy is the cold chain expert — loop him in on any temp questions.",
        "Springdale→Dallas is their core lane — maintain consistent capacity.",
        "Frozen products require -10°F or below — pre-cool trailers to -15°F.",
        "Fresh products (35°F) cannot be mixed with frozen on same trailer.",
        "FSMA compliance is mandatory — maintain chain of custody documentation.",
        "Maria reviews carrier performance monthly — temp excursions are tracked closely.",
        "Holiday seasons (Easter, Thanksgiving, Christmas) require advance booking.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Maria), Phone (Brian for cold chain)", responseTime: "Within 2 hours during business hours (CST)", escalationContact: "Brian Murphy — Cold Chain Coordinator", specialNotes: "Temperature variances must be reported immediately with corrective action" },
        { preferredChannel: "Email with USDA documentation attached", responseTime: "Same-day response", escalationContact: "Maria Gonzalez → Tyson VP Logistics", specialNotes: "Weekly ops call Wednesday 10AM CST with Kelly" },
      ],
      emphases: [
        "Focus on cold chain integrity and USDA compliance",
        "Focus on temperature monitoring and documentation",
        "Focus on capacity planning for protein products",
        "Focus on carrier certification and performance tracking",
      ],
    },
  },
  {
    id: "8",
    company: "General Motors",
    contact: "Patricia Brown",
    industry: "Automotive Manufacturing",
    relationshipTier: "Strategic",
    lastInteraction: "2 hours ago",
    activityLevel: "high",
    sentiment: { score: 75, label: "Positive" },
    contacts: [
      { name: "Patricia Brown", role: "Inbound Logistics Director", email: "patricia.brown@gm.com", phone: "+1 (313) 556-5000", preferredChannel: "Email" },
      { name: "Michael Torres", role: "JIT Coordinator", email: "michael.torres@gm.com", phone: "+1 (313) 556-5001", preferredChannel: "Phone" },
      { name: "Susan Lee", role: "Carrier Procurement", email: "susan.lee@gm.com", phone: "+1 (313) 556-5002", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Dry Van / Flatbed",
      defaultCommodity: "Auto Parts & Components",
      defaultWeight: "~36,000 lbs",
      defaultAccessorials: "Expedited, Team Drivers Available",
      defaultPriority: "Express (JIT Critical)",
    },
    behaviors: {
      responsivenessRate: "92%",
      responsivenessDetail: "Replies within 1 hour",
      issueRate: [
        { label: "JIT delays", pct: "6%" },
        { label: "Documentation errors", pct: "3%" },
      ],
      conversionRate: "84%",
      volumeTrend: "+12% vs last quarter",
    },
    topics: [
      { label: "JIT delivery", pct: 45 },
      { label: "Expedited shipping", pct: 25 },
      { label: "Capacity planning", pct: 20 },
      { label: "Rate inquiries", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 95% of the time",
      lanes: [
        { origin: "Detroit, MI", destination: "Dallas, TX", frequency: "10x/month" },
        { origin: "Chicago, IL", destination: "Atlanta, GA", frequency: "8x/month" },
        { origin: "Los Angeles, CA", destination: "Phoenix, AZ", frequency: "5x/month" },
        { origin: "Cleveland, OH", destination: "Kansas City, MO", frequency: "4x/month" },
      ],
      dangerousGoods: "10% of shipments (batteries, fluids)",
      preferredCarrier: "Expedited carriers with team driver capability",
      tempControlled: "None",
      avgWeight: "~36,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "Expedite Request", time: "2 hours ago", summary: "Urgent expedite Detroit→Dallas, assembly line critical" },
      { channel: "voice", action: "JIT Coordination", time: "4 hours ago", summary: "Michael called about production window for Chicago→Atlanta" },
      { channel: "email", action: "Load Tender", time: "Yesterday", summary: "Tendered 8 loads Detroit→Dallas for this week" },
      { channel: "email", action: "Carrier RFP", time: "2 days ago", summary: "Susan sent RFP for Q2 expedited lanes" },
      { channel: "whatsapp", action: "Status Inquiry", time: "2 days ago", summary: "ETD update for LA→Phoenix auto parts" },
    ],
    insightBanner: "JIT critical — production line impact for delays",
    sopPool: {
      workingNotes: [
        "GM JIT deliveries must arrive within 30-minute windows — no exceptions.",
        "Michael Torres handles all production schedule coordination — call him first for timing.",
        "Detroit→Dallas is their highest-priority lane — team drivers required for express.",
        "Assembly line shutdowns cost $50K+/minute — treat JIT delays as critical.",
        "Patricia expects proactive communication on any potential delays.",
        "Expedited shipments require backup carrier identified before dispatch.",
        "DG shipments (batteries, fluids) require certified handlers.",
        "New EV production lines increasing Chicago→Atlanta volume significantly.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Patricia), Phone (Michael for JIT)", responseTime: "Within 1 hour, immediate for JIT", escalationContact: "Michael Torres — JIT Coordinator", specialNotes: "JIT delays must be escalated immediately with backup plan" },
        { preferredChannel: "Email with real-time tracking integration", responseTime: "Priority for all production-critical loads", escalationContact: "Patricia Brown → GM VP Supply Chain", specialNotes: "Daily JIT status call at 6AM EST during production weeks" },
      ],
      emphases: [
        "Focus on JIT precision and production schedule alignment",
        "Focus on expedited capability and team driver availability",
        "Focus on proactive communication and delay prevention",
        "Focus on capacity scaling for EV production growth",
      ],
    },
  },
  {
    id: "9",
    company: "Michelin",
    contact: "William Dupont",
    industry: "Tire Manufacturing",
    relationshipTier: "Key",
    lastInteraction: "1 hour ago",
    activityLevel: "medium",
    sentiment: { score: 84, label: "Positive" },
    contacts: [
      { name: "William Dupont", role: "Logistics Manager", email: "william.dupont@michelin.com", phone: "+1 (864) 458-5000", preferredChannel: "Email" },
      { name: "Sophie Martin", role: "Supply Chain Coordinator", email: "sophie.martin@michelin.com", phone: "+1 (864) 458-5001", preferredChannel: "WhatsApp" },
      { name: "Pierre Leclerc", role: "Distribution Manager", email: "pierre.leclerc@michelin.com", phone: "+1 (864) 458-5002", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultEquipment: "53' Dry Van / Flatbed",
      defaultCommodity: "Tires & Rubber Products",
      defaultWeight: "~40,000 lbs",
      defaultAccessorials: "Strapping, Load Bars, Dock Delivery",
      defaultPriority: "Standard",
    },
    behaviors: {
      responsivenessRate: "89%",
      responsivenessDetail: "Replies within 3 hours",
      issueRate: [
        { label: "Load shifting", pct: "4%" },
        { label: "Delivery timing", pct: "6%" },
      ],
      conversionRate: "81%",
      volumeTrend: "+12% vs last quarter",
    },
    topics: [
      { label: "ETA tracking", pct: 40 },
      { label: "Capacity planning", pct: 25 },
      { label: "Rate negotiations", pct: 20 },
      { label: "Load optimization", pct: 15 },
    ],
    preferences: {
      insurance: "Includes 85% of the time",
      lanes: [
        { origin: "Greenville, SC", destination: "Detroit, MI", frequency: "6x/month" },
        { origin: "Greenville, SC", destination: "Chicago, IL", frequency: "5x/month" },
        { origin: "Greenville, SC", destination: "Los Angeles, CA", frequency: "4x/month" },
        { origin: "Greenville, SC", destination: "Dallas, TX", frequency: "3x/month" },
      ],
      dangerousGoods: "None",
      preferredCarrier: "Carriers with tire handling experience",
      tempControlled: "None",
      avgWeight: "~40,000 lbs",
    },
    recentActivity: [
      { channel: "email", action: "ETA Request", time: "1 hour ago", summary: "William requested ETA update for Detroit shipment CEVA-1357" },
      { channel: "email", action: "Load Tender", time: "4 hours ago", summary: "Tendered 4 loads Greenville→Chicago" },
      { channel: "whatsapp", action: "Status Inquiry", time: "Yesterday", summary: "Sophie asked for POD on LA delivery" },
      { channel: "voice", action: "Rate Discussion", time: "2 days ago", summary: "Discussed Q2 lane rates with Pierre" },
      { channel: "email", action: "Booking Confirmed", time: "3 days ago", summary: "Confirmed 3 loads Greenville→Dallas" },
    ],
    insightBanner: "Key automotive supplier — ETA visibility important",
    sopPool: {
      workingNotes: [
        "Michelin tires require proper stacking and strapping — max 3 high for passenger tires.",
        "William prefers email for all communications with detailed tracking links.",
        "Greenville→Detroit is their highest-volume lane serving automotive plants.",
        "JIT deliveries to auto plants must arrive within 2-hour windows.",
        "Load bars required to prevent tire shifting during transit.",
        "Sophie handles day-to-day tracking — WhatsApp for quick updates.",
        "Pierre manages distribution strategy — involve for contract discussions.",
        "Tire loads are volume-sensitive — cubing out before weight typically.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (William), WhatsApp (Sophie for tracking)", responseTime: "Within 3 hours during business hours (EST)", escalationContact: "Pierre Leclerc — Distribution Manager", specialNotes: "William expects detailed ETA updates with tracking links" },
        { preferredChannel: "Email with tracking portal access", responseTime: "Same-day response guaranteed", escalationContact: "William Dupont → Michelin VP Logistics", specialNotes: "Weekly ops review call Thursday 10AM EST" },
      ],
      emphases: [
        "Focus on ETA visibility and proactive tracking updates",
        "Focus on proper tire handling and load securement",
        "Focus on JIT delivery precision for automotive plants",
        "Focus on capacity planning and rate competitiveness",
      ],
    },
  },
];

// --- Utility Components ---

function ActivityDot({ level }: { level: "high" | "medium" | "low" }) {
  const color =
    level === "high"
      ? "bg-emerald-500"
      : level === "medium"
        ? "bg-amber-500"
        : "bg-zinc-400";
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
  );
}

function SentimentBadge({ sentiment }: { sentiment: Customer["sentiment"] }) {
  const config = {
    Positive: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    Neutral: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    "Needs Attention": { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  }[sentiment.label];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", config.bg, config.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {sentiment.score}
    </span>
  );
}

function ChannelIcon({ channel }: { channel: "email" | "whatsapp" | "voice" }) {
  switch (channel) {
    case "email":
      return <Mail className="h-4 w-4 text-[#003366] dark:text-[#4D7CA8]" />;
    case "whatsapp":
      return <MessageSquare className="h-4 w-4 text-emerald-500" />;
    case "voice":
      return <Phone className="h-4 w-4 text-violet-500" />;
  }
}

function TopicBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="text-zinc-500 dark:text-zinc-400">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#003366] dark:bg-[#4D7CA8] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full bg-[#003366] dark:bg-[#4D7CA8]" />
      <span className="text-[#003366] dark:text-[#4D7CA8]">{icon}</span>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
    </div>
  );
}

function LanePill({ lane }: { lane: { origin: string; destination: string; frequency: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          "bg-[#003366]/10 dark:bg-[#4D7CA8]/20 text-[#003366] dark:text-[#4D7CA8]",
          "border border-[#003366]/20 dark:border-[#4D7CA8]/30",
          "hover:bg-[#003366]/20 dark:hover:bg-[#4D7CA8]/30"
        )}
      >
        <Truck className="h-3 w-3" />
        {lane.origin}→{lane.destination}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-white dark:bg-[#24273A] border border-[#E8EAED] dark:border-[#3A3F52] rounded-lg shadow-lg p-3 min-w-[180px]">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Origin</span>
              <span className="font-medium text-zinc-900 dark:text-white">{lane.origin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Destination</span>
              <span className="font-medium text-zinc-900 dark:text-white">{lane.destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Frequency</span>
              <span className="font-medium text-zinc-900 dark:text-white">{lane.frequency}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Page ---

export default function ContactsPage() {
  const [selectedId, setSelectedId] = useState(customers[0].id);
  const [activeTab, setActiveTab] = useState<"insights" | "activity" | "sop" | "ai">("insights");
  const [searchQuery, setSearchQuery] = useState("");
  const [generatedSOP, setGeneratedSOP] = useState<SOPGenerated | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);

  const selected = customers.find((c) => c.id === selectedId)!;

  const generateSOP = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const pool = selected.sopPool;
      // Shuffle and pick 4 working notes
      const shuffledNotes = [...pool.workingNotes].sort(() => Math.random() - 0.5);
      const pickedNotes = shuffledNotes.slice(0, 4);
      // Pick 1 random communicationPrefs
      const pickedComm = pool.communicationPrefs[Math.floor(Math.random() * pool.communicationPrefs.length)];
      // Pick 1 random emphasis
      const pickedEmphasis = pool.emphases[Math.floor(Math.random() * pool.emphases.length)];
      setGeneratedSOP({
        workingNotes: pickedNotes,
        communicationPrefs: pickedComm,
        emphasis: pickedEmphasis,
      });
      setIsGenerating(false);
    }, 1500);
  };
  const filteredCustomers = customers.filter(
    (c) =>
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#1A1D29]">
      {/* Header */}
      <div className="border-b border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-lg bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-[#003366] dark:text-[#4D7CA8]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[#003366] dark:text-white">
            Contact Intelligence
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Customer insights, communication analytics & SOPs
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left — Customer List */}
        <div className="w-[320px] shrink-0 border-r border-[#E8EAED] dark:border-[#3A3F52] overflow-y-auto bg-[#FAFBFC] dark:bg-[#24273A]">
          <div className="p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E8EAED] dark:border-[#3A3F52] bg-white dark:bg-[#1F2232] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:focus:ring-[#4D7CA8] focus:border-transparent"
              />
            </div>
            <div className="space-y-1">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setGeneratedSOP(null);
                    setChatMessages([]);
                    setChatInput("");
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-lg transition-all",
                    selectedId === c.id
                      ? "bg-white dark:bg-[#1F2232] ring-2 ring-[#003366] dark:ring-[#4D7CA8] shadow-sm"
                      : "hover:bg-white dark:hover:bg-[#1F2232] border border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {c.company}
                    </span>
                    <SentimentBadge sentiment={c.sentiment} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {c.contact}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      {c.lastInteraction}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Detail Panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-[#E8EAED] dark:border-[#3A3F52] px-6 flex items-center gap-1 shrink-0 bg-[#FAFBFC] dark:bg-[#24273A]">
            {/* Agent Chat Tab — first position */}
            <button
              onClick={() => setActiveTab("ai")}
              className={cn(
                "mr-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                activeTab === "ai"
                  ? "bg-[#003366] dark:bg-[#4D7CA8] text-white shadow-lg shadow-[#003366]/25 dark:shadow-[#4D7CA8]/25"
                  : "bg-[#003366]/10 dark:bg-[#4D7CA8]/20 text-[#003366] dark:text-[#4D7CA8] border border-[#003366]/30 dark:border-[#4D7CA8]/40 hover:bg-[#003366]/20 dark:hover:bg-[#4D7CA8]/30"
              )}
            >
              <Sparkles className="h-4 w-4" />
              Agent Chat
            </button>
            {(
              [
                { key: "insights", label: "Intelligence Insights" },
                { key: "activity", label: "Recent Activity" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === t.key
                    ? "border-[#003366] dark:border-[#4D7CA8] text-[#003366] dark:text-[#4D7CA8]"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {t.label}
              </button>
            ))}
            {/* SOP Tab */}
            <button
              onClick={() => setActiveTab("sop")}
              className={cn(
                "ml-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                activeTab === "sop"
                  ? "bg-[#003366] dark:bg-[#4D7CA8] text-white shadow-lg shadow-[#003366]/25 dark:shadow-[#4D7CA8]/25"
                  : "bg-[#003366]/10 dark:bg-[#4D7CA8]/20 text-[#003366] dark:text-[#4D7CA8] border border-[#003366]/30 dark:border-[#4D7CA8]/40 hover:bg-[#003366]/20 dark:hover:bg-[#4D7CA8]/30"
              )}
            >
              <FileText className="h-4 w-4" />
              Customer SOP
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium",
                "bg-[#003366] dark:bg-[#4D7CA8] text-white"
              )}>
                {selected.relationshipTier}
              </span>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {selected.company}
              </span>
            </div>
          </div>

          {/* Tab Content */}
          <div className={cn("flex-1 min-h-0", activeTab === "ai" ? "flex flex-col" : "overflow-y-auto p-6")}>
            {activeTab === "ai" ? (
              <AskAITab
                customer={selected}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatStreaming={isChatStreaming}
                setIsChatStreaming={setIsChatStreaming}
              />
            ) : activeTab === "insights" ? (
              <InsightsTab customer={selected} />
            ) : activeTab === "activity" ? (
              <ActivityTab customer={selected} />
            ) : generatedSOP === null && !isGenerating ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center p-10 rounded-2xl border-2 border-dashed border-[#003366]/30 dark:border-[#4D7CA8]/30 bg-[#003366]/5 dark:bg-[#4D7CA8]/5 max-w-md w-full">
                  <div className="h-16 w-16 rounded-2xl bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center mx-auto mb-5">
                    <FileText className="h-8 w-8 text-[#003366] dark:text-[#4D7CA8]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#003366] dark:text-white mb-2">
                    Generate Customer SOP
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Generate a tailored Standard Operating Procedure for {selected.company} based on their communication preferences, working notes, and operational history.
                  </p>
                  <button
                    onClick={generateSOP}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#003366] dark:bg-[#4D7CA8] text-white hover:opacity-90 transition-all shadow-lg shadow-[#003366]/25 dark:shadow-[#4D7CA8]/25"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Generate SOP
                  </button>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center p-10 rounded-2xl border border-[#003366]/20 dark:border-[#4D7CA8]/20 bg-[#FAFBFC] dark:bg-[#24273A] max-w-md w-full">
                  <div className="h-16 w-16 rounded-2xl bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center mx-auto mb-5 relative">
                    <div className="absolute inset-0 rounded-2xl border-2 border-[#003366]/30 dark:border-[#4D7CA8]/30 animate-pulse" />
                    <RefreshCw className="h-8 w-8 text-[#003366] dark:text-[#4D7CA8] animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#003366] dark:text-white mb-2">
                    Generating SOP
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    Analyzing {selected.company}&apos;s communication patterns, preferences, and operational history...
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#003366] dark:bg-[#4D7CA8] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-[#003366] dark:bg-[#4D7CA8] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-[#003366] dark:bg-[#4D7CA8] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            ) : (
              <SOPTab customer={selected} sop={generatedSOP!} onRegenerate={generateSOP} isRegenerating={isGenerating} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Agent Chat Tab ---

function serializeCustomerContext(customer: Customer): string {
  const lines: string[] = [];
  lines.push(`Company: ${customer.company}`);
  lines.push(`Industry: ${customer.industry}`);
  lines.push(`Relationship Tier: ${customer.relationshipTier}`);
  lines.push(`Primary Contact: ${customer.contact}`);
  lines.push(`Last Interaction: ${customer.lastInteraction}`);
  lines.push(`Activity Level: ${customer.activityLevel}`);
  lines.push(`Sentiment: ${customer.sentiment.score}/100 (${customer.sentiment.label})`);
  lines.push(`Insight: ${customer.insightBanner}`);
  lines.push("");
  lines.push("Contacts:");
  customer.contacts.forEach((c) => {
    lines.push(`  - ${c.name}, ${c.role}, ${c.email}, ${c.phone}, Preferred: ${c.preferredChannel}`);
  });
  lines.push("");
  lines.push("Behaviors:");
  lines.push(`  Responsiveness: ${customer.behaviors.responsivenessRate} (${customer.behaviors.responsivenessDetail})`);
  lines.push(`  Conversion Rate: ${customer.behaviors.conversionRate}`);
  lines.push(`  Volume Trend: ${customer.behaviors.volumeTrend}`);
  customer.behaviors.issueRate.forEach((ir) => {
    lines.push(`  Issue: ${ir.label} — ${ir.pct}`);
  });
  lines.push("");
  lines.push("Common Topics:");
  customer.topics.forEach((t) => {
    lines.push(`  ${t.label}: ${t.pct}%`);
  });
  lines.push("");
  lines.push("Preferences:");
  lines.push(`  Insurance: ${customer.preferences.insurance}`);
  lines.push(`  DG: ${customer.preferences.dangerousGoods}`);
  lines.push(`  Preferred Carrier: ${customer.preferences.preferredCarrier}`);
  lines.push(`  Temp-Controlled: ${customer.preferences.tempControlled}`);
  lines.push(`  Avg Weight: ${customer.preferences.avgWeight}`);
  lines.push("  Lanes:");
  customer.preferences.lanes.forEach((l) => {
    lines.push(`    ${l.origin} → ${l.destination} (${l.frequency})`);
  });
  lines.push("");
  lines.push("Quote Defaults:");
  const qd = customer.quoteDefaults;
  lines.push(`  Incoterm: ${qd.defaultIncoterm}, Commodity: ${qd.defaultCommodity}, Packaging: ${qd.defaultPackaging}`);
  lines.push(`  Insurance: ${qd.defaultInsurance}, Stackable: ${qd.defaultStackable}, Priority: ${qd.defaultPriority}`);
  lines.push(`  Temperature: ${qd.temperatureReq}, DG: ${qd.dgClassification}`);
  lines.push("");
  lines.push("Recent Activity:");
  customer.recentActivity.forEach((a) => {
    lines.push(`  [${a.channel}] ${a.action} (${a.time}): ${a.summary}`);
  });
  lines.push("");
  lines.push("SOP Working Notes:");
  customer.sopPool.workingNotes.forEach((n) => {
    lines.push(`  - ${n}`);
  });
  return lines.join("\n");
}

function AskAITab({
  customer,
  chatMessages,
  setChatMessages,
  chatInput,
  setChatInput,
  isChatStreaming,
  setIsChatStreaming,
}: {
  customer: Customer;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  isChatStreaming: boolean;
  setIsChatStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isChatStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setIsChatStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setChatMessages([...updatedMessages, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          customerContext: serializeCustomerContext(customer),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setChatMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `Error: ${err.error || "Failed to get response"}` };
          return copy;
        });
        setIsChatStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setChatMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + text,
          };
          return copy;
        });
      }
    } catch {
      setChatMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Error: Failed to connect to AI service." };
        return copy;
      });
    } finally {
      setIsChatStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  const suggestionChips = [
    "What are the top issues?",
    "Summarize recent activity",
    "Who are the key contacts?",
    "What are the preferred lanes?",
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6">
        {chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center max-w-md w-full">
              <div className="h-16 w-16 rounded-2xl bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="h-8 w-8 text-[#003366] dark:text-[#4D7CA8]" />
              </div>
              <h3 className="text-lg font-semibold text-[#003366] dark:text-white mb-2">
                Chat with your Agents about {customer.company}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Ask questions about this customer&apos;s activity, contacts, preferences, sentiment, and more.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#003366]/10 dark:bg-[#4D7CA8]/20 text-[#003366] dark:text-[#4D7CA8] border border-[#003366]/20 dark:border-[#4D7CA8]/30 hover:bg-[#003366]/20 dark:hover:bg-[#4D7CA8]/30 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#003366] dark:text-[#4D7CA8]" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-[#003366] dark:bg-[#4D7CA8] text-white rounded-br-md"
                      : "bg-[#FAFBFC] dark:bg-[#24273A] text-zinc-800 dark:text-zinc-200 border border-[#E8EAED] dark:border-[#3A3F52] rounded-bl-md"
                  )}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.content === "" && isChatStreaming && (
                    <span className="inline-flex items-center gap-1 ml-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#003366] dark:bg-[#4D7CA8] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#003366] dark:bg-[#4D7CA8] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#003366] dark:bg-[#4D7CA8] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${customer.company}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-white dark:bg-[#1F2232] px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#003366] dark:focus:ring-[#4D7CA8] focus:border-transparent"
          />
          <button
            onClick={() => sendMessage(chatInput)}
            disabled={!chatInput.trim() || isChatStreaming}
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-all shrink-0",
              chatInput.trim() && !isChatStreaming
                ? "bg-[#003366] dark:bg-[#4D7CA8] text-white hover:opacity-90 shadow-lg shadow-[#003366]/25 dark:shadow-[#4D7CA8]/25"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Insights Tab ---

function InsightsTab({ customer }: { customer: Customer }) {
  const b = customer.behaviors;
  const p = customer.preferences;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Sentiment Card */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<Star className="h-4 w-4" />} title="Customer Sentiment" />
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold",
              customer.sentiment.label === "Positive" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
              customer.sentiment.label === "Neutral" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
              "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            )}>
              {customer.sentiment.score}
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">{customer.sentiment.label}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">Average sentiment score</div>
            </div>
          </div>
          <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                customer.sentiment.score >= 75 ? "bg-emerald-500" :
                customer.sentiment.score >= 50 ? "bg-amber-500" :
                "bg-red-500"
              )}
              style={{ width: `${customer.sentiment.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Customer Behaviors */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="Customer Behaviors" />
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Responsiveness" value={b.responsivenessRate} detail={b.responsivenessDetail} />
          <Stat label="Quote → Booking" value={b.conversionRate} detail="Conversion rate" />
          <div className="col-span-2 flex flex-wrap gap-3">
            <StatPill
              icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              text={`Volume: ${b.volumeTrend}`}
            />
            {b.issueRate.map((ir) => (
              <StatPill
                key={ir.label}
                icon={<AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                text={`${ir.label}: ${ir.pct}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Key Contacts */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<UserCircle className="h-4 w-4" />} title="Key Contacts" />
        <div className="space-y-3">
          {customer.contacts.map((c) => (
            <div key={c.email} className="flex items-center gap-4 p-3 rounded-lg bg-white dark:bg-[#1F2232] border border-[#E8EAED] dark:border-[#3A3F52]">
              <div className="h-10 w-10 rounded-full bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-[#003366] dark:text-[#4D7CA8]">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-white">{c.name}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{c.role}</div>
              </div>
              <div className="text-right text-xs space-y-0.5 shrink-0">
                <div className="text-zinc-600 dark:text-zinc-300">{c.email}</div>
                <div className="text-zinc-500 dark:text-zinc-400">{c.phone}</div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium shrink-0",
                c.preferredChannel === "Email" ? "bg-[#003366]/10 dark:bg-[#4D7CA8]/20 text-[#003366] dark:text-[#4D7CA8]" :
                c.preferredChannel === "WhatsApp" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
              )}>
                {c.preferredChannel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Common Questions & Topics */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<Search className="h-4 w-4" />} title="Common Questions & Topics" />
        <div className="space-y-3">
          {customer.topics.map((t) => (
            <TopicBar key={t.label} label={t.label} pct={t.pct} />
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<Shield className="h-4 w-4" />} title="Preferences" />
        <div className="space-y-4">
          {/* Lanes as pills */}
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Common Lanes</div>
            <div className="flex flex-wrap gap-2">
              {p.lanes.map((lane) => (
                <LanePill key={`${lane.origin}-${lane.destination}`} lane={lane} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <PrefRow icon={<Shield className="h-3.5 w-3.5" />} label="Insurance" value={p.insurance} />
            <PrefRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="Dangerous Goods" value={p.dangerousGoods} />
            <PrefRow icon={<Package className="h-3.5 w-3.5" />} label="Preferred Carrier" value={p.preferredCarrier} />
            <PrefRow icon={<Thermometer className="h-3.5 w-3.5" />} label="Temp-Controlled" value={p.tempControlled} />
            <PrefRow icon={<Weight className="h-3.5 w-3.5" />} label="Avg Shipment Weight" value={p.avgWeight} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg bg-white dark:bg-[#1F2232] border border-[#E8EAED] dark:border-[#3A3F52] p-3">
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-[#003366] dark:text-[#4D7CA8]">{value}</div>
      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{detail}</div>
    </div>
  );
}

function StatPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1F2232] text-xs text-zinc-600 dark:text-zinc-300 border border-[#E8EAED] dark:border-[#3A3F52]">
      {icon}
      {text}
    </span>
  );
}

function PrefRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#003366] dark:text-[#4D7CA8] mt-0.5">{icon}</span>
      <div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="text-zinc-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}

// --- Activity Tab ---

function ActivityTab({ customer }: { customer: Customer }) {
  return (
    <div className="space-y-4 max-w-3xl">
      {/* Insight Banner */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm text-amber-800 dark:text-amber-300">
          {customer.insightBanner}
        </span>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {customer.recentActivity.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 rounded-lg border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] hover:bg-white dark:hover:bg-[#1F2232] transition-colors"
          >
            <div className="mt-0.5">
              <ChannelIcon channel={a.channel} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ActionBadge action={a.action} />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {a.time}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 truncate">
                {a.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    "Quote Request": "bg-[#003366]/10 text-[#003366] dark:bg-[#4D7CA8]/20 dark:text-[#4D7CA8]",
    "Booking Confirmed": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Status Inquiry": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    "Documentation Submitted": "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    "Rate Inquiry": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    "Issue Report": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Schedule Change": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded text-xs font-medium",
        colorMap[action] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      )}
    >
      {action}
    </span>
  );
}

// --- SOP Tab ---

function SOPTab({ customer, sop, onRegenerate, isRegenerating }: { customer: Customer; sop: SOPGenerated; onRegenerate: () => void; isRegenerating: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = buildSOPText(customer, sop);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* SOP Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#003366] dark:text-white">
            Standard Operating Procedure
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {customer.company} &middot; {sop.emphasis}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              copied
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700"
                : "bg-white dark:bg-[#1F2232] text-zinc-600 dark:text-zinc-300 border-[#E8EAED] dark:border-[#3A3F52] hover:bg-zinc-50 dark:hover:bg-[#24273A]"
            )}
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy SOP"}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#003366] dark:bg-[#4D7CA8] text-white hover:opacity-90 transition-all",
              isRegenerating && "opacity-70 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {/* 1. Customer Overview */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<Globe className="h-4 w-4" />} title="Customer Overview" />
        <div className="grid grid-cols-2 gap-4">
          <SOPField label="Company" value={customer.company} />
          <SOPField label="Industry" value={customer.industry} />
          <SOPField label="Relationship Tier" value={customer.relationshipTier} />
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Average Sentiment</div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-sm font-semibold",
                customer.sentiment.label === "Positive" ? "text-emerald-600 dark:text-emerald-400" :
                customer.sentiment.label === "Neutral" ? "text-amber-600 dark:text-amber-400" :
                "text-red-600 dark:text-red-400"
              )}>
                {customer.sentiment.score}/100
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">({customer.sentiment.label})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Contacts */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<Users className="h-4 w-4" />} title="Key Contacts" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8EAED] dark:border-[#3A3F52]">
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">Role</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">Phone</th>
                <th className="text-left py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Channel</th>
              </tr>
            </thead>
            <tbody>
              {customer.contacts.map((c) => (
                <tr key={c.email} className="border-b border-[#E8EAED]/50 dark:border-[#3A3F52]/50 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-zinc-900 dark:text-white">{c.name}</td>
                  <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">{c.role}</td>
                  <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">{c.email}</td>
                  <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-300">{c.phone}</td>
                  <td className="py-2.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium",
                      c.preferredChannel === "Email" ? "bg-[#003366]/10 dark:bg-[#4D7CA8]/20 text-[#003366] dark:text-[#4D7CA8]" :
                      c.preferredChannel === "WhatsApp" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" :
                      "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                    )}>
                      {c.preferredChannel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Default Quote Parameters */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<FileText className="h-4 w-4" />} title="Default Quote Parameters" />
        <div className="space-y-4">
          {/* Preferred Lanes */}
          <div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Preferred Lanes</div>
            <div className="space-y-1.5">
              {customer.preferences.lanes.map((lane) => (
                <div key={`${lane.origin}-${lane.destination}`} className="flex items-center gap-3 text-sm">
                  <span className="font-mono font-medium text-[#003366] dark:text-[#4D7CA8]">{lane.origin}</span>
                  <span className="text-zinc-400">→</span>
                  <span className="font-mono font-medium text-[#003366] dark:text-[#4D7CA8]">{lane.destination}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">({lane.frequency})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E8EAED]/50 dark:border-[#3A3F52]/50">
            <SOPField label="Default Equipment" value={customer.quoteDefaults.defaultEquipment} />
            <SOPField label="Default Commodity" value={customer.quoteDefaults.defaultCommodity} />
            <SOPField label="Average Weight" value={customer.quoteDefaults.defaultWeight} />
            <SOPField label="Accessorials" value={customer.quoteDefaults.defaultAccessorials} />
            <SOPField label="Priority Level" value={customer.quoteDefaults.defaultPriority} />
            {customer.quoteDefaults.temperatureReq && (
              <SOPField label="Temperature Requirements" value={customer.quoteDefaults.temperatureReq} />
            )}
          </div>
        </div>
      </div>

      {/* 4. Communication Preferences */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<MessageSquare className="h-4 w-4" />} title="Communication Preferences" />
        <div className="grid grid-cols-2 gap-4">
          <SOPField label="Preferred Channel" value={sop.communicationPrefs.preferredChannel} />
          <SOPField label="Response Time Expectations" value={sop.communicationPrefs.responseTime} />
          <SOPField label="Escalation Contact" value={sop.communicationPrefs.escalationContact} />
          <SOPField label="Special Notes" value={sop.communicationPrefs.specialNotes} />
        </div>
      </div>

      {/* 5. Working Notes & Special Instructions */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<AlertCircle className="h-4 w-4" />} title="Working Notes & Special Instructions" />
        <div className="space-y-2">
          {sop.workingNotes.map((note, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-[#1F2232] border border-[#E8EAED] dark:border-[#3A3F52]">
              <div className="h-5 w-5 rounded-full bg-[#003366]/10 dark:bg-[#4D7CA8]/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-[#003366] dark:text-[#4D7CA8]">{i + 1}</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Historical Performance */}
      <div className="rounded-xl border border-[#E8EAED] dark:border-[#3A3F52] bg-[#FAFBFC] dark:bg-[#24273A] p-5">
        <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="Historical Performance" />
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white dark:bg-[#1F2232] border border-[#E8EAED] dark:border-[#3A3F52] p-3 text-center">
            <div className="text-xl font-bold text-[#003366] dark:text-[#4D7CA8]">{customer.behaviors.conversionRate}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Conversion Rate</div>
          </div>
          <div className="rounded-lg bg-white dark:bg-[#1F2232] border border-[#E8EAED] dark:border-[#3A3F52] p-3 text-center">
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{customer.behaviors.volumeTrend.split(" ")[0]}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Volume Trend</div>
          </div>
          <div className="rounded-lg bg-white dark:bg-[#1F2232] border border-[#E8EAED] dark:border-[#3A3F52] p-3 text-center">
            <div className="text-sm font-medium text-zinc-900 dark:text-white space-y-0.5">
              {customer.behaviors.issueRate.map((ir) => (
                <div key={ir.label} className="text-xs">
                  <span className="text-amber-600 dark:text-amber-400">{ir.pct}</span>{" "}
                  <span className="text-zinc-500 dark:text-zinc-400">{ir.label}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Issue Patterns</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SOPField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">{label}</div>
      <div className="text-sm text-zinc-900 dark:text-white">{value}</div>
    </div>
  );
}

function buildSOPText(customer: Customer, variant: SOPGenerated): string {
  const lines: string[] = [];
  lines.push(`STANDARD OPERATING PROCEDURE — ${customer.company}`);
  lines.push(`${"=".repeat(50)}`);
  lines.push("");
  lines.push("1. CUSTOMER OVERVIEW");
  lines.push(`   Company: ${customer.company}`);
  lines.push(`   Industry: ${customer.industry}`);
  lines.push(`   Relationship Tier: ${customer.relationshipTier}`);
  lines.push(`   Average Sentiment: ${customer.sentiment.score}/100 (${customer.sentiment.label})`);
  lines.push("");
  lines.push("2. KEY CONTACTS");
  customer.contacts.forEach((c) => {
    lines.push(`   - ${c.name} | ${c.role} | ${c.email} | ${c.phone} | Pref: ${c.preferredChannel}`);
  });
  lines.push("");
  lines.push("3. DEFAULT QUOTE PARAMETERS");
  lines.push(`   Preferred Lanes:`);
  customer.preferences.lanes.forEach((l) => {
    lines.push(`     ${l.origin} → ${l.destination} (${l.frequency})`);
  });
  lines.push(`   Equipment: ${customer.quoteDefaults.defaultEquipment}`);
  lines.push(`   Commodity: ${customer.quoteDefaults.defaultCommodity}`);
  lines.push(`   Average Weight: ${customer.quoteDefaults.defaultWeight}`);
  lines.push(`   Accessorials: ${customer.quoteDefaults.defaultAccessorials}`);
  lines.push(`   Priority: ${customer.quoteDefaults.defaultPriority}`);
  if (customer.quoteDefaults.temperatureReq) {
    lines.push(`   Temperature: ${customer.quoteDefaults.temperatureReq}`);
  }
  lines.push("");
  lines.push("4. COMMUNICATION PREFERENCES");
  lines.push(`   Channel: ${variant.communicationPrefs.preferredChannel}`);
  lines.push(`   Response Time: ${variant.communicationPrefs.responseTime}`);
  lines.push(`   Escalation: ${variant.communicationPrefs.escalationContact}`);
  lines.push(`   Notes: ${variant.communicationPrefs.specialNotes}`);
  lines.push("");
  lines.push("5. WORKING NOTES & SPECIAL INSTRUCTIONS");
  variant.workingNotes.forEach((n, i) => {
    lines.push(`   ${i + 1}. ${n}`);
  });
  lines.push("");
  lines.push("6. HISTORICAL PERFORMANCE");
  lines.push(`   Conversion Rate: ${customer.behaviors.conversionRate}`);
  lines.push(`   Volume Trend: ${customer.behaviors.volumeTrend}`);
  customer.behaviors.issueRate.forEach((ir) => {
    lines.push(`   Issue: ${ir.label} — ${ir.pct}`);
  });
  return lines.join("\n");
}
