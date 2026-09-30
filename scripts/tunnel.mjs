/**
 * Exposes the local Next.js dev server on a public ngrok URL.
 *
 * Vapi (and any webhook caller) can only reach the app through this tunnel:
 * the webhook path is `${APP_URL}/api/voice/webhook`, and APP_URL must be the
 * public origin, not localhost.
 *
 * Config is read from .env.local (gitignored) so the authtoken is never
 * committed:
 *   NGROK_AUTHTOKEN  required  (ngrok dashboard -> authtoken)
 *   NGROK_DOMAIN     optional. NOTE: the ngrok agent reads this variable itself,
 *                    and a free account serves its single reserved domain even
 *                    when it is unset - so a random URL is not really available.
 *                    Only ONE session may hold that domain; a second concurrent
 *                    tunnel makes requests fail with ERR_NGROK_3200. Stop any
 *                    other tunnel before starting this one.
 *   NGROK_PORT       optional  defaults to 3000 (the Next dev server)
 *
 * Usage: npm run tunnel
 */
import { connect } from "@ngrok/ngrok";
import { existsSync } from "node:fs";

const envFile = ".env.local";
if (existsSync(envFile)) process.loadEnvFile(envFile);

const authtoken = process.env.NGROK_AUTHTOKEN;
const port = process.env.NGROK_PORT ?? "3000";
const domain = process.env.NGROK_DOMAIN?.trim();

if (!authtoken) {
  console.error("[tunnel] NGROK_AUTHTOKEN is not set.");
  console.error("[tunnel] Add it to .env.local (gitignored):");
  console.error("[tunnel]   NGROK_AUTHTOKEN=...");
  process.exit(1);
}

/**
 * Only pass `domain` when it differs from the account's reserved domain.
 * On a free account that domain is the only one available anyway.
 */
const options = { addr: `localhost:${port}`, authtoken };
if (domain) options.domain = domain;

const forwarder = await connect(options);

console.log(`[tunnel] public URL : ${forwarder.url()}`);
console.log(`[tunnel] forwarding  : localhost:${port}`);
console.log(`[tunnel] webhook    : ${forwarder.url()}/api/voice/webhook`);
console.log(`[tunnel] domain     : ${domain ?? "(ephemeral)"}`);
console.log("[tunnel] press Ctrl+C to close");

/** Close the tunnel cleanly so the ngrok session is released. */
const shutdown = async () => {
  try {
    await forwarder.close();
    console.log("\n[tunnel] closed");
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
