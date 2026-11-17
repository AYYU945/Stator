import type { Transition } from 'motion/react';

/**
 * Stator 1.0 Motion System
 *
 * Principles:
 * 1. Cause and effect: Every transition communicates state change or spatial hierarchy.
 * 2. Compositor-first: Animate transform and opacity; avoid layout thrashing on large queues.
 * 3. Calm precision: Microinteractions 100–180ms, layout transitions 180–280ms, signature studio transitions 250–380ms.
 * 4. Reduced-motion safe: Root <MotionConfig reducedMotion="user"> disables spatial travel cleanly.
 */

export const STATOR_EASE = [0.16, 1, 0.3, 1] as const;

export const STATOR_DURATION = {
  micro: 0.14,
  fast: 0.2,
  medium: 0.25,
  view: 0.24,
  signature: 0.3,
} as const;

export const STATOR_SPRING = {
  /** Primary snappy spring for nav highlights, tabs, and framing */
  tactile: {
    type: 'spring',
    stiffness: 460,
    damping: 36,
    mass: 0.8,
  } satisfies Transition,
  /** Calm spring for drawers, modals, and tool groups */
  gentle: {
    type: 'spring',
    stiffness: 350,
    damping: 32,
    mass: 0.9,
  } satisfies Transition,
  /** Tight mechanical snap for toggle switch thumbs */
  switchKnob: {
    type: 'spring',
    stiffness: 560,
    damping: 34,
  } satisfies Transition,
} as const;

export const STATOR_TRANSITION = {
  view: {
    duration: STATOR_DURATION.view,
    ease: STATOR_EASE,
  } satisfies Transition,
  signature: {
    duration: STATOR_DURATION.signature,
    ease: STATOR_EASE,
  } satisfies Transition,
  overlay: {
    duration: STATOR_DURATION.fast,
    ease: STATOR_EASE,
  } satisfies Transition,
  drawer: {
    duration: STATOR_DURATION.medium,
    ease: STATOR_EASE,
  } satisfies Transition,
  micro: {
    duration: STATOR_DURATION.micro,
    ease: STATOR_EASE,
  } satisfies Transition,
} as const;

/**
 * Caps stagger delay at 8 items so large 100+ file batches never queue slow cascades.
 */
export function getRowStaggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), 8) * 0.02;
}
