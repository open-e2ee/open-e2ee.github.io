# OpenE2EE emergency status

This repository publishes the independent emergency status surface at
`https://open-e2ee.github.io/`.

Better Stack owns monitoring, on-call response, and the primary status page.
This static page remains available when OpenE2EE or Better Stack status DNS is
unavailable through Cloudflare. Keep the native `github.io` hostname. Do not
add a custom domain, provider API key, analytics, remote asset, or runtime
dependency.

## Update

1. Edit only `status.json`.
2. Use public service names and bounded public incident text.
3. Run `node scripts/verify.mjs`.
4. Review the generated page in `public/`.
5. Commit and publish through the repository workflow.

The public document accepts only `generatedAt`, `headline`, `message`,
`services`, and `state`. Never add raw account, project, device, message,
attachment, group, provider, protocol, credential, or personal-resource
identifiers.
