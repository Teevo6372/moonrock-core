# Mission 21B — Nova Character Media Prompt Pack

This pack defines the production prompts for the approved Nova character media consumed by the Moonrock 2.0 frontend.

## Continuity rule

Every state MUST use the same approved Nova reference image/character identity. Do not regenerate her identity independently between states. Preserve facial structure, skin tone, hair, wardrobe, proportions, age presentation, camera height, lens feel, background geometry, and key lighting. The goal is one continuous AI Employee changing behavior, not seven similar characters.

## Shared visual prompt

Use this shared direction at the beginning of every Higgsfield generation:

> Approved Nova character reference, premium cinematic AI business advisor in the Moonrock universe, realistic human presence rather than robot styling, dark dimensional galaxy-tech environment, restrained neon magenta purple and cyan practical lighting, premium enterprise technology aesthetic, medium portrait framing from approximately waist/chest upward, camera at eye level, subject centered with generous responsive crop safety, realistic skin and eyes, subtle natural breathing and micro-movements, stable camera, shallow dimensional depth, no text, no logos, no UI overlays, no customer information, no audio, no cuts, no large camera movement, seamless short loop.

### Negative direction

Avoid: identity drift, different hairstyle or wardrobe, exaggerated smile, cartoon/anime treatment, plastic skin, uncanny eyes, extra fingers/limbs, large gestures, dancing, rapid movement, dramatic zoom, camera orbit, scene cuts, floating words, baked-in holographic text, lip-sync dialogue, audio, generic chrome robot styling.

## State prompts

### 1. idle — `nova-idle`

Nova is calmly present and available. Relaxed direct attention toward the visitor, neutral-warm expression, subtle breathing, occasional natural blink, extremely small posture movement. Ambient Moonrock lighting moves almost imperceptibly around her. She should feel alive but never demand attention. Seamless 5–6 second loop.

### 2. listening — `nova-listening`

Nova is actively listening to the visitor. Attentive eye focus, slight natural head inclination, subtly softened brow and engaged expression, minimal movement. Convey curiosity and comprehension without nodding repeatedly or overacting. The cyan/magenta ambience may respond very subtly as if receiving information. Seamless 5–6 second loop.

### 3. thinking — `nova-thinking`

Nova is processing information. Her gaze shifts subtly off direct center for a moment, expression becomes analytical and concentrated, then settles. Very restrained light activity in the surrounding environment suggests computation without text or readable data. No exaggerated thinking pose and no hand-on-chin cliché. Seamless 5–6 second loop.

### 4. speaking — `nova-speaking`

Nova is confidently explaining guidance. Direct engaged eye contact, composed advisor posture, warm authority, subtle conversational facial movement and restrained hand/body micro-gesture. Do not generate specific spoken words or hard lip-sync; mouth movement should remain subtle enough for later voice/avatar work. Seamless 5–6 second loop.

### 5. diagnosis — `nova-diagnosis`

Nova is analyzing business bottlenecks. Focused professional expression, slightly stronger analytical intensity than thinking, direct attention alternating subtly with the surrounding data-like light ambience. Background energy becomes a little more structured and active, but contains no readable text or UI. She should communicate precision and competence, not alarm. Seamless 5–6 second loop.

### 6. recommendation — `nova-recommendation`

Nova has reached a clear recommendation and is presenting the Moonrock Flight Plan. Expression becomes subtly warmer and more confident, direct eye contact, poised reveal posture, restrained positive energy. Lighting can brighten slightly with balanced magenta/cyan dimensional highlights. Avoid celebratory gestures or salesy excitement. Seamless 5–6 second loop.

### 7. handoff — `nova-handoff`

Nova is transitioning the visitor to human-supported help when needed. Supportive, reassuring professional expression, slight open posture and gentle acknowledgement. The environment settles rather than intensifies. Convey continuity and confidence: Nova remains present while bringing in human support. Seamless 5–6 second loop.

## Generation sequence

Generate and approve `idle` first. Use that approved result as an additional continuity reference for every subsequent state. Generate `listening` and `thinking` next and compare identity/frame continuity before spending credits on the remaining four states. Only after those three match should `speaking`, `diagnosis`, `recommendation`, and `handoff` be generated.

## Export contract

For each approved state export:

- silent WebM loop: `nova-<state>.webm`
- matching WebP poster: `nova-<state>.webp`
- approximately 5–6 seconds
- portrait-forward composition with desktop/mobile crop safety
- optimized for web delivery
- no baked-in UI, pricing, customer data, captions, or logos

Place approved exports in `apps/moonrock-2-frontend/public/nova/`. The existing frontend media manifest will automatically select them by Nova runtime visual state; missing files continue to use the safe animated fallback.
