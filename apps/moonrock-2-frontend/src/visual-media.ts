import type { DiscoveryView } from "./types.js";

export type NovaVisualState = DiscoveryView["visualState"];
export type NovaPersonalityBehavior = "excited" | "playful" | "comical" | "energetic" | "sarcastic" | "seductive";

export interface NovaMediaManifestEntry {
  poster: string;
  video?: string;
  alt: string;
}

const canonicalPoster = "https://d2ol7oe51mr4n9.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/1895357a-fd6d-42e7-89c6-969a37c9d58b.png";

function envVideo(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/**
 * Stable frontend contract for approved Higgsfield Nova media.
 * Launch defaults point to approved exports; VITE_NOVA_*_VIDEO variables can
 * replace hosting later without changing discovery/business logic.
 */
export const novaMediaManifest: Record<NovaVisualState, NovaMediaManifestEntry> = {
  idle: {
    poster: canonicalPoster,
    alt: "Nova, Moonrock's AI growth advisor, waiting to begin.",
  },
  listening: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_LISTENING_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_014628_1ef79f83-6060-47d6-8261-17967e134f89.mp4"),
    alt: "Nova listening during business discovery.",
  },
  thinking: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_THINKING_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_015133_9dd57b4f-b238-4311-96d1-e1d7e1a3975c.mp4"),
    alt: "Nova analyzing business information.",
  },
  speaking: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_SPEAKING_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_015555_3a586da1-d879-4e82-ad04-92e2f1cbfe99.mp4"),
    alt: "Nova presenting guidance.",
  },
  diagnosis: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_DIAGNOSIS_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_020137_0c797d0f-8458-4f6f-a62b-214a4e5706a2.mp4"),
    alt: "Nova diagnosing business bottlenecks.",
  },
  recommendation: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_RECOMMENDATION_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_020615_1b1f7810-4afd-4f8c-89e4-f8c55feddf01.mp4"),
    alt: "Nova presenting a Moonrock Flight Plan recommendation.",
  },
  handoff: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_HANDOFF_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_021144_b385a0bd-d2c1-481d-b458-e6523b7f84dc.mp4"),
    alt: "Nova preparing a human-supported handoff.",
  },
};

export const novaPersonalityManifest: Record<NovaPersonalityBehavior, NovaMediaManifestEntry> = {
  excited: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_EXCITED_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_022412_f2961ea1-2882-4f64-8b7d-a8d750820fd2.mp4"),
    alt: "Nova reacting with upbeat excitement.",
  },
  playful: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_PLAYFUL_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_022427_a105294d-34c8-45f5-8970-b5319700378b.mp4"),
    alt: "Nova showing playful warmth.",
  },
  comical: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_COMICAL_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_022440_68da07dc-bcde-4aee-859e-ba0470dd091d.mp4"),
    alt: "Nova reacting with light humor.",
  },
  energetic: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_ENERGETIC_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_022454_8377fa8e-fe47-40b9-b3bf-6e14137930b8.mp4"),
    alt: "Nova showing energetic momentum.",
  },
  sarcastic: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_SARCASTIC_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_022509_b391f12a-d54a-41b3-b369-5cc81630986c.mp4"),
    alt: "Nova responding with playful sarcasm.",
  },
  seductive: {
    poster: canonicalPoster,
    video: envVideo("VITE_NOVA_SEDUCTIVE_VIDEO", "https://d8j0ntlcm91z4.cloudfront.net/user_3GXnsT6BQBJvIqUvUof0HyScdTK/hf_20260818_023028_9461ba65-ddbe-4ebc-95cd-ea5dbbd26ee5.mp4"),
    alt: "Nova showing a more daring adult personality expression.",
  },
};

export function mediaForState(state: NovaVisualState): NovaMediaManifestEntry {
  return novaMediaManifest[state] ?? novaMediaManifest.idle;
}

export function mediaForBehavior(behavior: NovaPersonalityBehavior): NovaMediaManifestEntry {
  return novaPersonalityManifest[behavior];
}
