import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile("status.json", "utf8"));
const fields = ["generatedAt", "headline", "message", "services", "state"];
const states = new Set([
  "degraded",
  "maintenance",
  "operational",
  "outage",
  "prelaunch",
]);
const stateLabels = {
  degraded: "Degraded service",
  maintenance: "Scheduled maintenance",
  operational: "All systems operational",
  outage: "Service outage",
  prelaunch: "Prelaunch",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

assert(
  JSON.stringify(Object.keys(source).sort()) === JSON.stringify(fields.sort()),
  "status.json must contain exactly the five public fields.",
);
assert(
  typeof source.generatedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(source.generatedAt) &&
    !Number.isNaN(Date.parse(source.generatedAt)),
  "generatedAt must be a UTC second timestamp.",
);
assert(
  typeof source.headline === "string" && source.headline.length >= 1 && source.headline.length <= 80,
  "headline must contain 1 to 80 characters.",
);
assert(
  typeof source.message === "string" && source.message.length >= 1 && source.message.length <= 500,
  "message must contain 1 to 500 characters.",
);
assert(
  Array.isArray(source.services) &&
    source.services.length >= 1 &&
    source.services.length <= 12 &&
    source.services.every(
      (value) => typeof value === "string" && value.length >= 1 && value.length <= 100,
    ),
  "services must contain 1 to 12 bounded public strings.",
);
assert(states.has(source.state), "state is not an allowed public state.");

const serialized = JSON.stringify(source);
for (const prohibited of [
  "accountId",
  "attachmentId",
  "credential",
  "deviceId",
  "groupId",
  "messageId",
  "projectId",
  "providerId",
  "subject",
  "token",
]) {
  assert(!serialized.includes(prohibited), `status.json contains ${prohibited}.`);
}
assert(!/https?:\/\//i.test(serialized), "status.json must not contain a URL.");

const services = source.services
  .map((service) => `<li>${escapeHtml(service)}</li>`)
  .join("\n");
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
  <meta name="referrer" content="no-referrer">
  <title>OpenE2EE emergency status</title>
  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #07090d; color: #f6f7f9; display: grid; place-items: center; padding: 2rem; }
    main { width: min(44rem, 100%); }
    .eyebrow { color: #9da7b7; font-size: .78rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: .8rem 0 1.5rem; font-size: clamp(2.2rem, 7vw, 4.6rem); letter-spacing: -.055em; line-height: .98; }
    .panel { border: 1px solid #29303b; border-radius: 1.25rem; background: #10141b; padding: clamp(1.25rem, 4vw, 2rem); box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 35%); }
    .state { display: inline-flex; align-items: center; gap: .65rem; font-weight: 700; }
    .state::before { content: ""; width: .7rem; height: .7rem; border-radius: 999px; background: #7c8cff; box-shadow: 0 0 0 .3rem rgb(124 140 255 / 14%); }
    [data-state="operational"] .state::before { background: #45d39d; box-shadow: 0 0 0 .3rem rgb(69 211 157 / 14%); }
    [data-state="degraded"] .state::before, [data-state="maintenance"] .state::before { background: #f2bd5b; box-shadow: 0 0 0 .3rem rgb(242 189 91 / 14%); }
    [data-state="outage"] .state::before { background: #ff6b7a; box-shadow: 0 0 0 .3rem rgb(255 107 122 / 14%); }
    .message { color: #c4cad4; font-size: 1.08rem; line-height: 1.65; margin: 1.2rem 0 1.6rem; }
    ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid #29303b; }
    li { padding: .9rem 0; border-bottom: 1px solid #29303b; color: #e7eaf0; }
    footer { color: #808a99; font-size: .8rem; line-height: 1.5; margin-top: 1rem; }
  </style>
</head>
<body>
  <main data-state="${escapeHtml(source.state)}">
    <div class="eyebrow">OpenE2EE emergency status</div>
    <h1>${escapeHtml(source.headline)}</h1>
    <section class="panel" aria-labelledby="service-state">
      <div class="state" id="service-state">${escapeHtml(stateLabels[source.state])}</div>
      <p class="message">${escapeHtml(source.message)}</p>
      <ul>${services}</ul>
    </section>
    <footer>Updated ${escapeHtml(source.generatedAt)} · Static emergency surface on the provider-native GitHub Pages hostname.</footer>
  </main>
</body>
</html>
`;

await mkdir("public", { recursive: true });
for (const file of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']) {
  await copyFile(`brand/${file}`, `public/${file}`);
}
await writeFile("public/index.html", html, "utf8");
await writeFile("public/status.json", `${JSON.stringify(source, null, 2)}\n`, "utf8");
await writeFile("public/.nojekyll", "", "utf8");
console.log("PASS: emergency status contract and static render are valid.");
