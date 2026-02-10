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
  Plane,
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
  defaultIncoterm: string;
  defaultCommodity: string;
  defaultPackaging: string;
  defaultInsurance: string;
  defaultStackable: string;
  defaultPriority: string;
  temperatureReq: string;
  dgClassification: string;
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
    company: "Novartis AG",
    contact: "Thomas Weber",
    industry: "Pharmaceuticals",
    relationshipTier: "Strategic",
    lastInteraction: "2 hours ago",
    activityLevel: "high",
    sentiment: { score: 82, label: "Positive" },
    contacts: [
      { name: "Thomas Weber", role: "Logistics Manager", email: "t.weber@novartis.com", phone: "+41 61 324 1111", preferredChannel: "Email" },
      { name: "Anna Müller", role: "Supply Chain Director", email: "a.mueller@novartis.com", phone: "+41 61 324 2222", preferredChannel: "Phone" },
      { name: "David Kessler", role: "Shipping Coordinator", email: "d.kessler@novartis.com", phone: "+41 61 324 3333", preferredChannel: "WhatsApp" },
    ],
    quoteDefaults: {
      defaultIncoterm: "CIF",
      defaultCommodity: "Pharmaceutical Products",
      defaultPackaging: "Pallets (GDP-compliant)",
      defaultInsurance: "110% cargo value",
      defaultStackable: "No",
      defaultPriority: "Express",
      temperatureReq: "2-8°C controlled",
      dgClassification: "Class 6.1 (occasional)",
    },
    behaviors: {
      responsivenessRate: "92%",
      responsivenessDetail: "Replies within 2 hours",
      issueRate: [
        { label: "Missing paperwork", pct: "12%" },
        { label: "Late documentation", pct: "8%" },
      ],
      conversionRate: "78%",
      volumeTrend: "+15% vs last quarter",
    },
    topics: [
      { label: "Visibility / tracking", pct: 45 },
      { label: "Rate inquiries", pct: 25 },
      { label: "Documentation status", pct: 20 },
      { label: "Schedule changes", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 95% of the time",
      lanes: [
        { origin: "SIN", destination: "LAX", frequency: "4x/month" },
        { origin: "HKG", destination: "JFK", frequency: "3x/month" },
        { origin: "PVG", destination: "ORD", frequency: "2x/month" },
        { origin: "AMS", destination: "MIA", frequency: "1x/month" },
      ],
      dangerousGoods: "8% of shipments",
      preferredCarrier: "Cathay Cargo, Singapore Airlines Cargo",
      tempControlled: "22% of shipments",
      avgWeight: "~2,400 kg",
    },
    recentActivity: [
      { channel: "email", action: "Quote Request", time: "2 hours ago", summary: "Requested rate for SIN→LAX, 1,800 kg pharma cargo" },
      { channel: "whatsapp", action: "Status Inquiry", time: "5 hours ago", summary: "Asked for ETD update on AWB 618-4521 9087" },
      { channel: "voice", action: "Booking Confirmed", time: "Yesterday", summary: "Confirmed booking for 3 pallets HKG→JFK, Cathay CX234" },
      { channel: "email", action: "Documentation Submitted", time: "Yesterday", summary: "Sent commercial invoice and packing list for SHP-2847" },
      { channel: "whatsapp", action: "Status Inquiry", time: "2 days ago", summary: "Tracking request for PVG→ORD shipment, AWB 297-1123 4455" },
      { channel: "email", action: "Rate Inquiry", time: "2 days ago", summary: "Requested spot rate comparison AMS→MIA for next week" },
      { channel: "voice", action: "Issue Report", time: "3 days ago", summary: "Reported missing AWB copy for shipment SHP-2831" },
      { channel: "email", action: "Quote Request", time: "3 days ago", summary: "RFQ for recurring PVG→ORD lane, 2,000 kg weekly" },
      { channel: "whatsapp", action: "Schedule Change", time: "4 days ago", summary: "Notified of flight change, rebooked to CX110 next day" },
      { channel: "email", action: "Booking Confirmed", time: "5 days ago", summary: "Confirmed 4 skids SIN→LAX on SQ12, temp-controlled" },
    ],
    insightBanner: "2 tracking requests in the last 48 hours",
    sopPool: {
      workingNotes: [
        "Always confirm DG paperwork 48 hours before departure for Class 6.1 shipments.",
        "Thomas prefers email confirmations with PDF attachments for all booking confirmations.",
        "GDP-compliant packaging must be verified with the shipper before every temp-controlled booking.",
        "Novartis requires a dedicated account review call every first Monday of the month.",
        "SIN→LAX lane has strict TSA screening requirements — allow extra 4h handling time.",
        "Novartis finance team requires proforma invoices 72h before shipment departure.",
        "For HKG→JFK, always request Cathay CX direct flights — client rejects transshipment.",
        "David Kessler handles all DG declarations; loop him in immediately on any DG bookings.",
        "Q2 volume increase expected — pre-book SIN→LAX capacity 2 weeks ahead.",
        "Novartis compliance requires all AWBs to include GDP certification numbers.",
        "AMS→MIA lane is seasonal — confirm space availability before quoting.",
        "Thomas will escalate to Anna if response time exceeds 3 hours on urgent requests.",
        "Novartis is evaluating competitor forwarders — prioritize service quality this quarter.",
        "Recent mislabeling incident on PVG→ORD requires extra QC checks on that lane.",
        "Insurance claims process: contact Anna directly, not Thomas, for claims > $50K.",
        "Year-end audit preparation: ensure all documentation is digitized and accessible.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (primary), Phone for escalations", responseTime: "Within 2 hours during business hours (CET)", escalationContact: "Anna Müller — Supply Chain Director", specialNotes: "Thomas prefers structured email threads with subject line prefixes [NVS-{AWB}]" },
        { preferredChannel: "Email (primary), WhatsApp for urgent updates", responseTime: "Same-day response guaranteed", escalationContact: "Anna Müller — Supply Chain Director", specialNotes: "Use WhatsApp group 'Novartis Ops' for real-time tracking updates" },
        { preferredChannel: "Email with CC to logistics team DL", responseTime: "2-hour SLA during CET business hours", escalationContact: "Anna Müller — direct line +41 61 324 2222", specialNotes: "Monthly volume report due by 5th of each month" },
        { preferredChannel: "Email (formal), Phone for relationship management", responseTime: "Priority response — within 1 hour", escalationContact: "Anna Müller + Regional VP if unresolved in 4h", specialNotes: "Schedule quarterly business reviews — next QBR in 6 weeks" },
      ],
      emphases: [
        "Focus on temperature compliance and documentation accuracy",
        "Focus on carrier selection and transit time optimization",
        "Focus on capacity planning and proactive communication",
        "Focus on relationship retention and service quality metrics",
      ],
    },
  },
  {
    id: "2",
    company: "Samsung Electronics",
    contact: "Jin-soo Park",
    industry: "Consumer Electronics",
    relationshipTier: "Strategic",
    lastInteraction: "30 min ago",
    activityLevel: "high",
    sentiment: { score: 75, label: "Positive" },
    contacts: [
      { name: "Jin-soo Park", role: "Global Logistics Lead", email: "js.park@samsung.com", phone: "+82 2 2255 1001", preferredChannel: "WhatsApp" },
      { name: "Min-ji Lee", role: "Trade Compliance Manager", email: "mj.lee@samsung.com", phone: "+82 2 2255 1002", preferredChannel: "Email" },
      { name: "Hyun-woo Kim", role: "Freight Operations", email: "hw.kim@samsung.com", phone: "+82 2 2255 1003", preferredChannel: "WhatsApp" },
    ],
    quoteDefaults: {
      defaultIncoterm: "FOB",
      defaultCommodity: "Consumer Electronics",
      defaultPackaging: "Cartons on pallets",
      defaultInsurance: "100% cargo value",
      defaultStackable: "No",
      defaultPriority: "Standard",
      temperatureReq: "Ambient (15-25°C)",
      dgClassification: "Class 9 – Lithium batteries",
    },
    behaviors: {
      responsivenessRate: "88%",
      responsivenessDetail: "Replies within 3 hours",
      issueRate: [
        { label: "Customs delays", pct: "15%" },
        { label: "Weight discrepancies", pct: "5%" },
      ],
      conversionRate: "82%",
      volumeTrend: "+22% vs last quarter",
    },
    topics: [
      { label: "Visibility / tracking", pct: 38 },
      { label: "Rate inquiries", pct: 30 },
      { label: "Documentation status", pct: 18 },
      { label: "Schedule changes", pct: 14 },
    ],
    preferences: {
      insurance: "Includes 80% of the time",
      lanes: [
        { origin: "ICN", destination: "JFK", frequency: "5x/month" },
        { origin: "ICN", destination: "LAX", frequency: "4x/month" },
        { origin: "NRT", destination: "SFO", frequency: "2x/month" },
        { origin: "HKG", destination: "ORD", frequency: "2x/month" },
      ],
      dangerousGoods: "3% of shipments",
      preferredCarrier: "Korean Air Cargo, ANA Cargo",
      tempControlled: "10% of shipments",
      avgWeight: "~3,100 kg",
    },
    recentActivity: [
      { channel: "whatsapp", action: "Status Inquiry", time: "30 min ago", summary: "Asked for customs clearance status on ICN→JFK shipment" },
      { channel: "email", action: "Quote Request", time: "3 hours ago", summary: "RFQ for ICN→LAX, 2,500 kg consumer electronics" },
      { channel: "voice", action: "Booking Confirmed", time: "Yesterday", summary: "Confirmed booking for NRT→SFO, ANA NH106" },
      { channel: "email", action: "Documentation Submitted", time: "Yesterday", summary: "Uploaded SLI and lithium battery declaration" },
      { channel: "whatsapp", action: "Rate Inquiry", time: "2 days ago", summary: "Requested contract rate renewal for ICN→JFK lane" },
      { channel: "email", action: "Issue Report", time: "2 days ago", summary: "Weight discrepancy flagged on AWB 180-8844 3312" },
      { channel: "voice", action: "Quote Request", time: "3 days ago", summary: "Discussed spot rates for peak season ICN→LAX" },
      { channel: "email", action: "Booking Confirmed", time: "4 days ago", summary: "Booked 6 pallets ICN→LAX, Korean Air KE011" },
      { channel: "whatsapp", action: "Schedule Change", time: "4 days ago", summary: "Flight delay notification, rebooked NRT→SFO" },
      { channel: "email", action: "Status Inquiry", time: "5 days ago", summary: "Requested POD for delivered HKG→ORD shipment" },
    ],
    insightBanner: "3 rate inquiries in the last 5 days",
    sopPool: {
      workingNotes: [
        "All Samsung shipments containing lithium batteries require UN38.3 test reports — verify before booking.",
        "Jin-soo prefers WhatsApp for quick confirmations but requires email for formal documentation.",
        "ICN→JFK is their highest-volume lane — negotiate block space agreements quarterly.",
        "Weight discrepancies are a recurring issue — always request verified weights before AWB issuance.",
        "Samsung has a strict vendor scorecard — on-time delivery rate must stay above 95%.",
        "Peak season (Q4) requires capacity reservation 3 weeks in advance for ICN→LAX.",
        "Hyun-woo handles day-to-day operations; loop Jin-soo only for strategic decisions.",
        "Customs pre-clearance at JFK reduces delays — coordinate with broker 48h before arrival.",
        "Samsung requires dual-language documentation (Korean + English) for all ICN origin shipments.",
        "NRT→SFO lane uses ANA exclusively — Samsung has a corporate contract with preferred rates.",
        "Customs delays at JFK account for 15% of issues — pre-file ISF 72 hours before departure.",
        "Min-ji must sign off on all DG declarations before they are submitted to the airline.",
        "Samsung is expanding HKG→ORD volume — prepare capacity plan for next quarter.",
        "New product launch in Q3 will spike ICN→LAX volume by 40% — early notification expected.",
        "Jin-soo mentioned interest in consolidated shipment options to reduce per-unit costs.",
        "Annual contract renewal is in March — prepare competitive rate proposal by mid-February.",
      ],
      communicationPrefs: [
        { preferredChannel: "WhatsApp (quick updates), Email (formal)", responseTime: "Within 3 hours (KST business hours)", escalationContact: "Min-ji Lee — Trade Compliance", specialNotes: "Jin-soo is available on WhatsApp until 10PM KST" },
        { preferredChannel: "WhatsApp group 'Samsung Freight Ops'", responseTime: "Same-day response, priority queue", escalationContact: "Jin-soo Park → Samsung VP Logistics", specialNotes: "Weekly ops call every Tuesday 10AM KST" },
        { preferredChannel: "Email with structured subject: [SEC-{PO#}]", responseTime: "2-hour SLA for active shipments", escalationContact: "Min-ji Lee — direct line for compliance issues", specialNotes: "Document all communication in Samsung's freight portal" },
        { preferredChannel: "Email for proposals, WhatsApp for day-to-day", responseTime: "Priority during product launch windows", escalationContact: "Jin-soo Park — strategic escalation path", specialNotes: "Prepare quarterly business review presentation with KPI dashboard" },
      ],
      emphases: [
        "Focus on DG compliance for lithium battery shipments",
        "Focus on on-time performance and capacity management",
        "Focus on documentation accuracy and customs compliance",
        "Focus on growth planning and contract renewal preparation",
      ],
    },
  },
  {
    id: "3",
    company: "Roche Diagnostics",
    contact: "Marcus Schmidt",
    industry: "Medical Diagnostics",
    relationshipTier: "Strategic",
    lastInteraction: "Yesterday",
    activityLevel: "medium",
    sentiment: { score: 90, label: "Positive" },
    contacts: [
      { name: "Marcus Schmidt", role: "Senior Logistics Manager", email: "marcus.schmidt@roche.com", phone: "+41 61 688 4001", preferredChannel: "Email" },
      { name: "Elena Vogt", role: "Cold Chain Specialist", email: "elena.vogt@roche.com", phone: "+41 61 688 4002", preferredChannel: "Phone" },
      { name: "Felix Braun", role: "DG Compliance Officer", email: "felix.braun@roche.com", phone: "+41 61 688 4003", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultIncoterm: "DDP",
      defaultCommodity: "Diagnostic Equipment & Reagents",
      defaultPackaging: "Pallets (GDP + cold chain)",
      defaultInsurance: "120% cargo value",
      defaultStackable: "No",
      defaultPriority: "Express",
      temperatureReq: "2-8°C strict cold chain",
      dgClassification: "Class 6.2 (diagnostic specimens)",
    },
    behaviors: {
      responsivenessRate: "95%",
      responsivenessDetail: "Replies within 1 hour",
      issueRate: [
        { label: "Missing paperwork", pct: "6%" },
        { label: "Mislabeled cargo", pct: "4%" },
      ],
      conversionRate: "85%",
      volumeTrend: "+8% vs last quarter",
    },
    topics: [
      { label: "Visibility / tracking", pct: 50 },
      { label: "Rate inquiries", pct: 20 },
      { label: "Documentation status", pct: 15 },
      { label: "Schedule changes", pct: 15 },
    ],
    preferences: {
      insurance: "Includes 98% of the time",
      lanes: [
        { origin: "PVG", destination: "LAX", frequency: "3x/month" },
        { origin: "HKG", destination: "ORD", frequency: "2x/month" },
        { origin: "SIN", destination: "JFK", frequency: "2x/month" },
        { origin: "BKK", destination: "MIA", frequency: "1x/month" },
      ],
      dangerousGoods: "12% of shipments",
      preferredCarrier: "Cathay Cargo, Thai Cargo",
      tempControlled: "30% of shipments",
      avgWeight: "~1,800 kg",
    },
    recentActivity: [
      { channel: "email", action: "Documentation Submitted", time: "Yesterday", summary: "Submitted DG declaration for PVG→LAX diagnostic equipment" },
      { channel: "voice", action: "Booking Confirmed", time: "Yesterday", summary: "Confirmed temp-controlled booking HKG→ORD" },
      { channel: "whatsapp", action: "Status Inquiry", time: "2 days ago", summary: "Tracking update request for SIN→JFK AWB 618-7722 1100" },
      { channel: "email", action: "Quote Request", time: "2 days ago", summary: "RFQ for BKK→MIA, 1,200 kg lab reagents (temp-sensitive)" },
      { channel: "email", action: "Rate Inquiry", time: "3 days ago", summary: "Requested volume discount for Q2 PVG→LAX" },
      { channel: "voice", action: "Issue Report", time: "4 days ago", summary: "Mislabeled cargo flagged at HKG hub" },
      { channel: "whatsapp", action: "Schedule Change", time: "4 days ago", summary: "Requested earlier departure for SIN→JFK" },
      { channel: "email", action: "Booking Confirmed", time: "5 days ago", summary: "Booked 2 pallets BKK→MIA, Thai TG640" },
      { channel: "email", action: "Status Inquiry", time: "6 days ago", summary: "Delivery confirmation request for PVG→LAX" },
      { channel: "whatsapp", action: "Quote Request", time: "1 week ago", summary: "Quick quote needed for HKG→ORD, 800 kg" },
    ],
    insightBanner: "2 questions about departure time this week",
    sopPool: {
      workingNotes: [
        "All Roche shipments require cold chain validation certificates — never book without confirmation from Elena.",
        "Marcus is extremely responsive — leverage this for quick turnaround on documentation.",
        "DG shipments (Class 6.2) require Felix's sign-off minimum 72 hours before departure.",
        "Roche mandates real-time temperature monitoring on all cold chain shipments.",
        "PVG→LAX lane handles highest-value cargo — always assign premium handling.",
        "Roche's insurance requirement of 120% is non-negotiable — build into all quotes.",
        "BKK→MIA is a newer lane — Roche is testing reliability before committing to regular volume.",
        "Mislabeling incidents must be reported to Felix within 2 hours of discovery.",
        "Roche Diagnostics is expanding into Southeast Asian markets — expect increased SIN→JFK volume.",
        "Cold chain excursion protocol: immediate notification to Elena + hold shipment pending instructions.",
        "HKG→ORD lane requires USDA pre-clearance for diagnostic reagents.",
        "Marcus schedules a weekly ops review every Wednesday at 9AM CET — prepare status updates.",
        "Roche is evaluating end-to-end visibility platforms — demonstrate our tracking capabilities.",
        "Annual compliance audit in Q1 — ensure all DG documentation is audit-ready.",
        "Felix requires updated SDS sheets for all DG shipments every 6 months.",
        "Consider offering dedicated cold chain monitoring dashboard as value-add service.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Marcus), Phone (Elena for cold chain)", responseTime: "Within 1 hour during CET business hours", escalationContact: "Elena Vogt — Cold Chain Specialist", specialNotes: "Marcus expects detailed milestone emails at each shipment stage" },
        { preferredChannel: "Email chain with all 3 contacts CC'd", responseTime: "1-hour SLA, 30 min for cold chain alerts", escalationContact: "Marcus Schmidt → Roche Global Logistics VP", specialNotes: "Use Roche's incident reporting template for any deviations" },
        { preferredChannel: "Email with weekly ops call supplement", responseTime: "Priority — 1 hour max", escalationContact: "Elena Vogt for cold chain, Felix Braun for DG", specialNotes: "Provide weekly KPI report: on-time, temp excursions, documentation accuracy" },
        { preferredChannel: "Formal email for compliance, phone for urgent", responseTime: "Within 1 hour — no exceptions for cold chain", escalationContact: "Felix Braun + Roche Quality Assurance team", specialNotes: "Prepare for Q1 compliance audit — documentation review due in 4 weeks" },
      ],
      emphases: [
        "Focus on cold chain integrity and DG compliance",
        "Focus on premium handling and incident management",
        "Focus on operational excellence and expansion support",
        "Focus on compliance readiness and technology value-adds",
      ],
    },
  },
  {
    id: "4",
    company: "BMW Group",
    contact: "Laura Fischer",
    industry: "Automotive",
    relationshipTier: "Key",
    lastInteraction: "3 hours ago",
    activityLevel: "high",
    sentiment: { score: 58, label: "Needs Attention" },
    contacts: [
      { name: "Laura Fischer", role: "Import/Export Manager", email: "laura.fischer@bmw.com", phone: "+49 89 382 5001", preferredChannel: "Email" },
      { name: "Stefan Hartmann", role: "Customs Broker Liaison", email: "s.hartmann@bmw.com", phone: "+49 89 382 5002", preferredChannel: "Phone" },
      { name: "Katrin Wolff", role: "Parts Logistics Coordinator", email: "k.wolff@bmw.com", phone: "+49 89 382 5003", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultIncoterm: "FCA",
      defaultCommodity: "Automotive Parts & Components",
      defaultPackaging: "Heavy-duty pallets + crates",
      defaultInsurance: "100% cargo value",
      defaultStackable: "Yes (select items)",
      defaultPriority: "Standard",
      temperatureReq: "Ambient",
      dgClassification: "Class 3 (paints/coatings, occasional)",
    },
    behaviors: {
      responsivenessRate: "90%",
      responsivenessDetail: "Replies within 2.5 hours",
      issueRate: [
        { label: "Customs holds", pct: "10%" },
        { label: "Documentation errors", pct: "7%" },
      ],
      conversionRate: "74%",
      volumeTrend: "+5% vs last quarter",
    },
    topics: [
      { label: "Visibility / tracking", pct: 40 },
      { label: "Rate inquiries", pct: 28 },
      { label: "Documentation status", pct: 22 },
      { label: "Schedule changes", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 88% of the time",
      lanes: [
        { origin: "FRA", destination: "JFK", frequency: "4x/month" },
        { origin: "MUC", destination: "LAX", frequency: "3x/month" },
        { origin: "AMS", destination: "ORD", frequency: "2x/month" },
        { origin: "CDG", destination: "MIA", frequency: "1x/month" },
      ],
      dangerousGoods: "5% of shipments",
      preferredCarrier: "Lufthansa Cargo, Air France Cargo",
      tempControlled: "15% of shipments",
      avgWeight: "~2,900 kg",
    },
    recentActivity: [
      { channel: "email", action: "Quote Request", time: "3 hours ago", summary: "RFQ for FRA→JFK, 3,200 kg automotive parts" },
      { channel: "whatsapp", action: "Status Inquiry", time: "6 hours ago", summary: "Customs status check for MUC→LAX shipment" },
      { channel: "voice", action: "Issue Report", time: "Yesterday", summary: "Customs hold reported on AMS→ORD, missing EUR1" },
      { channel: "email", action: "Booking Confirmed", time: "Yesterday", summary: "Confirmed 5 pallets CDG→MIA, AF681" },
      { channel: "email", action: "Documentation Submitted", time: "2 days ago", summary: "Sent corrected invoice for FRA→JFK" },
      { channel: "whatsapp", action: "Rate Inquiry", time: "2 days ago", summary: "Contract rate discussion for MUC→LAX lane" },
      { channel: "voice", action: "Booking Confirmed", time: "3 days ago", summary: "Phone booking for AMS→ORD, LH8162" },
      { channel: "email", action: "Schedule Change", time: "3 days ago", summary: "Requested CDG→MIA date change to next Monday" },
      { channel: "email", action: "Status Inquiry", time: "4 days ago", summary: "POD request for delivered FRA→JFK auto parts" },
      { channel: "whatsapp", action: "Quote Request", time: "5 days ago", summary: "Quick quote for MUC→LAX, 1,500 kg prototype parts" },
    ],
    insightBanner: "Customs issue flagged — follow up recommended",
    sopPool: {
      workingNotes: [
        "BMW customs holds are frequently due to missing EUR1 certificates — always verify before departure.",
        "Laura prefers email for all formal communications; use phone only for urgent customs issues.",
        "Stefan is the primary contact for all customs-related escalations at German airports.",
        "FRA→JFK is the most time-sensitive lane — BMW production schedules depend on JIT delivery.",
        "BMW Group has a zero-tolerance policy for documentation errors — double-check all HS codes.",
        "MUC→LAX lane: always book Lufthansa direct — BMW rejects routings through third-party hubs.",
        "Katrin manages day-to-day parts logistics; involve Laura only for strategic or escalation matters.",
        "Heavy-duty packaging requirements: BMW parts require minimum 200kg pallet load rating.",
        "AMS→ORD customs issues recurring — consider switching to pre-clearance program.",
        "BMW production shutdowns cost €1M+/hour — treat any delay on JIT lanes as critical.",
        "CDG→MIA is their lowest-priority lane — flexible on transit time but strict on cost.",
        "Documentation error rate of 7% is above BMW's 5% threshold — implement checklist.",
        "BMW is consolidating forwarder panel — demonstrate value to retain strategic status.",
        "New electric vehicle parts require specific DG handling (Class 9 lithium) — prepare capability.",
        "Annual rate review in September — begin benchmarking in July.",
        "Stefan recommended implementing automated customs pre-filing to reduce hold rates.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (formal), Phone for customs emergencies", responseTime: "Within 2.5 hours during CET business hours", escalationContact: "Stefan Hartmann — Customs Broker Liaison", specialNotes: "Laura requires weekly customs clearance status report every Friday" },
        { preferredChannel: "Email to Katrin for ops, Laura for strategy", responseTime: "2-hour SLA for active shipments", escalationContact: "Laura Fischer → BMW Group Procurement VP", specialNotes: "Use BMW's SAP reference numbers in all communications" },
        { preferredChannel: "Email with BMW tracking portal integration", responseTime: "Priority for JIT lanes, standard for others", escalationContact: "Stefan for customs, Laura for commercial", specialNotes: "Implement documentation checklist to reduce error rate below 5%" },
        { preferredChannel: "Formal email with monthly performance reports", responseTime: "Within 2 hours for production-critical shipments", escalationContact: "Laura Fischer + BMW Procurement for contract discussions", specialNotes: "Prepare forwarder scorecard presentation for Q3 review" },
      ],
      emphases: [
        "Focus on customs compliance and documentation accuracy",
        "Focus on carrier routing requirements and packaging standards",
        "Focus on reducing documentation errors and customs delays",
        "Focus on relationship retention and service improvement KPIs",
      ],
    },
  },
  {
    id: "5",
    company: "LVMH",
    contact: "Pierre Dupont",
    industry: "Luxury Goods",
    relationshipTier: "Key",
    lastInteraction: "4 hours ago",
    activityLevel: "medium",
    sentiment: { score: 65, label: "Neutral" },
    contacts: [
      { name: "Pierre Dupont", role: "Logistics Director", email: "p.dupont@lvmh.com", phone: "+33 1 44 13 2001", preferredChannel: "WhatsApp" },
      { name: "Marie Laurent", role: "Shipping Coordinator", email: "m.laurent@lvmh.com", phone: "+33 1 44 13 2002", preferredChannel: "Email" },
      { name: "Jean-Luc Martin", role: "Security & Compliance", email: "jl.martin@lvmh.com", phone: "+33 1 44 13 2003", preferredChannel: "Phone" },
    ],
    quoteDefaults: {
      defaultIncoterm: "CIF",
      defaultCommodity: "Luxury Goods & High-Value Accessories",
      defaultPackaging: "Custom security packaging",
      defaultInsurance: "150% declared value",
      defaultStackable: "No",
      defaultPriority: "Express",
      temperatureReq: "Ambient (controlled humidity)",
      dgClassification: "N/A",
    },
    behaviors: {
      responsivenessRate: "86%",
      responsivenessDetail: "Replies within 4 hours",
      issueRate: [
        { label: "Late documentation", pct: "14%" },
        { label: "Address corrections", pct: "6%" },
      ],
      conversionRate: "71%",
      volumeTrend: "+18% vs last quarter",
    },
    topics: [
      { label: "Visibility / tracking", pct: 35 },
      { label: "Rate inquiries", pct: 32 },
      { label: "Documentation status", pct: 25 },
      { label: "Schedule changes", pct: 8 },
    ],
    preferences: {
      insurance: "Includes 99% of the time",
      lanes: [
        { origin: "CDG", destination: "JFK", frequency: "5x/month" },
        { origin: "CDG", destination: "LAX", frequency: "3x/month" },
        { origin: "MXP", destination: "MIA", frequency: "2x/month" },
        { origin: "LHR", destination: "ORD", frequency: "1x/month" },
      ],
      dangerousGoods: "2% of shipments",
      preferredCarrier: "Air France Cargo, Delta Cargo",
      tempControlled: "18% of shipments",
      avgWeight: "~2,100 kg",
    },
    recentActivity: [
      { channel: "email", action: "Quote Request", time: "4 hours ago", summary: "RFQ for CDG→JFK, 1,900 kg luxury goods (high-value)" },
      { channel: "voice", action: "Rate Inquiry", time: "Yesterday", summary: "Discussed volume pricing CDG→LAX for Q2" },
      { channel: "whatsapp", action: "Status Inquiry", time: "Yesterday", summary: "Tracking request MXP→MIA, AWB 057-3344 2211" },
      { channel: "email", action: "Booking Confirmed", time: "2 days ago", summary: "Booked 3 pallets MXP→MIA, AF662" },
      { channel: "email", action: "Documentation Submitted", time: "2 days ago", summary: "Late submission of packing list for CDG→JFK" },
      { channel: "whatsapp", action: "Schedule Change", time: "3 days ago", summary: "Flight change notification acknowledged" },
      { channel: "voice", action: "Booking Confirmed", time: "3 days ago", summary: "Phone booking CDG→LAX, DL901" },
      { channel: "email", action: "Issue Report", time: "4 days ago", summary: "Address correction needed for MXP→MIA consignee" },
      { channel: "email", action: "Status Inquiry", time: "5 days ago", summary: "Requested milestone updates for LHR→ORD" },
      { channel: "whatsapp", action: "Quote Request", time: "6 days ago", summary: "Urgent quote CDG→JFK, 500 kg high-value accessories" },
    ],
    insightBanner: "Documentation submitted late twice this week",
    sopPool: {
      workingNotes: [
        "Pierre prefers WhatsApp for urgent updates — respond within 30 minutes on WhatsApp.",
        "All LVMH shipments require enhanced security handling — no unattended cargo at any point.",
        "Insurance at 150% is mandatory and non-negotiable for all luxury goods shipments.",
        "Late documentation is a recurring pattern — send reminders 48h before cutoff.",
        "CDG→JFK is LVMH's flagship lane — assign senior ops handler for every shipment.",
        "High-value cargo (>€100K) requires Jean-Luc's security sign-off before booking.",
        "Marie handles all documentation — send her reminders 72h, 48h, and 24h before cutoff.",
        "LVMH prefers Air France for CDG origin — brand alignment is important to them.",
        "MXP→MIA lane serves Italian luxury brands — special handling for fashion/leather goods.",
        "Address correction rate of 6% is high — implement address verification step at booking.",
        "LVMH fashion week periods (Feb, Sep) generate 3x normal volume — plan capacity ahead.",
        "LHR→ORD is a new lane — LVMH testing for UK-origin luxury goods post-Brexit.",
        "LVMH volume growing 18% — position for tier upgrade to Strategic by demonstrating reliability.",
        "Pierre mentioned interest in dedicated tracking portal for LVMH shipments.",
        "Consider offering white-glove delivery service for ultra-high-value consignments.",
        "Year-end holiday season is peak — reserve CDG→JFK capacity starting October.",
      ],
      communicationPrefs: [
        { preferredChannel: "WhatsApp (Pierre), Email (Marie for docs)", responseTime: "Within 4 hours, 30 min for WhatsApp urgent", escalationContact: "Jean-Luc Martin — Security & Compliance", specialNotes: "Pierre prefers WhatsApp for urgent updates, email for formal records" },
        { preferredChannel: "WhatsApp for updates, Email for documentation", responseTime: "Same-day for standard, 1-hour for high-value", escalationContact: "Pierre Dupont → LVMH VP Supply Chain", specialNotes: "Use 'LVMH Priority' tag in all internal handling instructions" },
        { preferredChannel: "Email with structured tracking updates", responseTime: "Within 3 hours during CET business hours", escalationContact: "Jean-Luc for security, Marie for documentation", specialNotes: "Provide photo documentation of cargo handling for high-value shipments" },
        { preferredChannel: "Monthly strategic review + daily WhatsApp ops", responseTime: "Priority response during peak seasons", escalationContact: "Pierre Dupont for strategic, Jean-Luc for security", specialNotes: "Prepare proposal for dedicated LVMH tracking dashboard" },
      ],
      emphases: [
        "Focus on security handling and documentation timeliness",
        "Focus on premium service and brand-aligned carrier selection",
        "Focus on handling quality and seasonal capacity planning",
        "Focus on relationship growth and value-added services",
      ],
    },
  },
  {
    id: "6",
    company: "Flex Ltd.",
    contact: "Sarah Chen",
    industry: "Electronics Manufacturing",
    relationshipTier: "Standard",
    lastInteraction: "1 day ago",
    activityLevel: "low",
    sentiment: { score: 88, label: "Positive" },
    contacts: [
      { name: "Sarah Chen", role: "Freight Manager", email: "sarah.chen@flex.com", phone: "+65 6890 7001", preferredChannel: "Email" },
      { name: "Kevin Tan", role: "Warehouse Operations", email: "kevin.tan@flex.com", phone: "+65 6890 7002", preferredChannel: "WhatsApp" },
      { name: "Lisa Wong", role: "Procurement Specialist", email: "lisa.wong@flex.com", phone: "+65 6890 7003", preferredChannel: "Email" },
    ],
    quoteDefaults: {
      defaultIncoterm: "FOB",
      defaultCommodity: "Electronic Components & PCBs",
      defaultPackaging: "Cartons on pallets (ESD-safe)",
      defaultInsurance: "100% cargo value",
      defaultStackable: "Yes",
      defaultPriority: "Standard",
      temperatureReq: "Ambient (humidity controlled)",
      dgClassification: "Class 9 (occasional, lithium cells)",
    },
    behaviors: {
      responsivenessRate: "94%",
      responsivenessDetail: "Replies within 1.5 hours",
      issueRate: [
        { label: "Missing paperwork", pct: "4%" },
        { label: "Rate disputes", pct: "3%" },
      ],
      conversionRate: "88%",
      volumeTrend: "+3% vs last quarter",
    },
    topics: [
      { label: "Visibility / tracking", pct: 52 },
      { label: "Rate inquiries", pct: 22 },
      { label: "Documentation status", pct: 16 },
      { label: "Schedule changes", pct: 10 },
    ],
    preferences: {
      insurance: "Includes 92% of the time",
      lanes: [
        { origin: "PVG", destination: "SFO", frequency: "3x/month" },
        { origin: "HKG", destination: "SEA", frequency: "2x/month" },
        { origin: "TPE", destination: "LAX", frequency: "2x/month" },
        { origin: "NRT", destination: "ORD", frequency: "1x/month" },
      ],
      dangerousGoods: "6% of shipments",
      preferredCarrier: "EVA Air Cargo, China Airlines Cargo",
      tempControlled: "25% of shipments",
      avgWeight: "~2,700 kg",
    },
    recentActivity: [
      { channel: "email", action: "Booking Confirmed", time: "1 day ago", summary: "Confirmed 4 pallets PVG→SFO, BR12 electronics components" },
      { channel: "whatsapp", action: "Status Inquiry", time: "1 day ago", summary: "Tracking update for HKG→SEA, AWB 695-5566 7788" },
      { channel: "voice", action: "Quote Request", time: "2 days ago", summary: "Discussed TPE→LAX rates for circuit board shipment" },
      { channel: "email", action: "Documentation Submitted", time: "2 days ago", summary: "Sent all docs for NRT→ORD DG shipment" },
      { channel: "email", action: "Rate Inquiry", time: "3 days ago", summary: "Annual contract renewal discussion PVG→SFO" },
      { channel: "whatsapp", action: "Schedule Change", time: "3 days ago", summary: "Acknowledged HKG→SEA schedule adjustment" },
      { channel: "voice", action: "Booking Confirmed", time: "4 days ago", summary: "Phone booking TPE→LAX, CI6" },
      { channel: "email", action: "Status Inquiry", time: "5 days ago", summary: "Delivery confirmation for NRT→ORD" },
      { channel: "email", action: "Quote Request", time: "6 days ago", summary: "RFQ for PVG→SFO, 3,500 kg server components" },
      { channel: "whatsapp", action: "Issue Report", time: "1 week ago", summary: "Minor rate discrepancy on last invoice" },
    ],
    insightBanner: "Contract renewal discussion in progress",
    sopPool: {
      workingNotes: [
        "Flex values consistency and reliability over speed — standard priority is the norm.",
        "Sarah is highly responsive and organized — mirror her communication style (concise, structured).",
        "ESD-safe packaging verification required for all electronic component shipments.",
        "Kevin manages warehouse scheduling — coordinate pickup times directly with him.",
        "PVG→SFO is Flex's primary lane — maintain 98%+ on-time rate to retain business.",
        "Contract renewal is in progress — Lisa Wong handles procurement; prepare competitive rates.",
        "Flex has a vendor management system — update shipment status there as well as email.",
        "HKG→SEA volume may increase with new Seattle distribution center opening Q3.",
        "TPE→LAX lane uses EVA Air exclusively — Flex has a corporate deal; use BR code flights only.",
        "NRT→ORD DG shipments require Flex's own DG declaration template — do not substitute.",
        "Rate disputes (3%) are usually minor invoice discrepancies — resolve within 48 hours.",
        "Sarah appreciates proactive communication about potential delays before they happen.",
        "Flex is a model customer — low issue rate, high conversion; use as reference for process benchmarking.",
        "Lisa mentioned potential for TPE→LAX volume doubling with new product line in Q4.",
        "Consider offering Flex preferential rates to lock in long-term contract during renewal.",
        "Kevin's warehouse operates 6AM-10PM SGT — schedule pickups within this window.",
      ],
      communicationPrefs: [
        { preferredChannel: "Email (Sarah), WhatsApp (Kevin for warehouse)", responseTime: "Within 1.5 hours during SGT business hours", escalationContact: "Sarah Chen → Flex Regional Logistics Director", specialNotes: "Sarah prefers bullet-point emails with clear action items" },
        { preferredChannel: "Email with Flex VMS portal updates", responseTime: "Same-day response guaranteed", escalationContact: "Lisa Wong for commercial, Sarah for operational", specialNotes: "Update Flex vendor portal within 2 hours of any status change" },
        { preferredChannel: "Email for all formal, WhatsApp for FYI updates", responseTime: "Within 2 hours, proactive updates preferred", escalationContact: "Sarah Chen — single point of escalation", specialNotes: "Proactive delay notification is highly valued — alert before customer asks" },
        { preferredChannel: "Structured weekly email summary + ad-hoc WhatsApp", responseTime: "Standard SLA — within 2 hours", escalationContact: "Sarah Chen for all matters", specialNotes: "Prepare 3-year rate proposal for contract renewal discussion" },
      ],
      emphases: [
        "Focus on operational consistency and ESD compliance",
        "Focus on contract renewal and system integration",
        "Focus on proactive communication and invoice accuracy",
        "Focus on long-term partnership and volume growth",
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
        <Plane className="h-3 w-3" />
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
                Agent Chat about {customer.company}
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
            <SOPField label="Default Incoterm" value={customer.quoteDefaults.defaultIncoterm} />
            <SOPField label="Default Commodity" value={customer.quoteDefaults.defaultCommodity} />
            <SOPField label="Packaging" value={customer.quoteDefaults.defaultPackaging} />
            <SOPField label="Insurance Preference" value={customer.quoteDefaults.defaultInsurance} />
            <SOPField label="Temperature Requirements" value={customer.quoteDefaults.temperatureReq} />
            <SOPField label="DG Classification" value={customer.quoteDefaults.dgClassification} />
            <SOPField label="Stackable" value={customer.quoteDefaults.defaultStackable} />
            <SOPField label="Priority Level" value={customer.quoteDefaults.defaultPriority} />
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
  lines.push(`   Incoterm: ${customer.quoteDefaults.defaultIncoterm}`);
  lines.push(`   Commodity: ${customer.quoteDefaults.defaultCommodity}`);
  lines.push(`   Packaging: ${customer.quoteDefaults.defaultPackaging}`);
  lines.push(`   Insurance: ${customer.quoteDefaults.defaultInsurance}`);
  lines.push(`   Temperature: ${customer.quoteDefaults.temperatureReq}`);
  lines.push(`   DG Classification: ${customer.quoteDefaults.dgClassification}`);
  lines.push(`   Stackable: ${customer.quoteDefaults.defaultStackable}`);
  lines.push(`   Priority: ${customer.quoteDefaults.defaultPriority}`);
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
