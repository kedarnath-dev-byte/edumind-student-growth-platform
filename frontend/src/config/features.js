// Explicit build-time opt-in; backend authorization remains independent.
export const legacyAiEnabled = import.meta.env.VITE_ENABLE_LEGACY_AI === 'true'
