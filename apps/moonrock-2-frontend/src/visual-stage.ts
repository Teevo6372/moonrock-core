import "./visual-stage.css";
import { mediaForState, type NovaVisualState } from "./visual-media.js";

export interface NovaVisualStage {
  setState: (state: NovaVisualState) => void;
  setBusy: (busy: boolean) => void;
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
      <video id="nova-state-video" class="nova-state-media" muted playsinline loop preload="metadata" hidden></video>
      <img id="nova-state-poster" class="nova-state-media" alt="" hidden>
    </div>
    <div class="nova-state-chip"><span class="nova-live-dot"></span><span id="nova-state-label">NOVA ONLINE</span></div>
  `;
  host.prepend(stage);

  const video = stage.querySelector<HTMLVideoElement>("#nova-state-video")!;
  const poster = stage.querySelector<HTMLImageElement>("#nova-state-poster")!;
  const label = stage.querySelector<HTMLSpanElement>("#nova-state-label")!;
  let currentState: NovaVisualState = "idle";

  const showFallback = (): void => {
    video.hidden = true;
    poster.hidden = true;
    stage.classList.remove("has-media");
  };

  video.addEventListener("canplay", () => {
    video.hidden = false;
    poster.hidden = true;
    stage.classList.add("has-media");
    void video.play().catch(() => undefined);
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
    stage.dataset.state = state;
    label.textContent = state === "idle" ? "NOVA ONLINE" : `NOVA · ${state.replaceAll("_", " ").toUpperCase()}`;
    const media = mediaForState(state);
    video.pause();
    video.hidden = true;
    poster.hidden = true;
    stage.classList.remove("has-media");
    if (media.video) {
      video.src = media.video;
      video.load();
    } else {
      video.removeAttribute("src");
    }
    poster.src = media.poster;
    poster.alt = media.alt;
  };

  const setBusy = (busy: boolean): void => {
    stage.classList.toggle("is-busy", busy);
    if (busy) {
      stage.dataset.state = "thinking";
      label.textContent = "NOVA · THINKING";
    } else {
      setState(currentState);
    }
  };

  setState("idle");
  return { setState, setBusy };
}
