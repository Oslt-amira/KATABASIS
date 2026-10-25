// Copy placement and the nail's opposite anchor live together so new editorial beats
// can extend the choreography without editing the Three.js renderer.
export const EDITORIAL_BEATS = [
 { id: 'nights', enter: .745, leave: .805, side: 'left', nailX: .245, mobileNailX: .27, nailY: -.015, mobileNailY: -.045 },
 { id: 'fallen', enter: .835, leave: .885, side: 'right', nailX: -.25, mobileNailX: -.275, nailY: 0, mobileNailY: -.035 },
 { id: 'beauty', enter: .905, leave: .947, side: 'left', nailX: .245, mobileNailX: .27, nailY: 0, mobileNailY: -.04 },
] as const;

const ease = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t*t*(3-2*t); };
export function editorialNailAnchor(progress: number, mobile: boolean) {
 let x = 0, y = 0;
 for (const beat of EDITORIAL_BEATS) {
  const t = ease((progress - (beat.enter - .025)) / .035);
  x += ((mobile ? beat.mobileNailX : beat.nailX) - x) * t;
  y += ((mobile ? beat.mobileNailY : beat.nailY) - y) * t;
 }
 const returnToCenter = ease((progress - .952) / .028);
 return { x: x * (1-returnToCenter), y: y * (1-returnToCenter) };
}
