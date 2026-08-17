# Mission 21 — Higgsfield Nova Visual Asset Contract

The Moonrock 2.0 frontend now consumes state-specific Nova media without coupling discovery or CRM logic to Higgsfield.

## Required approved exports

Place optimized exports in `apps/moonrock-2-frontend/public/nova/` using these exact names:

- `nova-idle.webm` and `nova-idle.webp`
- `nova-listening.webm` and `nova-listening.webp`
- `nova-thinking.webm` and `nova-thinking.webp`
- `nova-speaking.webm` and `nova-speaking.webp`
- `nova-diagnosis.webm` and `nova-diagnosis.webp`
- `nova-recommendation.webm` and `nova-recommendation.webp`
- `nova-handoff.webm` and `nova-handoff.webp`

If an export is absent or fails to load, the frontend intentionally falls back to the animated Moonrock Nova energy-core treatment.

## Visual direction for Higgsfield

Use the approved Nova identity and Moonrock aesthetic: premium cinematic sci-fi, dark galaxy environment, neon magenta/purple/cyan accents, realistic dimensional lighting, credible business-technology tone, no generic robot styling, no embedded text, and no autoplay audio.

Keep Nova composition consistent across all states so transitions feel like one continuous character rather than unrelated generated clips. Favor restrained head/eye/body movement suitable for looping UI presence. Avoid large camera moves, cuts, lip-sync dialogue, or gestures that will become distracting behind interactive controls.

### State intent

- **idle** — calm presence, subtle breathing/ambient movement, direct but relaxed attention.
- **listening** — attentive eye focus and slight listening posture.
- **thinking** — restrained analytical motion, subtle light response, no exaggerated acting.
- **speaking** — confident guidance posture suitable for future voice synchronization.
- **diagnosis** — focused analytical state with more pronounced data/light ambience.
- **recommendation** — warmer, confident reveal state for the completed Flight Plan.
- **handoff** — supportive transition state indicating human support/escalation.

## Export guidance

- Preferred video: WebM, silent, seamless loop, approximately 4–8 seconds.
- Preferred poster: WebP from the matching state.
- Portrait-forward composition with safe crop for desktop and mobile.
- Keep files aggressively optimized for web delivery; visual quality should remain high without turning the hero into a multi-megabyte blocking asset.
- Do not bake customer data, pricing, UI text, logos, or controls into the media.

GitHub remains the source of truth. Higgsfield is the visual generation environment; approved exports are committed into the frontend repository before production use.
