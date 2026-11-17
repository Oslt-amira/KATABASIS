# KATÁBASIS

Mobile-first gothic scroll experience built with Next.js, GSAP ScrollTrigger, Lenis, Three.js, and Rapier.

## Run

- `npm install`
- `npm run dev` — local preview at http://localhost:3000
- `npm run check` — TypeScript
- `npm run test:graphics` — WebGL creation failures and context cleanup
- `npm run test:audio` — playback, mute races, and audio cleanup
- `npm run build` — static production export in `out/`

## Sequence

Gate/title → three-part hand assembly → 180-degree turn → swaying scale → tumbling iron → edge nail rolls and corkscrews into the center → three short story beats → date and location.

Story visibility is gated by the nail actually arriving at its center target. The definition appears first, below the centered nail. The supplied event date is October 13, 2026; the location is to be revealed.

## Physics

Rapier runs fixed 1/120-second steps, with continuous collision detection, compound head/shaft colliders, pan colliders and rims, restitution, friction, and 3-axis angular velocity. Nails collide with the pans and each other. The scale responds to impacts through a damped spring. The guide stays dynamic at the rim through a spherical contact constraint. Its exit captures linear and angular velocity for a continuous Hermite trajectory, then uses damped tracking through the editorial sections. Reverse scrolling resets the rain. Rapier initialization is cached across React Strict Mode mounts.

## Exact Meshy model — pending input

The supplied Meshy share link loads its viewer, but the GLB download requires Meshy sign-in. Its proprietary preview file is not a standard GLB. No proprietary decoding is performed. The current geometry is a clearly temporary preview, not the supplied Meshy model.

To finish model integration, place the downloaded GLB at `public/models/nail.glb` and set `NAIL_MODEL_URL` in `components/model-config.ts` to `/models/nail.glb`. `GLTFLoader` normalizes the model height and replaces both the lead nail and rain geometry, preserving its materials.

## Assets and hosting

Original imagery is preserved in `assets/`. Local fonts, imagery, and the generated cave backdrop are in `public/`. Cave provenance and prompt: `docs/asset-notes.md`.

The source is local. An initial Sites project identity exists in `.openai/hosting.json`; external upload was blocked by automatic approval review pending explicit permission. No deployment is claimed. A public guest URL will be needed for printed QR codes.

## Editorial revision

Three short passages alternate left/right copy, with matching opposite nail anchors in `components/editorial.ts`. Add new beats there to extend the nail choreography. The definition returns as a dictionary note in the first passage. The opening uses locally served Cinzel Decorative in oxblood, with the descend cue directly under the star. The hand crossfades into a persistent holder attached to the scale assembly; it remains until the offering leaves. The nail render layer is monochrome, including future imported models.

## Final-drop choreography and opening depth

The last body is the guide nail. It drops after all ordinary nails, bounces with Rapier contacts, and receives a mass-scaled roll impulse toward the outer rim. At the rim, a dynamic pivot preserves gravity-driven rocking; the body is never frozen into a kinematic pose. The guide transition captures that body's actual pose, replacing the former staged edge spawn. The simulation catches up in fixed steps during fast scrolling and resets when scrolling backward. Run `npm run test:physics` for drop order, bounce, edge arrival, and reset checks across mobile/desktop sizes and five pan angles.

The opening has separate cave, gate, and title parallax planes, plus a top-to-bottom wine-red shadow gradient. The title/cue group is vertically centered. IM Fell English provides the letterpress heading style; Libre Caslon Text provides body copy.

## Browser graphics and ambience

Only the nail layer requests WebGL. The cave, vignette, and drifting dust use CSS. The renderer preflights WebGL2 availability, uses a bounded pixel ratio and the default GPU preference, and explicitly releases its context on cleanup. If WebGL is unavailable or a context is lost, animated monochrome nail images follow the same Rapier simulation and editorial path. Append `?graphics=basic` locally to verify this fallback.

The soundscape combines bowed harmonics, filtered cave air, and distant metallic bells through a long stereo reverberation. Its tone and room balance deepen with the descent. Playback fades on mute, suspends when the tab is hidden, and releases its audio graph on unmount. The page requests autoplay and retries on the first interaction if the browser blocks it. No external recording is used.

## Responsive motion timing

Rain advances in real elapsed time through a 120 Hz fixed simulation, with interpolated render poses. Concave pan segments provide curved contact normals; capsule shafts and cylindrical heads provide shape-based impacts. Collision events drive impact counts and scale response. The final nail spawns at 1.95 simulated seconds, after the ordinary rain, and stays dynamic at the rim. Its 0.85-second Hermite exit captures momentum without a second easing spring. Text retains alternating left/right columns, with each column centered vertically. Checks cover static pan angles, moving pans at 30/60/120 fps, rim rocking, release momentum, and reset.
