import type { Clock } from "../../src/shared/clock.js";

/** A clock tests control: it only moves when told to. */
export type FakeClock = Clock & { set: (instant: Temporal.Instant) => void };

export const createFakeClock = (start: Temporal.Instant): FakeClock => {
  let current = start;
  return {
    now: () => current,
    set: (instant) => {
      current = instant;
    },
  };
};
