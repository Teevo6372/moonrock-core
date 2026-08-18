import "./visual-stage.css";
import { mediaForBehavior, mediaForState, type NovaPersonalityBehavior, type NovaVisualState, type NovaMediaManifestEntry } from "./visual-media.js";

type NovaProcessingState = "thinking" | "diagnosis";
type NovaTransientState = "speaking";

export interface NovaVisualStage {
  setState: (state: NovaVisualState) => void;
  setBusy: (busy: boolean, processingState?: NovaProcessingState) => void;
  playTransientState: (state: NovaTransientState, durationMs?: number) => void;
  playBehavior: (behavior: NovaPersonalityBehavior) => void;
}

export function createNovaVisualStage(host: HTMLElement): NovaVisualStage {
  const stage = document.createElement("aside");
  stage.className = "nova-visual-stage";
  stage.setAttribute("aria-label", "Nova visual presence");
  stage.innerHTML = `
    <div class="nova-orbit nova-orbit-a" aria-hidden="true"></div>
    <div class="nova-orbit nova-orbit-b" aria-hidden="true"></div>
    <div class="nova-media-shell">
      <div class="nova-fallback" aria-hidden="true">
        <span class="nova-core"></span>
        <span class="nova-aura"></span>
      </div>
      <video id="nova-state-video" class="nova-state-media" muted playsinline preload="metadata" hidden></video>
      <img id="nova-state-poster" class="nova-state-media" alt="" hidden>
    </div>
    <div class="nova-state-chip"><span class="nova-live-dot"></span><span id="nova-state-label">NOVA ONLINE</span></div>
  `;
  host.prepend(stage);

  const video = stage.querySelector<HTMLVideoElement>("#nova-state-video")!;
  const poster = stage.querySelector<HTMLImageElement>("#nova-state-poster")!;
  const label = stage.querySelector<HTMLSpanElement>("#nova-state-label")!;
  let currentState: NovaVisualState = "idle";
  let isBusy = false;
  let activeBehavior: NovaPersonalityBehavior | undefined;
  let behaviorTimer: number | undefined;
  let transientTimer: number | undefined;

  const showFallback = (): void => {
    video.hidden = true;
    poster.hidden = true;
    stage.classList.remove("has-media");
  };

  const clearBehaviorTimer = (): void => {
    if (behaviorTimer !== undefined) window.clearTimeout(behaviorTimer);
    behaviorTimer = undefined;
  };

  const clearTransientTimer = (): void => {
    if (transientTimer !== undefined) window.clearTimeout(transientTimer);
    transientTimer = undefined;
  };

  const loadMedia = (media: NovaMediaManifestEntry, loop: boolean): void => {
    video.pause();
    video.hidden = true;
    poster.hidden = true;
    stage.classList.remove("has-media");
    video.loop = loop;
    if (media.video) {
      video.src = media.video;
      video.load();
    } else {
      video.removeAttribute("src");
    }
    poster.src = media.poster;
    poster.alt = media.alt;
  };

  const renderOperationalState = (state: NovaVisualState): void => {
    stage.dataset.state = state;
    delete stage.dataset.behavior;
    label.textContent = state === "idle" ? "NOVA ONLINE" : `NOVA · ${state.replaceAll("_", " ").toUpperCase()}`;
    loadMedia(mediaForState(state), true);
  };

  const restoreOperationalState = (): void => {
    clearBehaviorTimer();
    clearTransientTimer();
    activeBehavior = undefined;
    if (isBusy) return;
    renderOperationalState(currentState);
  };

  video.addEventListener("canplay", () => {
    video.hidden = false;
    poster.hidden = true;
    stage.classList.add("has-media");
    void video.play().catch(() => undefined);
  });
  video.addEventListener("ended", () => {
    if (activeBehavior) restoreOperationalState();
  });
  video.addEventListener("error", showFallback);
  poster.addEventListener("load", () => {
    if (!video.hidden) return;
    poster.hidden = false;
    stage.classList.add("has-media");
  });
  poster.addEventListener("error", showFallback);

  const setState = (state: NovaVisualState): void => {
    currentState = state;
    if (activeBehavior || isBusy || transientTimer !== undefined) return;
    renderOperationalState(state);
  };

  const setBusy = (busy: boolean, processingState: NovaProcessingState = "thinking"): void => {
    isBusy = busy;
    stage.classList.toggle("is-busy", busy);
    clearTransientTimer();
    if (busy) {
      clearBehaviorTimer();
      activeBehavior = undefined;
      stage.dataset.state = processingState;
      delete stage.dataset.behavior;
      label.textContent = `NOVA · ${processingState.toUpperCase()}`;
      loadMedia(mediaForState(processingState), true);
    } else {
      renderOperationalState(currentState);
    }
  };

  const playTransientState = (state: NovaTransientState, durationMs = 1200): void => {
    if (isBusy || activeBehavior) return;
    clearTransientTimer();
    stage.dataset.state = state;
    delete stage.dataset.behavior;
    label.textContent = `NOVA · ${state.toUpperCase()}`;
    loadMedia(mediaForState(state), true);
    transientTimer = window.setTimeout(() => {
      transientTimer = undefined;
      renderOperationalState(currentState);
    }, durationMs);
  };

  const playBehavior = (behavior: NovaPersonalityBehavior): void => {
    if (isBusy) return;
    clearBehaviorTimer();
    clearTransientTimer();
    activeBehavior = behavior;
    stage.dataset.behavior = behavior;
    label.textContent = `NOVA · ${behavior.toUpperCase()}`;
    loadMedia(mediaForBehavior(behavior), false);
    behaviorTimer = window.setTimeout(restoreOperationalState, 6500);
  };

  setState("idle");
  return { setState, setBusy, playTransientState, playBehavior };
}
