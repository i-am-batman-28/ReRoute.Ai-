"use client";

import { useId } from "react";

import { motion, useReducedMotion } from "framer-motion";

/** Matches React Bits Grainient preset: https://reactbits.dev/backgrounds/grainient?color1=d7d0d7&color2=91fd98&color3=adffb3 */
const COLOR_1 = "#d7d0d7";
const COLOR_2 = "#91fd98";
const COLOR_3 = "#adffb3";

/**
 * Full-viewport grainy gradient background (animated blobs + noise).
 * Use as the bottom layer: parent should be `relative min-h-screen overflow-hidden`.
 */
export function Grainient() {
  const noiseId = useId().replace(/:/g, "");
  const filterId = `grainient-noise-${noiseId}`;
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ backgroundColor: COLOR_1 }} />

      <motion.div
        className="absolute -left-[20%] top-[-10%] h-[min(85vh,720px)] w-[min(85vh,720px)] rounded-full blur-[100px]"
        style={{ backgroundColor: COLOR_2, opacity: 0.72 }}
        animate={
          reduceMotion
            ? {}
            : {
                x: [0, 36, -12, 0],
                y: [0, 28, 8, 0],
              }
        }
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[15%] bottom-[-15%] h-[min(80vh,680px)] w-[min(80vh,680px)] rounded-full blur-[110px]"
        style={{ backgroundColor: COLOR_3, opacity: 0.68 }}
        animate={
          reduceMotion
            ? {}
            : {
                x: [0, -32, 14, 0],
                y: [0, -24, -10, 0],
              }
        }
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute left-[25%] top-[40%] h-[min(55vh,480px)] w-[min(55vh,480px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[88px]"
        style={{ backgroundColor: COLOR_2, opacity: 0.45 }}
        animate={reduceMotion ? {} : { scale: [1, 1.12, 0.96, 1], opacity: [0.4, 0.52, 0.4] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute right-[20%] top-[15%] h-[min(45vh,400px)] w-[min(45vh,400px)] rounded-full blur-[80px]"
        style={{ backgroundColor: COLOR_3, opacity: 0.5 }}
        animate={reduceMotion ? {} : { scale: [1, 1.06, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg
        className="absolute inset-0 h-full w-full opacity-[0.38] mix-blend-soft-light"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0"
              result="mono"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}
