import type Anthropic from "@anthropic-ai/sdk";
import { AI_EMPLOYEE_CATALOG, GHL_SAAS_CATALOG, WEBSITE_BUILD_CATALOG, type ServiceTier } from "./ai-employee-catalog.js";
import { ALA_CARTE_CATALOG, type AlaCarteItemId } from "./ala-carte-catalog.js";
import { composeAlaCarteBundle, composeCrossTierBundle } from "./ascension-bundle.js";
import { classifyServiceTier, diagnoseBusiness, diagnoseGhlSaas, diagnoseWebsiteBuild, type DiagnosticInput } from "./diagnostic-engine.js";
import type { DiscoverySessionState } from "./discovery-session.js";
import { evaluateFastTrack } from "./fast-track.js";
import { buildFlightPlan } from "./flight-plan.js";

/**
 * Every tool this generator declares to Claude is a thin wrapper around an
 * already-tested deterministic function. Tools take zero arguments (and
 * close over server-known state) wherever possible - the one exception is
 * compose_bundle, where mapping the visitor's own words onto a fixed catalog
 * enum is legitimately Claude's job. This is what makes hallucinated pricing
 * structurally impossible: Claude never supplies the business facts a price
 * or tier decision is based on, only the server's own already-known state.
 */
export interface NovaToolContext {
  answers: Partial<DiagnosticInput>;
  state: DiscoverySessionState;
}

const ALA_CARTE_ITEM_IDS: readonly AlaCarteItemId[] = Object.keys(ALA_CARTE_CATALOG) as AlaCarteItemId[];

const EMPTY_OBJECT_SCHEMA: Anthropic.Tool.InputSchema = { type: "object", properties: {}, required: [], additionalProperties: false };

export const NOVA_TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_business_diagnosis",
    description: "Diagnose the visitor's business against Moonrock's AI Employee bottleneck model. Returns the recommended AI Employee offer id, the bottlenecks found, and whether this sale can close autonomously. Call before naming any AI Employee offer, price, or bottleneck-based reasoning.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
  {
    name: "get_website_build_diagnosis",
    description: "Diagnose the visitor's website-build needs. Returns the recommended Website Build tier (Starter/Growth/Custom Site) and why. Call before naming a Website Build tier or price.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
  {
    name: "get_ghl_saas_diagnosis",
    description: "Diagnose an agency/reseller visitor's white-label plan needs. Returns the recommended plan, its price, seats, and features. Call before naming a white-label reseller plan or price.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
  {
    name: "classify_service_tier",
    description: "Classify which of Moonrock's four service tiers (ai_employee, website_build, ghl_saas, ala_carte) best fits the visitor based on everything known so far. Call when it's unclear which ladder rung to recommend from.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
  {
    name: "get_catalog",
    description: "Get the authoritative offer list (exact names, prices, included features, delivery estimates) for one of Moonrock's four catalogs. Call before naming any offer, price, or included feature - never state one from memory.",
    input_schema: {
      type: "object",
      properties: {
        tier: {
          type: "string",
          enum: ["ai_employee", "website_build", "ghl_saas", "ala_carte"],
          description: "Which catalog to return.",
        },
      },
      required: ["tier"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "compose_bundle",
    description: "Compose a priced bundle from Trust Builder / Ascension Add-On / Custom Build items the visitor asked for, applying the Always-Bundle CRM rule automatically. Call before quoting any bundled total. Map the visitor's own words onto the closed item-id list below - never invent an id.",
    input_schema: {
      type: "object",
      properties: {
        requestedItemIds: {
          type: "array",
          items: { type: "string", enum: [...ALA_CARTE_ITEM_IDS] },
          description: "The exact catalog item ids the visitor asked for.",
        },
        hasExistingCrm: {
          type: "boolean",
          description: "Whether the visitor already has a CRM in place, if stated. Omit if unknown.",
        },
      },
      required: ["requestedItemIds"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "build_flight_plan",
    description: "Build the visitor's Flight Plan document: primary AI Employee recommendation, evidence-backed add-ons, any future upgrade, opportunity estimate, and required disclosures. Call before presenting a Flight Plan or restating any of its numbers.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
  {
    name: "check_fast_track_eligibility",
    description: "Check whether this visitor's signals justify skipping ahead to a premium AI Employee/AI Workforce offer early, regardless of the tier they entered through. Call before suggesting a fast-track / early-upgrade path.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
  {
    name: "get_ascension_state",
    description: "Read the visitor's already-computed ascension score, band, and current/last-offered tier for this session. Read-only - never computes or mutates anything. Call before referencing the visitor's score, band, or tier.",
    input_schema: EMPTY_OBJECT_SCHEMA,
    strict: true,
  },
];

function primaryTierFor(ctx: NovaToolContext): ServiceTier {
  return ctx.state.tier ?? classifyServiceTier(ctx.answers as DiagnosticInput).tier;
}

function catalogFor(tier: string): unknown {
  switch (tier) {
    case "ai_employee":
      return Object.values(AI_EMPLOYEE_CATALOG);
    case "website_build":
      return Object.values(WEBSITE_BUILD_CATALOG);
    case "ghl_saas":
      return Object.values(GHL_SAAS_CATALOG);
    case "ala_carte":
      return Object.values(ALA_CARTE_CATALOG);
    default:
      throw new Error(`Unknown catalog tier: ${tier}`);
  }
}

/**
 * Executes one tool_use block against server-known state. Never trusts
 * Claude-supplied business facts for anything price/tier-related - only
 * compose_bundle takes real Claude-supplied input (a closed enum array).
 */
export function executeNovaTool(name: string, rawInput: unknown, ctx: NovaToolContext): unknown {
  const input = ctx.answers as DiagnosticInput;
  switch (name) {
    case "get_business_diagnosis":
      return diagnoseBusiness(input);
    case "get_website_build_diagnosis":
      return diagnoseWebsiteBuild(input);
    case "get_ghl_saas_diagnosis":
      return diagnoseGhlSaas(input);
    case "classify_service_tier":
      return classifyServiceTier(input);
    case "get_catalog": {
      const { tier } = rawInput as { tier: string };
      return catalogFor(tier);
    }
    case "compose_bundle": {
      const { requestedItemIds, hasExistingCrm } = rawInput as { requestedItemIds: AlaCarteItemId[]; hasExistingCrm?: boolean };
      return composeAlaCarteBundle(requestedItemIds, hasExistingCrm !== undefined ? { hasExistingCrm } : {});
    }
    case "build_flight_plan": {
      const diagnostic = diagnoseBusiness(input);
      const bundle = composeCrossTierBundle(primaryTierFor(ctx), input, input.alaCarteItemsRequested ?? []);
      return buildFlightPlan(input, diagnostic, { ...(bundle ? { bundle } : {}), confirmed: ctx.state.completed });
    }
    case "check_fast_track_eligibility": {
      const diagnostic = diagnoseBusiness(input);
      return evaluateFastTrack(input, diagnostic.bottlenecks);
    }
    case "get_ascension_state":
      return {
        ascensionScore: ctx.state.ascensionScore,
        ascensionBand: ctx.state.ascensionBand,
        currentTier: ctx.state.currentTier,
        lastOfferedTier: ctx.state.lastOfferedTier,
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
