/** Shared thresholds for AI-first intake (server + client must stay aligned). */
export const INTAKE_VIN_AUTO_ACCEPT_CONFIDENCE = 0.88;
/** Minimum overall extraction confidence before auto-applying VIN + decode without review. */
export const INTAKE_OVERALL_MIN_FOR_AUTO_VIN = 0.55;
/** Minimum per-field confidence before client may apply suggested identity when decode failed. */
export const INTAKE_CORE_FIELD_SUGGEST_CONFIDENCE = 0.75;
/** When NHTSA decode fails, auto-apply AI identity at this confidence (bypass Pending accept). */
export const INTAKE_AI_IDENTITY_AUTO_APPLY_CONFIDENCE = 0.70;
