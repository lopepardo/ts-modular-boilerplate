export type Clock = { now: () => Temporal.Instant };

export const systemClock: Clock = {
  now: () => Temporal.Instant.fromEpochMilliseconds(Date.now()),
};
