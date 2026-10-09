# AI & MAIN Revenue Opportunity Agent

Deployment practicum for a bounded AI agent that identifies revenue opportunities from CRM activity.

## Practicum phases

1. Read-only CRM connection
2. Opportunity detection in shadow mode
3. Human review
4. Limited CRM write-back
5. Revenue impact tracking

The first milestone uses a HubSpot developer test account and a Cloudflare Worker. Credentials must be stored as Cloudflare secrets and must never be committed to GitHub.

## Initial endpoints

- `/health` — confirms the Worker is running
- `/hubspot-test` — will test read-only HubSpot access once the secret and scopes are configured

No production CRM write actions are enabled in this initial version.
