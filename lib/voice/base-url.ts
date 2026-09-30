/** Public origin the voice provider can reach (needs a tunnel in local dev). */
export const publicBaseUrl = () => (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
