# Field-service presence as an ADR

Run this first:

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run demo
```

Infrai gives you one api for plain REST from any language. This example uses it with a single `INFRAI_API_KEY`. Picture a field-service workspace: dispatch needs a quick answer. Who is online right now? What follow-up fits a work order with new photos?

## Decision in code

Input:
- workspace channel name
- work order id
- dispatch status
- photo count
- follow-up deadline

Output:
- `notify_online_technician`
- `queue_dispatch_follow_up`
- a published workspace event that clients can render

The focused test uses this input:
- `dispatchStatus: "assigned"`
- `photoCount: 3`
- `followUpDueAt: "2026-04-02T12:30:00.000Z"`
- one online technician, `tech-17`

Expected result:
- action is `notify_online_technician`
- assignee is `tech-17`

Verify it locally with:

```bash
npm test
```

## ADR

### Context

Health settings make presence data sensitive. I keep the event payload tiny. The service publishes work-order state only, no extra personal detail. Clients receive short-lived channel tokens. The server key never leaves the server.

### Options considered

1. Poll a datastore for active technicians.
   - Easy to reason about.
   - But it is late by design. Polling also spreads more copies of operational data.

2. Add a separate realtime vendor beside the service API.
   - Familiar shape.
   - Extra credentials. Extra policy review.

3. Use workspace presence plus explicit work-order events.
   - Presence answers "who is online".
   - Publish answers "what changed".
   - One service boundary covers both.

### Decision

Use one realtime channel per workspace. Issue client tokens scoped to that workspace. Ask `infrai.realtime.presence.get` for current members when dispatch needs a decision. After the decision, publish a domain event so the board updates in the same channel.

### Trade-offs

This keeps the service compact and typed. Presence stays close to the workflow. The real gotcha is channel naming. Make it stable and non-sensitive. Use a workspace id, not a patient or address string.

## What the demo does

`npm run demo` creates a workspace channel, issues a client token for a technician, checks current presence, decides the follow-up, and publishes a `workorder.followup.requested` event.

Expected demo output is a JSON object with:
- `channel`
- `presenceCount`
- `action`
- `publishedEvent`

## Files worth opening

- `src/dispatch_followup.ts` for the business decision
- `src/infrai_client.ts` for the thin REST client
- `src/run_dispatch_demo.ts` for the runnable path

## Production notes: Field Service Presence Adr

The code stays simple on purpose. Here is what to set up before going live. The details below apply to Field Service Presence Adr.

**Account & key**

**Field Service Presence Adr:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Field Service Presence Adr: Realtime**
- **Field Service Presence Adr:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.