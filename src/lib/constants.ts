/**
 * Centralized list of slugs that are reserved for platform/system use.
 * These cannot be claimed by organizations to prevent route collisions.
 */
export const RESERVED_SLUGS = [
  // System Routes
  "admin",
  "portal",
  "api",
  "login",
  "register",
  "logout",
  "verify-2fa",
  
  // Marketing / Legal
  "privacy",
  "terms",
  "about",
  "contact",
  "pricing",
  "features",
  "docs",
  
  // High-level App Concepts
  "inventory",
  "reservation",
  "deal",
  "vehicle",
  "user",
  "profile",
  "settings",
  "dashboard",
  
  // Common Reserved
  "www",
  "app",
  "help",
  "support",
  "status",
  "blog",
  "test",
  "dev",
  
  // Platform Brand
  "vehiclix",
  "evomotors",
  "evo-motors",
];
