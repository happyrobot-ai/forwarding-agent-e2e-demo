# CEVA Ground Demo - Implementation Plan

This document outlines the phased implementation plan to adapt the HappyRobot Forwarding demo for a CEVA Logistics Ground Demo.

---

## Overview

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Branding & Layout | Foundation |
| 2 | Navigation & Routing | Quick |
| 3 | Contact Intelligence Data | Medium |
| 4 | Communications/Inbox Data | Medium |
| 5 | Map View Adaptation | Medium |
| 6 | Cleanup & Polish | Light |

---

## Phase 1: Branding & Layout

### Objective
Update company branding, logos, and footer to reflect CEVA + HappyRobot co-branding.

### Tasks

#### 1.1 Update Application Metadata
**File**: `app/layout.tsx`

```typescript
// Change from:
export const metadata: Metadata = {
  title: "HappyRobot Forwarding - AI Platform",
  description: "Intelligent freight forwarding powered by AI",
};

// Change to:
export const metadata: Metadata = {
  title: "CEVA Logistics - AI Platform",
  description: "Intelligent ground freight powered by AI",
};
```

#### 1.2 Add CEVA Logo Files
**Location**: `public/logos/`

- [ ] Add `ceva-logo-light.svg` (for dark theme)
- [ ] Add `ceva-logo-dark.svg` (for light theme)
- [ ] Add `ceva-logo.png` (fallback)

#### 1.3 Update Layout Component - Sidebar Logo
**File**: `components/Layout.tsx`

- Replace current logo references with CEVA logos
- Update `getManhattanIcon()` → Remove or replace
- Update `getSamsaraIcon()` → Remove
- Keep `getHappyRobotIcon()` for AI Agents section

#### 1.4 Update Footer (Co-Branding)
**File**: `components/Layout.tsx` (or footer component if separate)

- Add "CEVA + HappyRobot" co-branding in footer
- Remove partner logos (Manhattan TMS, Samsara)

#### 1.5 Remove Demo Configuration Modal
**File**: `components/Layout.tsx`

- Remove `DemoConfigModal` component import and usage
- Remove any "Configure Demo" or "Reset Demo" buttons

### Tests - Phase 1

| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| P1-T1 | Load application home page | Page title shows "CEVA Logistics - AI Platform" |
| P1-T2 | Check sidebar header | CEVA logo displays correctly |
| P1-T3 | Toggle dark/light theme | Logo switches appropriately for each theme |
| P1-T4 | Check footer | Shows "CEVA + HappyRobot" co-branding |
| P1-T5 | Verify no partner logos | Manhattan TMS and Samsara logos not visible |
| P1-T6 | Verify no demo controls | "Configure Demo" and "Reset Demo" buttons removed |

### Verification Commands
```bash
# Start development server
npm run dev

# Visual verification checklist:
# - Navigate to http://localhost:3000
# - Check browser tab title
# - Inspect sidebar logo
# - Toggle theme (check both logos)
# - Scroll to footer
# - Confirm no demo modal trigger exists
```

---

## Phase 2: Navigation & Routing

### Objective
Remove Shipments section and update navigation structure.

### Tasks

#### 2.1 Update Navigation Items
**File**: `components/Layout.tsx`

```typescript
// Remove this item from navItems array:
{
  href: "/shipments",
  icon: LayoutDashboard,
  label: "Shipments",
  subtitle: "Air Freight",
},

// Keep these items (update subtitles if needed):
const navItems = [
  {
    href: "/contacts",
    icon: Users,
    label: "Contact Intelligence",
    subtitle: "Customer Insights",
  },
  {
    href: "/inbox",
    icon: MessageSquare,
    label: "Communications",
    subtitle: "Receptionist",
  },
  {
    href: "/map",
    icon: Map, // Consider changing icon
    label: "Map View",
    subtitle: "Live Tracking",
  },
  {
    href: "/agents",
    customIcon: getHappyRobotIcon(),
    label: "AI Agents",
    subtitle: "Orchestration",
  },
];
```

#### 2.2 Update Home Page Redirect
**File**: `app/page.tsx`

```typescript
// Verify redirect goes to a valid page (inbox is fine)
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/inbox");
}
```

#### 2.3 Remove or Archive Shipments Page
**Option A - Remove**:
```bash
rm -rf app/shipments/
```

**Option B - Keep but exclude from nav** (recommended for now):
- Leave files in place but not accessible via navigation

### Tests - Phase 2

| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| P2-T1 | Check sidebar navigation | Shows 4 items: Contacts, Communications, Map, AI Agents |
| P2-T2 | Verify Shipments removed | No "Shipments" link in navigation |
| P2-T3 | Navigate to each section | All 4 sections load without errors |
| P2-T4 | Home page redirect | `/` redirects to `/inbox` |
| P2-T5 | Direct URL to /shipments | Returns 404 (if removed) or page loads (if archived) |

### Verification Commands
```bash
# Test navigation links
curl -I http://localhost:3000/contacts
curl -I http://localhost:3000/inbox
curl -I http://localhost:3000/map
curl -I http://localhost:3000/agents

# Should return 404 if removed:
curl -I http://localhost:3000/shipments
```

---

## Phase 3: Contact Intelligence Data

### Objective
Replace customer data with ground freight-focused customers including Ferrari with contact Enzo.

### Tasks

#### 3.1 Create New Customer Data
**File**: `app/contacts/page.tsx`

Replace the `customers` array with new data:

**Required Customers (8-10 total):**

| # | Company | Industry | Primary Contact | Preferred Channel |
|---|---------|----------|-----------------|-------------------|
| 1 | Ferrari | Automotive | Enzo (required) | Phone (required) |
| 2 | Target | Retail | TBD | Email |
| 3 | Caterpillar | Manufacturing | TBD | Email |
| 4 | Sysco | Food & Beverage | TBD | WhatsApp |
| 5 | Dell Technologies | Technology | TBD | Email |
| 6 | Home Depot | Retail | TBD | Phone |
| 7 | Tyson Foods | Food & Beverage | TBD | Email |
| 8 | General Motors | Automotive | TBD | Email |

#### 3.2 Update Customer Interface Fields
**File**: `app/contacts/page.tsx`

Update `QuoteDefaults` interface for ground freight:

```typescript
interface QuoteDefaults {
  defaultEquipment: string;      // "Dry Van", "Flatbed", "Reefer", etc.
  defaultCommodity: string;
  defaultWeight: string;
  defaultAccessorials: string;   // "Liftgate", "Inside Delivery", etc.
  defaultPriority: string;
}
```

#### 3.3 Update Lane/Route Format
**File**: `app/contacts/page.tsx`

Change lane format from airport codes to City, State:

```typescript
// Before:
lanes: [
  { origin: "SIN", destination: "LAX", frequency: "4x/month" },
]

// After:
lanes: [
  { origin: "Los Angeles, CA", destination: "Chicago, IL", frequency: "4x/month" },
]
```

#### 3.4 Replace Plane Icon with Route Icon
**File**: `app/contacts/page.tsx`

```typescript
// Change import:
import { Route } from "lucide-react"; // Add Route

// In LanePill component, replace:
<Plane className="h-3 w-3" />
// With:
<Route className="h-3 w-3" />
```

#### 3.5 Update Working Notes & SOP Content
Update `sopPool` for each customer with ground freight context:
- Remove air freight references (AWB, flights, airports)
- Add ground freight references (BOL, PRO numbers, trucks, drivers)

### Tests - Phase 3

| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| P3-T1 | Load Contact Intelligence page | Page loads without errors |
| P3-T2 | Count customer profiles | Shows 8-10 customers in list |
| P3-T3 | Find Ferrari customer | Ferrari appears in customer list |
| P3-T4 | Verify Enzo contact | Ferrari has contact named "Enzo" |
| P3-T5 | Check Enzo preferences | Enzo's preferred channel is "Phone" |
| P3-T6 | Click lane pill | Shows City, State format (not airport codes) |
| P3-T7 | Check lane icon | Route icon displays (not Plane icon) |
| P3-T8 | Generate SOP | SOP generates without air freight terms |
| P3-T9 | Search customers | Search filters work correctly |
| P3-T10 | Agent Chat tab | Chat works with ground freight context |

### Verification Checklist
```
[ ] Ferrari customer exists
[ ] Enzo is a contact under Ferrari
[ ] Enzo's preferredChannel = "Phone"
[ ] All lanes show City, State format
[ ] No airport codes visible
[ ] No AWB/flight references in SOPs
[ ] Route icons display correctly
[ ] All customers have complete data
```

---

## Phase 4: Communications/Inbox Data

### Objective
Update email inbox data to reflect ground freight communications.

### Tasks

#### 4.1 Update Email Seed Data
**File**: `lib/seed-data/email-inbox.json`

Update emails with ground freight content:

**Email Types to Include:**
- Quote requests (ground freight)
- Pickup schedule confirmations
- Delivery appointment requests
- POD (Proof of Delivery) requests
- Rate inquiries
- Driver updates
- Delivery status inquiries

**Sample Email Structure:**
```json
{
  "id": "email-001",
  "emailId": "msg-ground-001",
  "fromName": "Enzo Rossi",
  "fromEmail": "enzo.rossi@ferrari.com",
  "fromCompany": "Ferrari",
  "subject": "Quote Request: Auto Parts LA to Detroit",
  "receivedAt": "2026-02-11T09:30:00Z",
  "classification": "quote_request",
  "intent": "Request rate for FTL shipment",
  "priority": "high",
  "status": "pending",
  "assignedRepName": "John Smith",
  "linkedShipment": "BOL-2026-0234",
  "summary": "Requesting quote for automotive parts shipment from Los Angeles, CA to Detroit, MI. Dry van required, 42,000 lbs.",
  "missingInfo": ["Pickup date", "Delivery requirements"],
  "tags": ["AUTOMOTIVE", "FTL"],
  "highlight": true
}
```

#### 4.2 Update Classification Labels
**File**: `app/inbox/page.tsx`

Update `getClassificationLabel()` function if needed:

```typescript
const classificationLabels = {
  quote_request: "Quote Request",
  booking_confirmation: "Booking",
  status_inquiry: "Status Inquiry",
  pickup_schedule: "Pickup Schedule",
  pod_request: "POD Request",
  delivery_appointment: "Delivery Appt",
  rate_inquiry: "Rate Inquiry",
  driver_update: "Driver Update",
  issue_report: "Issue Report",
};
```

#### 4.3 Update Tags
Replace air freight tags with ground freight tags:

| Remove | Add |
|--------|-----|
| PHARMA | RETAIL |
| TEMPERATURE_CONTROLLED | REFRIGERATED |
| AIR_FREIGHT | FTL |
| - | LTL |
| - | INTERMODAL |
| - | AUTOMOTIVE |
| - | FOOD |
| - | INDUSTRIAL |

#### 4.4 Update Email API (if needed)
**File**: `app/api/emails/route.ts`

Ensure API returns updated email data.

### Tests - Phase 4

| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| P4-T1 | Load Inbox page | Page loads with emails |
| P4-T2 | Check email count | Shows 50+ emails (full dataset) |
| P4-T3 | Verify no air freight terms | No AWB, flight numbers visible |
| P4-T4 | Check classification badges | Ground-relevant classifications display |
| P4-T5 | Verify tags | Tags show FTL, LTL, AUTOMOTIVE, etc. |
| P4-T6 | Find Ferrari email | Email from Ferrari/Enzo exists |
| P4-T7 | Check linked references | Shows BOL/PRO numbers (not AWB) |
| P4-T8 | Email priority indicators | Priority colors work correctly |
| P4-T9 | Email status indicators | Status icons display correctly |
| P4-T10 | Real-time updates | SSE subscription works (if applicable) |

### Sample Test Data Verification
```javascript
// Quick console check in browser:
fetch('/api/emails')
  .then(r => r.json())
  .then(emails => {
    console.log('Total emails:', emails.length);
    console.log('Has Ferrari:', emails.some(e => e.fromCompany === 'Ferrari'));
    console.log('No AWB refs:', !emails.some(e => e.summary.includes('AWB')));
  });
```

---

## Phase 5: Map View Adaptation

### Objective
Convert global air freight map to US-focused 3D ground freight map.

### Tasks

#### 5.1 Update Map Configuration
**File**: `app/map/page.tsx`

```typescript
// Change map center and zoom for US focus
const MAP_CONFIG = {
  center: [-98.5795, 39.8283], // Geographic center of US
  zoom: 3.5,
  pitch: 45,  // 3D perspective
  bearing: 0,
  projection: 'mercator', // or keep 'globe' with US focus
};
```

#### 5.2 Update Route Data
Create US ground freight routes:

```typescript
const routes = [
  {
    id: "route-1",
    origin: { name: "Los Angeles, CA", coordinates: [-118.2437, 34.0522] },
    destination: { name: "New York, NY", coordinates: [-74.0060, 40.7128] },
    status: "in_transit",
    carrier: "CEVA Ground",
    equipment: "Dry Van",
  },
  {
    id: "route-2",
    origin: { name: "Seattle, WA", coordinates: [-122.3321, 47.6062] },
    destination: { name: "Miami, FL", coordinates: [-80.1918, 25.7617] },
    status: "in_transit",
    carrier: "CEVA Ground",
    equipment: "Reefer",
  },
  // Add more routes...
];
```

#### 5.3 Sample US Routes

| Origin | Destination | Coordinates (Origin) | Coordinates (Dest) |
|--------|-------------|---------------------|-------------------|
| Los Angeles, CA | New York, NY | -118.2437, 34.0522 | -74.0060, 40.7128 |
| Seattle, WA | Miami, FL | -122.3321, 47.6062 | -80.1918, 25.7617 |
| Chicago, IL | Los Angeles, CA | -87.6298, 41.8781 | -118.2437, 34.0522 |
| Dallas, TX | Detroit, MI | -96.7970, 32.7767 | -83.0458, 42.3314 |
| Atlanta, GA | San Francisco, CA | -84.3880, 33.7490 | -122.4194, 37.7749 |
| Phoenix, AZ | Philadelphia, PA | -112.0740, 33.4484 | -75.1652, 39.9526 |
| Denver, CO | Houston, TX | -104.9903, 39.7392 | -95.3698, 29.7604 |
| Boston, MA | Nashville, TN | -71.0589, 42.3601 | -86.7816, 36.1627 |

#### 5.4 Update Map Markers/Icons
- Replace airplane markers with truck markers
- Update route lines style (road-style vs flight arcs)

#### 5.5 Update Map Legend/UI
- Change "Air Freight" labels to "Ground Freight"
- Update any status indicators

### Tests - Phase 5

| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| P5-T1 | Load Map page | Map renders without errors |
| P5-T2 | Check map center | Map centered on continental US |
| P5-T3 | Verify 3D perspective | Map has tilted/3D view (pitch > 0) |
| P5-T4 | Check route markers | Routes display between US cities |
| P5-T5 | Verify no international routes | No routes outside US visible |
| P5-T6 | Check marker icons | Truck/route icons (not airplane) |
| P5-T7 | Click route/marker | Popup shows ground freight info |
| P5-T8 | Zoom functionality | Map zooms smoothly |
| P5-T9 | Map controls | Pan, zoom, rotate work correctly |
| P5-T10 | Legend/labels | No "Air Freight" terminology |

### Map Visual Verification
```
[ ] Map loads centered on US
[ ] 3D perspective visible
[ ] Routes connect US cities
[ ] No international locations
[ ] Truck/route icons display
[ ] Route popups show ground info
[ ] No airplane icons visible
[ ] "Ground Freight" terminology used
```

---

## Phase 6: Cleanup & Polish

### Objective
Final cleanup, remove unused code, and polish UI consistency.

### Tasks

#### 6.1 Remove Unused Files

```bash
# Remove shipments page (if not already removed)
rm -rf app/shipments/

# Remove demo API routes
rm -rf app/api/demo/

# Remove unused seed data
rm lib/seed-data/shipments-dashboard.json
```

#### 6.2 Remove Unused Imports
Scan all modified files for unused imports:
- Plane icon (if fully replaced)
- Demo-related components
- Air freight utility functions

#### 6.3 Update README
**File**: `README.md`

- Update project description
- Update feature list
- Update demo script
- Remove air freight references

#### 6.4 Code Cleanup
- Remove commented code
- Fix any linter warnings
- Ensure consistent formatting

#### 6.5 Final UI Review
- Check all pages for air freight terminology
- Verify consistent styling
- Test dark/light theme on all pages

### Tests - Phase 6

| Test ID | Test Description | Expected Result |
|---------|------------------|-----------------|
| P6-T1 | Build project | `npm run build` succeeds without errors |
| P6-T2 | No linter errors | `npm run lint` passes |
| P6-T3 | No TypeScript errors | No type errors in build |
| P6-T4 | 404 on removed routes | `/shipments` returns 404 |
| P6-T5 | Full navigation test | All nav links work correctly |
| P6-T6 | Theme toggle all pages | Dark/light works on all pages |
| P6-T7 | Search terminology | No "air freight", "AWB", "flight" in UI |
| P6-T8 | Mobile responsiveness | UI works on mobile viewport |
| P6-T9 | Console errors | No JavaScript console errors |
| P6-T10 | README accuracy | README reflects current demo |

### Final Build Verification
```bash
# Clean install
rm -rf node_modules
npm install

# Lint check
npm run lint

# Type check
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm start

# Run through all pages manually
```

---

## Testing Summary

### Phase Test Counts

| Phase | Tests | Focus |
|-------|-------|-------|
| Phase 1 | 6 | Branding & Layout |
| Phase 2 | 5 | Navigation |
| Phase 3 | 10 | Contact Intelligence |
| Phase 4 | 10 | Communications |
| Phase 5 | 10 | Map View |
| Phase 6 | 10 | Cleanup & Polish |
| **Total** | **51** | |

### Critical Path Tests

These tests MUST pass before moving to next phase:

| Phase | Critical Test | Reason |
|-------|---------------|--------|
| 1 | P1-T1, P1-T2 | Branding visible on all pages |
| 2 | P2-T3 | All sections must be accessible |
| 3 | P3-T3, P3-T4, P3-T5 | Ferrari/Enzo requirement |
| 4 | P4-T3 | No air freight terminology |
| 5 | P5-T1, P5-T4 | Map must render with US routes |
| 6 | P6-T1, P6-T2 | Clean production build |

### End-to-End Test Script

```bash
#!/bin/bash
# e2e-test.sh

echo "=== CEVA Ground Demo E2E Test ==="

# Start server in background
npm run dev &
SERVER_PID=$!
sleep 5

# Test endpoints
echo "Testing endpoints..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200" && echo "✓ Home" || echo "✗ Home"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/contacts | grep -q "200" && echo "✓ Contacts" || echo "✗ Contacts"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/inbox | grep -q "200" && echo "✓ Inbox" || echo "✗ Inbox"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/map | grep -q "200" && echo "✓ Map" || echo "✗ Map"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/agents | grep -q "200" && echo "✓ Agents" || echo "✗ Agents"

# Cleanup
kill $SERVER_PID
echo "=== Tests Complete ==="
```

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 1: Branding                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Add CEVA logos                                     │   │
│  │ • Update metadata                                    │   │
│  │ • Update footer                                      │   │
│  │ • Remove demo modal                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│                    Phase 2: Navigation                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Remove Shipments from nav                          │   │
│  │ • Verify all routes work                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│              Phase 3: Contact Intelligence                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Create 8-10 customer profiles                      │   │
│  │ • Include Ferrari + Enzo (Phone)                     │   │
│  │ • Update routes to City, State                       │   │
│  │ • Replace icons                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│                 Phase 4: Communications                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Update email content                               │   │
│  │ • Update classifications                             │   │
│  │ • Update tags                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│                    Phase 5: Map View                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Reconfigure for US                                 │   │
│  │ • Add ground routes                                  │   │
│  │ • Update markers/icons                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│                 Phase 6: Cleanup & Polish                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Remove unused files                                │   │
│  │ • Fix linter warnings                                │   │
│  │ • Update README                                      │   │
│  │ • Final testing                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| CEVA logos not provided | Use "CEVA" text placeholder |
| Map library compatibility | Test Mapbox with US focus before full implementation |
| Data volume too large | Generate incrementally, test performance |
| Missing customer data | Use placeholder data, iterate with feedback |
| Breaking existing functionality | Phase-based approach with tests between phases |

---

## Rollback Plan

If critical issues are found:

1. **Git-based rollback**: Each phase should be committed separately
   ```bash
   git checkout HEAD~1  # Rollback one phase
   ```

2. **Feature flags**: Consider using environment variables
   ```typescript
   const USE_GROUND_DEMO = process.env.NEXT_PUBLIC_GROUND_DEMO === 'true';
   ```

3. **Backup branch**: Keep `main` branch untouched, work on `feature/ground-demo`

---

*Document generated: February 11, 2026*
*Project: CEVA Ground Demo Implementation Plan*
