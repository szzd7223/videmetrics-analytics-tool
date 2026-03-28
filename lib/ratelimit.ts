import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Create a new ratelimiter, that allows 10 requests per 1 day per IP
// Sliding window avoids "resets" at fixed times, providing a smoother experience.
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, "1 d"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

// Create a Global Killswitch that allows 850 searches per day across ALL users
// This protects your YouTube API Key from being burned by botnets.
export const globalRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(850, "1 d"),
  analytics: true,
  prefix: "@upstash/ratelimit-global",
});
