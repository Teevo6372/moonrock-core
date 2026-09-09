/**
 * Tier 0 Digital Products (Playbook Section 5.0). 70 items: 50 paid (0a,
 * $7-$27 one-time) + 20 free "Retention Gifts" (0b, not sold - delivered via
 * workflow during the "Earn Trust" conversation step, never through
 * checkout). Real data (names, prices, categories, GHL file links, GHL
 * Payment Product ids) came from the completed rollout checklist
 * (tier0-production-rollout-checklist.md Phases 1-2) - nothing here is a
 * placeholder.
 *
 * `id` uses no readonly-union type deliberately, unlike AlaCarteItemId/
 * AiEmployeeId elsewhere in this file set: at 70 entries the type-safety
 * benefit of a 70-member literal union doesn't pay for the noise, and
 * every consumer accesses this catalog by filtering/iterating
 * (getTier0Catalog), never by referencing an individual id by name in code.
 *
 * Deliberately NOT folded into approvedServiceCatalog() (ai-employee-catalog.ts):
 * that function stuffs its output into every conversation's context so Claude
 * never invents a product name. Tier 0 is surfaced through its own tool
 * instead (get_tier0_catalog, see anthropic-tools.ts) so a normal
 * conversation isn't paying the context cost of 70 items it usually won't
 * need - the same reasoning that keeps Flight Plan/bundle data out of
 * context and behind tools elsewhere in this migration.
 */

export type Tier0SubTier = "0a" | "0b";

export type Tier0Category =
  | "Marketing & Lead Gen"
  | "Customer Experience & Retention"
  | "Operations & Systems"
  | "Pricing & Finance"
  | "Hiring & Team"
  | "Local SEO, Reputation & Digital Presence"
  | "AI & Automation Starter Kits"
  | "Retention Gifts";

export interface Tier0Product {
  id: string;
  name: string;
  subTier: Tier0SubTier;
  category: Tier0Category;
  /** USD, one-time. 0 for every 0b (free) item - never a separate optional field, so display/arithmetic never needs a null check. */
  priceUsd: number;
  /** Direct GHL Media Storage download link. */
  fileLink: string;
  /** GHL Payments > Products id. Present only for 0a items - 0b items have no Products entry (delivered via workflow, not checkout, per Section 9.1/Phase 2). */
  ghlProductId?: string;
}

export const TIER0_CATALOG: readonly Tier0Product[] = [
  // Marketing & Lead Gen (14)
  { id: "01", name: "The Missed-Call Money Leak Calculator", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 17, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04205360a619b9fccefa1.xlsx", ghlProductId: "6aa046962b997ee15a9d1d85" },
  { id: "02", name: "30-Day Local Social Media Content Calendar", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 19, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04205bfc1456f8c681dce.pdf", ghlProductId: "6aa046ef6ab42c83c1b5efe4" },
  { id: "03", name: "Google Business Profile Optimization Checklist", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04205dd867dc12dda83ba.pdf", ghlProductId: "6aa0472d389425cf2ec24587" },
  { id: "04", name: "5-Star Review Request Script Pack", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04361d63e08439cc9dba5.pdf", ghlProductId: "6aa04775bc2c36595c32e965" },
  { id: "05", name: "Referral Program Starter Kit", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 17, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa043619ce7949849d8f4b9.pdf", ghlProductId: "6aa047c4f314d5491b707d93" },
  { id: "06", name: "Seasonal Promotion Swipe File (KS Edition)", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 19, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04361dd867dc12ddaaac2.pdf", ghlProductId: "6aa0480d6ab42c83c1b60426" },
  { id: "07", name: "\"We're Booked Solid\" Waitlist Page Template", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 15, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0436116ed327815ac2d64.pdf", ghlProductId: "6aa04844113740593d2b7a1f" },
  { id: "08", name: "Local Facebook Ad Starter Templates (5 Ads)", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 22, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0436116ed327815ac2d5a.pdf", ghlProductId: "6aa048717cec7087e4e8dfd2" },
  { id: "09", name: "Door Hanger & Yard Sign Copy Pack", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04361641597c752b212a5.pdf", ghlProductId: "6aa048a003cfd46f561236ad" },
  { id: "10", name: "Before/After Photo Marketing Guide", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa043629ce7949849d8f523.pdf", ghlProductId: "6aa048caf314d5491b709380" },
  { id: "11", name: "Nextdoor & Local Facebook Group Playbook", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 14, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04362dd867dc12ddaab0c.pdf", ghlProductId: "6aa048f57cec7087e4e8e9a9" },
  { id: "12", name: "Direct Mail Postcard Template (Editable)", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 19, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04362a08d19d92753d39d.pdf", ghlProductId: "6aa04923e3877eaf5ce24aa0" },
  { id: "13", name: "\"New to the Neighborhood\" Welcome Offer Kit", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 15, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04362360a619b9fcd14a8.pdf", ghlProductId: "6aa0494f9297308623f40455" },
  { id: "14", name: "Local Sponsorship Pitch Template", subTier: "0a", category: "Marketing & Lead Gen", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa043628de363112b5605ea.pdf", ghlProductId: "6aa0497b9297308623f40773" },

  // Customer Experience & Retention (8)
  { id: "15", name: "The No-Show Prevention Text Sequence", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440b8de363112b561632.pdf", ghlProductId: "6aa049a95952cf74036aa084" },
  { id: "16", name: "Customer Onboarding Checklist Template", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 14, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440bbfc1456f8c685546.pdf", ghlProductId: "6aa049d7f314d5491b70a8d0" },
  { id: "17", name: "Win-Back Email Sequence for Lapsed Customers", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 17, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440b16ed327815ac3e82.pdf", ghlProductId: "6aa04a05f314d5491b70aec5" },
  { id: "18", name: "Complaint Response Script Pack", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440bdd867dc12ddabd7f.pdf", ghlProductId: "6aa04a337cec7087e4e909c0" },
  { id: "19", name: "Customer Satisfaction Survey Template", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440b641597c752b224d5.pdf", ghlProductId: "6aa04a6100f4084334402278" },
  { id: "20", name: "The \"Surprise & Delight\" Idea List (25 Ideas)", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440bbfc1456f8c68554a.pdf", ghlProductId: "6aa04a8e49fe318b486b1675" },
  { id: "21", name: "End-of-Job Walkthrough Checklist", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440ca08d19d92753e565.pdf", ghlProductId: "6aa04ab9112844157b6f0938" },
  { id: "22", name: "Loyalty Program Template for Local Services", subTier: "0a", category: "Customer Experience & Retention", priceUsd: 15, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0440c8de363112b561654.pdf", ghlProductId: "6aa04ae749fe318b486b1ab9" },

  // Operations & Systems (9)
  { id: "23", name: "Daily Job-Site Checklist Template", subTier: "0a", category: "Operations & Systems", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0445716ed327815ac4753.pdf", ghlProductId: "6aa04b17113740593d2bb0c9" },
  { id: "24", name: "SOP Starter Templates (10-Pack)", subTier: "0a", category: "Operations & Systems", priceUsd: 22, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044579ce7949849d91316.pdf", ghlProductId: "6aa04b46bc2c36595c33386c" },
  { id: "25", name: "Employee Onboarding Checklist", subTier: "0a", category: "Operations & Systems", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044579ce7949849d9130e.pdf", ghlProductId: "6aa04b74f314d5491b70c5ef" },
  { id: "26", name: "Equipment Maintenance Log Template", subTier: "0a", category: "Operations & Systems", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0445716ed327815ac475c.xlsx", ghlProductId: "6aa04ba300f4084334403793" },
  { id: "27", name: "Vehicle/Fleet Inspection Checklist", subTier: "0a", category: "Operations & Systems", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044578de363112b5621fd.pdf", ghlProductId: "6aa04bd052522f9fce85ae77" },
  { id: "28", name: "Weekly Team Huddle Agenda Template", subTier: "0a", category: "Operations & Systems", priceUsd: 7, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04457a08d19d92753edb8.pdf", ghlProductId: "6aa04bfef314d5491b70ce9e" },
  { id: "29", name: "Customer Complaint Tracking Log", subTier: "0a", category: "Operations & Systems", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044589ce7949849d9133f.xlsx", ghlProductId: "6aa04c2c20a6aa91195541ec" },
  { id: "30", name: "Job Costing Spreadsheet Template", subTier: "0a", category: "Operations & Systems", priceUsd: 19, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044588de363112b562237.xlsx", ghlProductId: "6aa04c5acfea9f1666ba9263" },
  { id: "31", name: "Seasonal Staffing Planner", subTier: "0a", category: "Operations & Systems", priceUsd: 14, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04458d63e08439cc9f94e.xlsx", ghlProductId: "6aa04c8852522f9fce85bb84" },

  // Pricing & Finance (7)
  { id: "32", name: "Service Pricing Calculator Template", subTier: "0a", category: "Pricing & Finance", priceUsd: 19, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449ebfc1456f8c686997.xlsx", ghlProductId: "6aa04cb520a6aa9119554b67" },
  { id: "33", name: "Estimate/Quote Template Pack (5 Designs)", subTier: "0a", category: "Pricing & Finance", priceUsd: 15, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449e16ed327815ac51a2.xlsx", ghlProductId: "6aa04ce4112844157b6f2e4c" },
  { id: "34", name: "Invoice Template Pack (5 Designs)", subTier: "0a", category: "Pricing & Finance", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449ea08d19d92753f72c.xlsx", ghlProductId: "6aa04d11bc2c36595c335900" },
  { id: "35", name: "Late Payment Follow-Up Script Pack", subTier: "0a", category: "Pricing & Finance", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449ed63e08439cca0103.pdf", ghlProductId: "6aa04d3ff314d5491b70e9e5" },
  { id: "36", name: "Break-Even Calculator for Service Businesses", subTier: "0a", category: "Pricing & Finance", priceUsd: 17, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449ed63e08439cca00fa.xlsx", ghlProductId: "6aa04d6df314d5491b70efdc" },
  // Legal disclaimer baked into the content itself, per Section 9.4 - not modeled here, that's the content workstream's job.
  { id: "37", name: "Deposit & Cancellation Policy Template", subTier: "0a", category: "Pricing & Finance", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449ef44f6ea72fd109f4.pdf", ghlProductId: "6aa04d9e52522f9fce85d699" },
  { id: "38", name: "Upsell/Add-On Menu Template", subTier: "0a", category: "Pricing & Finance", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0449ff44f6ea72fd10a02.pdf", ghlProductId: "6aa04dcd2139a523176b97cd" },

  // Hiring & Team (4)
  { id: "39", name: "Job Posting Template Pack (5 Roles)", subTier: "0a", category: "Hiring & Team", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044e4f44f6ea72fd11404.pdf", ghlProductId: "6aa04dfb112844157b6f52fe" },
  { id: "40", name: "Interview Question Bank for Trades & Service Roles", subTier: "0a", category: "Hiring & Team", priceUsd: 17, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044e4a08d19d927540000.pdf", ghlProductId: "6aa04e2820a6aa9119557b7a" },
  { id: "41", name: "Employee Performance Review Template", subTier: "0a", category: "Hiring & Team", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044e4641597c752b240b0.pdf", ghlProductId: "6aa04e5620a6aa9119557ea4" },
  // Legal disclaimer baked into the content itself, per Section 9.4 - not modeled here, that's the content workstream's job.
  { id: "42", name: "Commission/Bonus Structure Templates (3 Models)", subTier: "0a", category: "Hiring & Team", priceUsd: 19, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa044e48de363112b5632a8.pdf", ghlProductId: "6aa04e84112844157b6f6035" },

  // Local SEO, Reputation & Digital Presence (5)
  { id: "43", name: "Local SEO Quick-Start Checklist", subTier: "0a", category: "Local SEO, Reputation & Digital Presence", priceUsd: 14, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0452616ed327815ac613d.pdf", ghlProductId: "6aa04eb420a6aa9119558807" },
  { id: "44", name: "Website Trust-Signal Checklist", subTier: "0a", category: "Local SEO, Reputation & Digital Presence", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045269ce7949849d92c44.pdf", ghlProductId: "6aa04ee103e4021af055706a" },
  { id: "45", name: "\"Why Choose Us\" Copy Framework", subTier: "0a", category: "Local SEO, Reputation & Digital Presence", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045268de363112b563bf4.pdf", ghlProductId: "6aa04f0c389425cf2ec2f7af" },
  { id: "46", name: "Negative Review Response Templates (10 Scenarios)", subTier: "0a", category: "Local SEO, Reputation & Digital Presence", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa0452616ed327815ac6146.pdf", ghlProductId: "6aa057c2112844157b702c3a" },
  { id: "47", name: "FAQ Page Builder Template", subTier: "0a", category: "Local SEO, Reputation & Digital Presence", priceUsd: 9, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04526bfc1456f8c687b48.pdf", ghlProductId: "6aa05ceb03cfd46f5613f0ab" },

  // AI & Automation Starter Kits (3)
  { id: "48", name: "\"Is Your Business Ready for AI?\" Self-Assessment", subTier: "0a", category: "AI & Automation Starter Kits", priceUsd: 7, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04564360a619b9fcd500d.pdf", ghlProductId: "6aa05d24e3877eaf5ce40a97" },
  { id: "49", name: "ChatGPT/AI Prompt Pack for Local Business Owners (25 Prompts)", subTier: "0a", category: "AI & Automation Starter Kits", priceUsd: 17, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04564a08d19d9275410f8.pdf", ghlProductId: "6aa05d6935b0a49ae08617e4" },
  { id: "50", name: "The Automation Starter Roadmap", subTier: "0a", category: "AI & Automation Starter Kits", priceUsd: 12, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa04564360a619b9fcd5015.pdf", ghlProductId: "6aa05dc46ab42c83c1b7dcc7" },

  // Retention Gifts (20, free - 0b, "thanks for your interest", not sold)
  { id: "r01", name: "The First 90 Days Roadmap", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b7bfc1456f8c688e9c.pdf" },
  { id: "r02", name: "Weekly Cash Flow Snapshot Tracker", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b7d63e08439cca2415.xlsx" },
  { id: "r03", name: "Ideal Customer Persona Worksheet", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b7360a619b9fcd5a3d.pdf" },
  { id: "r04", name: "Brand Voice Cheat Sheet", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b7a08d19d927541b11.pdf" },
  { id: "r05", name: "Local Competitor Snapshot Template", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b7bfc1456f8c688e94.xlsx" },
  { id: "r06", name: "The One-Page Business Plan", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b7dd867dc12ddb002c.pdf" },
  { id: "r07", name: "Holiday & Closure Announcement Templates", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b8f44f6ea72fd12ef4.pdf" },
  { id: "r08", name: "20 Text Templates for Common Customer Questions", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b8f44f6ea72fd12f06.pdf" },
  { id: "r09", name: "Vehicle Wrap Design Brief Template", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b88de363112b564dcd.pdf" },
  { id: "r10", name: "The \"Ask for the Sale\" Closing Script Sheet", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b8f44f6ea72fd12f10.pdf" },
  { id: "r11", name: "Weather Delay Notification Templates (KS Edition)", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b8bfc1456f8c688ef5.pdf" },
  { id: "r12", name: "New Employee 30-60-90 Day Plan", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b98de363112b564dd7.pdf" },
  { id: "r13", name: "Local Networking Tracker", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b98de363112b564df6.xlsx" },
  { id: "r14", name: "Customer Lifetime Value Calculator", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b98de363112b564e03.xlsx" },
  { id: "r15", name: "The \"Why We're Different\" One-Pager", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b9f44f6ea72fd12f47.pdf" },
  { id: "r16", name: "Google Review QR Table Tent Template", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b9641597c752b25919.pdf" },
  { id: "r17", name: "One-Page Monthly Marketing Planner", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045b99ce7949849d93daa.pdf" },
  { id: "r18", name: "Customer Appreciation Event Checklist", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045ba641597c752b25932.pdf" },
  { id: "r19", name: "Emergency Communication Plan Template", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045ba641597c752b25952.pdf" },
  { id: "r20", name: "Getting the Most Out of Nova — Quick Start Guide", subTier: "0b", category: "Retention Gifts", priceUsd: 0, fileLink: "https://assets.cdn.filesafe.space/RX0RvGiTSimm80VawY25/media/6aa045badd867dc12ddb00ae.pdf" },
];

/** Filtered/full view of the Tier 0 catalog. This is what the get_tier0_catalog tool wraps. */
export function getTier0Catalog(options: { subTier?: Tier0SubTier; category?: Tier0Category } = {}): Tier0Product[] {
  return TIER0_CATALOG.filter(
    (product) =>
      (options.subTier === undefined || product.subTier === options.subTier) &&
      (options.category === undefined || product.category === options.category),
  );
}

export const TIER0_CATEGORIES: readonly Tier0Category[] = [
  "Marketing & Lead Gen",
  "Customer Experience & Retention",
  "Operations & Systems",
  "Pricing & Finance",
  "Hiring & Team",
  "Local SEO, Reputation & Digital Presence",
  "AI & Automation Starter Kits",
  "Retention Gifts",
];
