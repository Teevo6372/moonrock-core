import type { DiscoveryView } from "./types.js";

export type NovaVisualState = DiscoveryView["visualState"];

export interface NovaMediaManifestEntry {
  poster: string;
  video?: string;
  alt: string;
}

/**
 * Stable frontend contract for Higgsfield-generated Nova media.
 * Replace the files under /public/nova with approved exports without changing discovery logic.
 */
export const novaMediaManifest: Record<string, NovaMediaManifestEntry> = {
  idle: {
    poster: "/nova/nova-idle.webp",
    video: "/nova/nova-idle.webm",
    alt: "Nova, Moonrock's AI growth advisor, waiting to begin.",
  },
  listening: {
    poster: "/nova/nova-listening.webp",
    video: "/nova/nova-listening.webm",
    alt: "Nova listening during business discovery.",
  },
  thinking: {
    poster: "/nova/nova-thinking.webp",
    video: "/nova/nova-thinking.webm",
    alt: "Nova analyzing business information.",
  },
  speaking: {
    poster: "/nova/nova-speaking.webp",
    video: "/nova/nova-speaking.webm",
    alt: "Nova presenting guidance.",
  },
  diagnosis: {
    poster: "/nova/nova-diagnosis.webp",
    video: "/nova/nova-diagnosis.webm",
    alt: "Nova diagnosing business bottlenecks.",
  },
  recommendation: {
    poster: "/nova/nova-recommendation.webp",
    video: "/nova/nova-recommendation.webm",
    alt: "Nova presenting a Moonrock Flight Plan recommendation.",
  },
  handoff: {
    poster: "/nova/nova-handoff.webp",
    video: "/nova/nova-handoff.webm",
    alt: "Nova preparing a human-supported handoff.",
  },
};

export function mediaForState(state: NovaVisualState): NovaMediaManifestEntry {
  return novaMediaManifest[state] ?? novaMediaManifest.idle;
}
