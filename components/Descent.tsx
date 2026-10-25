"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowDown, ArrowUpRight, X, Volume2, VolumeX } from "lucide-react";
import NailScene, { MotionState } from "./NailScene";
import { EDITORIAL_BEATS } from "./editorial";
import { EVENT } from "./event";
import { AmbientSoundscape } from "./ambient-soundscape";
gsap.registerPlugin(ScrollTrigger);
const chapters = ["Threshold", "Offering", "The fallen", "The gathering"];
export default function Descent() {
  const root = useRef<HTMLDivElement>(null),
    scale = useRef<HTMLDivElement>(null),
    lenis = useRef<Lenis | null>(null);
  const motion = useRef<MotionState>({
    progress: 0,
    velocity: 0,
    pointerX: 0,
    pointerY: 0,
    impact: 0,
    reduced: false,
    scaleAngle: 0,
    nailReady: false,
  });
  const [chapter, setChapter] = useState(0),
    [menu, setMenu] = useState(false),
    [sound, setSound] = useState(false),
    [details, setDetails] = useState(false);
  const soundscape = useRef<AmbientSoundscape | null>(null),
    soundIntent = useRef(false);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    motion.current.reduced = reduced;
    const scroll = new Lenis({
      duration: 1.15,
      smoothWheel: !reduced,
      touchMultiplier: 1,
    });
    lenis.current = scroll;
    scroll.on("scroll", ScrollTrigger.update);
    let raf = 0,
      last = 0,
      angle = 0,
      speed = 0,
      lookX = 0,
      lookY = 0;
    let timeline: gsap.core.Timeline;
    const ctx = gsap.context(() => {
      gsap.from(".hero-title h1", {
        y: 20,
        opacity: 0,
        duration: 1.6,
        ease: "power3.out",
      });
      gsap.from(".hand-chain", {
        y: -70,
        opacity: 0,
        duration: 1.6,
        delay: 0.25,
      });
      gsap.from(".hand-cup", {
        x: -50,
        opacity: 0,
        rotate: -20,
        duration: 1.6,
        delay: 0.4,
      });
      gsap.from(".hand-grip", {
        x: 65,
        y: 60,
        opacity: 0,
        rotate: 18,
        duration: 1.7,
        delay: 0.55,
      });
      timeline = gsap.timeline({
        scrollTrigger: {
          trigger: ".descent-track",
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true,
          scrub: reduced ? true : 0.65,
          onUpdate: (self) => {
            motion.current.velocity = self.getVelocity();
            setChapter(
              self.progress < 0.18
                ? 0
                : self.progress < 0.62
                  ? 1
                  : self.progress < 0.92
                    ? 2
                    : 3,
            );
          },
        },
      });
      timeline
        .to(
          ".gate",
          {
            scale: 4.5,
            yPercent: 12,
            opacity: 0,
            duration: 0.18,
            ease: "power2.in",
          },
          0,
        )
        .to(
          ".hero-title",
          { scale: 1.2, opacity: 0, y: -70, duration: 0.1 },
          0.01,
        )
        .to(".scroll-cue", { opacity: 0, duration: 0.03 }, 0)
        .to(
          ".hand-assembly",
          {
            rotation: 180,
            y: () => {
              const rig = root.current!.querySelector(
                ".scale-assembly",
              ) as HTMLElement;
              const holder = root.current!.querySelector(
                ".holding-hand",
              ) as HTMLElement;
              const hand = root.current!.querySelector(
                ".hand-assembly",
              ) as HTMLElement;
              return (
                rig.offsetTop +
                holder.offsetTop +
                holder.offsetHeight / 2 -
                hand.offsetTop -
                hand.offsetHeight / 2
              );
            },
            scale: () => {
              const holder = root.current!.querySelector(
                ".holding-hand",
              ) as HTMLElement;
              const hand = root.current!.querySelector(
                ".hand-assembly",
              ) as HTMLElement;
              return holder.offsetWidth / hand.offsetWidth;
            },
            duration: 0.225,
            ease: "power2.inOut",
          },
          0.025,
        )
        .fromTo(
          ".scale-assembly",
          { y: "50vh", opacity: 0, scale: 0.86 },
          { y: 0, opacity: 1, scale: 1, duration: 0.12 },
          0.13,
        )
        .to(".hand-assembly", { opacity: 0, duration: 0.025 }, 0.23)
        .fromTo(
          ".holding-hand",
          { opacity: 0 },
          { opacity: 1, duration: 0.025 },
          0.23,
        )
        .to(".opening-shadow", { opacity: 0, duration: 0.12 }, 0.1)
        .fromTo(
          ".definition-scene",
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.018 },
          0.665,
        )
        .to(".definition-scene", { opacity: 0, y: -16, duration: 0.018 }, 0.725)
        .fromTo(
          ".event-details",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.025 },
          0.965,
        )
        .to({}, { duration: 0.015 }, 0.985);
      for (const beat of EDITORIAL_BEATS) {
        timeline
          .fromTo(
            `.story-${beat.id}`,
            { opacity: 0, y: 28 },
            { opacity: 1, y: 0, duration: 0.018 },
            beat.enter,
          )
          .to(
            `.story-${beat.id}`,
            { opacity: 0, y: -25, duration: 0.018 },
            beat.leave,
          );
      }
    }, root);
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033) || 0.016;
      last = now;
      scroll.raf(now);
      const m = motion.current;
      m.progress = timeline?.progress() || 0;
      soundscape.current?.setDepth(m.progress);
      const weight =
        m.progress > 0.33 && m.progress < 0.56
          ? Math.min(7, (m.progress - 0.33) * 45)
          : 0;
      const torque = m.velocity * 0.002 + m.impact * 12;
      speed += ((weight - angle) * 15 - speed * 4.8 + torque) * dt;
      angle += speed * dt;
      m.impact *= Math.exp(-8 * dt);
      m.velocity *= Math.exp(-10 * dt);
      m.scaleAngle = reduced ? 0 : (angle * Math.PI) / 180;
      if (scale.current)
        scale.current.style.rotate = `${reduced ? 0 : angle}deg`;
      lookX += (m.pointerX - lookX) * (1 - Math.exp(-3.8 * dt));
      lookY += (m.pointerY - lookY) * (1 - Math.exp(-3.8 * dt));
      if (root.current) {
        root.current.style.setProperty(
          "--gate-x",
          `${reduced ? 0 : lookX * 23}px`,
        );
        root.current.style.setProperty(
          "--gate-y",
          `${reduced ? 0 : lookY * 15}px`,
        );
        root.current.style.setProperty(
          "--gate-rx",
          `${reduced ? 0 : -lookY * 1.1}deg`,
        );
        root.current.style.setProperty(
          "--gate-ry",
          `${reduced ? 0 : lookX * 1.8}deg`,
        );
        root.current.style.setProperty(
          "--title-x",
          `${reduced ? 0 : lookX * 5}px`,
        );
        root.current.dataset.phase = m.progress < 0.64 ? "objects" : "story";
        root.current.dataset.nailReady = String(m.nailReady);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const pointer = (e: PointerEvent) => {
      motion.current.pointerX = (e.clientX / innerWidth - 0.5) * 2;
      motion.current.pointerY = (e.clientY / innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", pointer);
    return () => {
      ctx.revert();
      cancelAnimationFrame(raf);
      scroll.destroy();
      window.removeEventListener("pointermove", pointer);
      soundscape.current?.dispose();
      soundscape.current = null;
      soundIntent.current = false;
    };
  }, []);
  useEffect(() => {
    if (!menu && !details) return;
    lenis.current?.stop();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setDetails(false);
      }
      if (e.key === "Tab") {
        const els = document
          .querySelector("[role=dialog]")
          ?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      lenis.current?.start();
      window.removeEventListener("keydown", key);
    };
  }, [menu, details]);
  const go = (i: number) => {
    setMenu(false);
    lenis.current?.start();
    const track = document.querySelector(".descent-track") as HTMLElement;
    lenis.current?.scrollTo(
      (track.offsetHeight - innerHeight) * [0, 0.4, 0.855, 0.985][i],
      { duration: 1.7 },
    );
  };
  const toggleSound = async () => {
    const next = !soundIntent.current;
    soundIntent.current = next;
    setSound(next);
    try {
      soundscape.current ??= new AmbientSoundscape();
      await soundscape.current.setEnabled(next);
    } catch {
      soundscape.current?.dispose();
      soundscape.current = null;
      soundIntent.current = false;
      setSound(false);
      setSoundUnavailable(true);
    }
  };

  return (
    <div
      ref={root}
      className="experience"
      data-phase="objects"
      data-nail-ready="false"
    >
      <NailScene motion={motion} />
      <div className="cave-vignette" />
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <button className="wordmark" onClick={() => go(0)}>
          KATÁBASIS
        </button>
        <div className="header-actions">
          <button
            onClick={toggleSound}
            disabled={soundUnavailable}
            title={
              soundUnavailable
                ? "Sound is unavailable in this browser"
                : "Chapel ambience"
            }
            aria-label={
              soundUnavailable
                ? "Sound unavailable"
                : sound
                  ? "Mute ambience"
                  : "Enable ambience"
            }
            aria-pressed={sound}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            className="menu-button"
            onClick={() => setMenu(true)}
            aria-label="Open chapter menu"
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      <nav className="chapter-rail" aria-label="Chapters">
        {chapters.map((c, i) => (
          <button
            key={c}
            onClick={() => go(i)}
            className={chapter === i ? "active" : ""}
            aria-label={`Chapter ${i + 1}: ${c}`}
          >
            <span>0{i + 1}</span>
            <i />
          </button>
        ))}
      </nav>
      <main className="descent-track">
        <div className="descent-stage">
          <div className="gate-parallax">
            <div className="gate">
              <div className="gate-aura" />
              <img
                src="/assets/be4b0b7d794d5769efea91ea8b35b775-removebg-preview.png"
                alt="A gothic threshold into the cave"
              />
            </div>
          </div>
          <div className="opening-shadow" aria-hidden="true" />
          <div className="hero-center">
            <div className="hero-title">
              <h1>KATÁBASIS</h1>
              <span className="hero-star">✧</span>
              <button
                className="scroll-cue"
                onClick={() => go(1)}
                aria-label="Begin the descent"
              >
                <span>DESCEND</span>
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
          <div className="hand-assembly" aria-hidden="true">
            <div className="hand-part hand-chain" />
            <div className="hand-part hand-cup" />
            <div className="hand-part hand-grip" />
          </div>
          <div className="scale-assembly">
            <div className="holding-hand" aria-hidden="true" />
            <div className="suspension-link" aria-hidden="true" />
            <div ref={scale} className="swaying-scale">
              <img
                src="/assets/scale%20fixed.jpg"
                alt="The scales sway beneath the falling iron"
              />
            </div>
          </div>
          <section
            className="definition-scene"
            aria-label="The meaning of Katábasis"
          >
            <div className="definition-note">
              <p className="pronunciation">
                /kaˈta.ba.sis/ <i>noun.</i>
              </p>
              <p>A descent into the underworld.</p>
            </div>
          </section>
          <section
            className="story story-nights editorial-left"
            aria-label="The night"
          >
            <div className="editorial-copy">
              <h2>
                Thy heard the call
                <br />
                <em>of night.</em>
              </h2>
              <p className="editorial-body">
                Now cross the threshold.
                <br />
                Follow the forsaken.
              </p>
              <span className="editorial-footnote"></span>
            </div>
          </section>
          <section
            className="story story-fallen editorial-right"
            aria-label="The fallen"
          >
            <div className="editorial-copy">
              {/* <span className="editorial-kicker">III / THE SURRENDER</span> */}
              <h2>
                Surrender
                <br />
                to the
                <br />
                <em>Abyss.</em>
              </h2>
              <p className="editorial-body">
                Wear your darkness. Move without restraint. The night belongs to
                us all.
              </p>
            </div>
          </section>
          <section
            className="story story-beauty editorial-left"
            aria-label="Surrender"
          >
            <div className="editorial-copy">
              <h2>
                Come nightfall,
                <br />
                <em>we convene</em>
              </h2>
              <p className="editorial-body">
                Sound as invocation. Shadow as sanctuary.
                <br />A place to lose the world above.
              </p>
            </div>
          </section>
          <section className="event-details" aria-label="Event details">
            <div className="event-heading">
              <span>YOU HAVE ARRIVED</span>
              <h2>Katábasis</h2>
            </div>
            <div className="event-facts">
              <div>
                <span>WHEN</span>
                <p>
                  <time dateTime={EVENT.dateISO}>{EVENT.dateLabel}</time>
                </p>
              </div>
              <div>
                <span>WHERE</span>
                <p>{EVENT.location}</p>
              </div>
            </div>
            <button
              className="invitation-button"
              onClick={() => setDetails(true)}
            >
              THE FORSAKEN <ArrowUpRight size={17} />
            </button>
          </section>
        </div>
      </main>
      <div className="chapter-indicator" aria-hidden="true">
        0{chapter + 1} <span>/ 04</span>
      </div>
      {menu && (
        <div
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Chapters"
        >
          <button
            className="close-button"
            autoFocus
            onClick={() => setMenu(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
          <nav>
            {chapters.map((c, i) => (
              <button key={c} onClick={() => go(i)}>
                <span>0{i + 1}</span>
                {c}
                <ArrowUpRight size={20} />
              </button>
            ))}
          </nav>
        </div>
      )}
      {details && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetails(false);
          }}
        >
          <section
            className="invitation forsaken"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-title"
          >
            <button
              className="close-button"
              autoFocus
              aria-label="Close Forsaken"
              onClick={() => setDetails(false)}
            >
              <X size={20} />
            </button>
            <div className="forsaken-frame" aria-hidden="true" />
            <div className="forsaken-hand" aria-hidden="true" />
            <div className="forsaken-copy">
              <span className="forsaken-kicker">I · ANCIENT &amp; OCCULT</span>
              <h2 id="event-title">The nature of the Forsaken is not for <em>the uninitiated.</em></h2>
              <p>A private collective bound by a shared affinity for the nocturnal and the obscure. We gather where the veil grows thin, drawn together by what cannot be named.</p>
              <p className="forsaken-vow">You do not seek the Forsaken.<br /><em>The Forsaken find you.</em></p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
