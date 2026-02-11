# CEVA Ground Demo - Required Changes

This document outlines all the changes needed to adapt the HappyRobot Forwarding demo for a CEVA Logistics Ground Demo.

---

## 1. Branding & Identity

### Company Name
- **Current**: "HappyRobot Forwarding"
- **New**: "CEVA Logistics"

### Logo
- User will provide CEVA logo files (PNG/SVG)
- Replace Manhattan TMS logo references
- Replace Samsara logo references
- **Remove all partner/integration logos** from the UI

### Co-Branding
- Footer should display: **"CEVA + HappyRobot"** (co-branded)
- Keep HappyRobot branding on AI Agents page

### Colors
- **Keep current blue theme** (`#003366` primary)
- No color changes required

---

## 2. Navigation & Sections

### Sections to Keep
| Section | Subtitle | Notes |
|---------|----------|-------|
| Contact Intelligence | Customer Insights | Adapt for ground freight customers |
| Communications | Receptionist | Adapt email content for ground |
| Map View | Live Tracking | 3D US map perspective |
| AI Agents | Orchestration | Keep current design |

### Sections to Remove
- **Shipments** section - Remove entirely from navigation

### Files to Modify
- `components/Layout.tsx` - Update `navItems` array

---

## 3. Transportation Mode

### Type
- **Mixed ground operations** (FTL, LTL, Intermodal, Last Mile)

### Geographic Region
- **United States (domestic)**
- Nationwide coast-to-coast routes

### Route Display Format
- **City, State format**: "Los Angeles, CA → Chicago, IL"
- Replace airport codes with city/state pairs

### Icons
- Replace `<Plane />` icons with **Route/Road** icons
- Use `Route` or `MapPin` from lucide-react

---

## 4. Demo Flow & Functionality

### Primary Focus
- **AI Agent Orchestration** - Showcase multiple AI agent types working together

### AI Agent Types to Feature
- Customer Service Agent
- Dispatcher Agent
- Quoting Agent
- Tracking Agent
- Carrier/Broker Agent

### Alert/Incident Scenario
- **No alert scenario** - Remove demo trigger functionality

### Demo Controls
- **Remove** "Configure Demo" modal
- **Remove** "Reset Demo" functionality
- **Static demo data only**

### Files to Modify
- `components/Layout.tsx` - Remove `DemoConfigModal`
- `app/api/demo/*` - Can be removed or disabled

---

## 5. Data Changes

### Data Volume
- **Full dataset** - Similar to current (50+ items per section)

### Customer Profiles (Contact Intelligence)
- **8-10 customer profiles** (up from 6)
- **Diverse industries**: Retail, Manufacturing, Food, Tech, Automotive

#### Required Customer: Ferrari
- Company: Ferrari
- Industry: Automotive
- Contact: **Enzo** (must have this name)
- Preferred Channel: **Phone** (key requirement)
- Other contacts: Add appropriate supporting contacts

#### Other Suggested Customers (diverse mix)
1. **Target** - Retail
2. **Caterpillar** - Manufacturing/Industrial
3. **Sysco** - Food & Beverage
4. **Dell Technologies** - Technology
5. **Home Depot** - Retail/Home Improvement
6. **Tyson Foods** - Food & Beverage
7. **General Motors** - Automotive
8. **Procter & Gamble** - Consumer Goods
9. **Amazon** - E-commerce/Retail

### Quote Parameters (Simplified for Ground)
Replace air freight defaults with:
- **Origin** (City, State)
- **Destination** (City, State)
- **Weight**
- **Equipment Type** (Dry Van, Flatbed, Reefer, etc.)

Remove or de-emphasize:
- Temperature requirements (unless reefer)
- DG Classification
- Flight/carrier codes
- AWB references

### Lane Preferences
Change from airport codes to City, State format:
```
Before: SIN → LAX (4x/month)
After:  Los Angeles, CA → Chicago, IL (4x/month)
```

### Files to Modify
- `app/contacts/page.tsx` - Update `customers` array
- `lib/seed-data/email-inbox.json` - Update email content
- `lib/seed-data/shipments-dashboard.json` - Can be removed (section removed)

---

## 6. Email/Communications Content

### Email Types (Mix of these categories)
1. **Standard freight forwarding**:
   - Quote requests
   - Booking confirmations
   - Status inquiries

2. **Ground-specific**:
   - Pickup schedules
   - POD (Proof of Delivery) requests
   - Driver updates
   - Delivery appointments

### Content Updates
- Remove references to:
  - Air Waybill (AWB) numbers
  - Flight numbers
  - Temperature alerts
  - Airport codes
  
- Add references to:
  - BOL (Bill of Lading) numbers
  - PRO numbers
  - Truck/trailer numbers
  - Driver names
  - Delivery appointments

### Tags to Update
Replace:
- `PHARMA` → `RETAIL`, `FOOD`, `INDUSTRIAL`, etc.
- `TEMPERATURE_CONTROLLED` → `REFRIGERATED` (if applicable)
- `AIR_FREIGHT` → `FTL`, `LTL`, `INTERMODAL`

---

## 7. Map View

### Projection
- **3D perspective view** of United States
- Remove globe projection

### Coverage
- **Nationwide US routes**
- Major corridors: I-10, I-40, I-80, I-90, I-95

### Sample Routes (Coast to Coast)
| Origin | Destination | Corridor |
|--------|-------------|----------|
| Los Angeles, CA | New York, NY | I-40/I-81 |
| Seattle, WA | Miami, FL | I-90/I-75 |
| Chicago, IL | Los Angeles, CA | I-40 |
| Dallas, TX | Detroit, MI | I-75 |
| Atlanta, GA | San Francisco, CA | I-20/I-10 |

### Map Center
- Center on continental United States
- Coordinates approximately: `[-98.5795, 39.8283]` (geographic center of US)

### Files to Modify
- `app/map/page.tsx` - Update map configuration
- Map data files with route coordinates

---

## 8. UI Component Updates

### Terminology Changes
| Current Term | New Term |
|--------------|----------|
| Air Freight | Ground Freight |
| AWB | BOL / PRO Number |
| Flight | Route / Lane |
| Carrier (airline) | Carrier (trucking) |
| ETD/ETA (flight) | Pickup/Delivery Time |

### Icons to Replace
| Location | Current | New |
|----------|---------|-----|
| Lane pills | `<Plane />` | `<Route />` or `<Truck />` |
| Shipment cards | Airplane icons | Truck icons |

---

## 9. Database Schema Considerations

### Models to Review
The Prisma schema has models for both air freight and ground freight:

**Keep/Adapt for Ground**:
- `Email` - Update sample data
- `Booking` - Adapt fields
- `Truck` - Already exists (legacy Sysco demo)
- `Order` - Already exists with geo data

**May Remove/Ignore**:
- `Shipment` - Air freight focused (section removed)
- `ShipmentMilestone` - Air freight milestones

---

## 10. Files Summary

### High Priority Changes
| File | Change Type | Description |
|------|-------------|-------------|
| `components/Layout.tsx` | Modify | Remove Shipments nav, update branding, remove demo modal |
| `app/contacts/page.tsx` | Modify | Replace customer data, update for ground |
| `app/map/page.tsx` | Modify | US-focused 3D map, ground routes |
| `lib/seed-data/email-inbox.json` | Modify | Ground freight emails |
| `app/layout.tsx` | Modify | Update metadata title/description |

### Medium Priority Changes
| File | Change Type | Description |
|------|-------------|-------------|
| `app/inbox/page.tsx` | Modify | Update classification labels |
| `app/agents/page.tsx` | Review | Ensure agent types are ground-relevant |
| `public/` | Add | CEVA logo files |

### To Remove/Disable
| File/Folder | Reason |
|-------------|--------|
| `app/shipments/` | Section removed |
| `app/api/demo/reset/` | Demo triggers removed |
| `app/api/demo/trigger/` | Demo triggers removed |
| Partner logo files | Removed from UI |

---

## 11. Additional Requirements

> *To be added by user*

---

## Summary Checklist

- [ ] Replace company branding with CEVA Logistics
- [ ] Add CEVA logo files (user to provide)
- [ ] Update footer to "CEVA + HappyRobot"
- [ ] Remove Shipments section from navigation
- [ ] Remove partner logos (Manhattan TMS, Samsara)
- [ ] Remove demo trigger/reset functionality
- [ ] Update Contact Intelligence with 8-10 ground customers
- [ ] Add Ferrari customer with contact Enzo (phone preference)
- [ ] Convert all routes from airport codes to City, State format
- [ ] Replace Plane icons with Route icons
- [ ] Update map to 3D US perspective view
- [ ] Update email content for ground freight
- [ ] Simplify quote parameters (origin, destination, weight, equipment)
- [ ] Update terminology throughout UI

---

*Document generated: February 11, 2026*
*Project: CEVA Ground Demo Adaptation*
