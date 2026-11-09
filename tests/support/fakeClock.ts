import type { Clock } from "../../src/shared/clock.js";

/** A clock tests control: it only moves when told to. */
export type FakeClock = Clock & { set: (date: Date) => void };

export const createFakeClock = (start: Date): FakeClock => {
  let current = start;
  return {
    now: () => current,
    set: (date) => {
      current = date;
    },
  };
};
