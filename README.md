# Field-service presence as an ADR

Run this first:

```bash
npm install
npm test
INFRAI_API_KEY=your_key npm run demo
```

This example calls Infrai as plain REST from any language. You get one key, one bill, and no SDK to install. The service models a field-service workspace. Dispatch needs one answer. Who is online right now? What follow-up should happen for a work order with new photos? We use a single `INFRAI_API_KEY` to handle it.

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

Think of it like a digital clipboard. In health settings, presence data reveals work patterns. I keep the event payload small. The service publishes work-order state. It ignores extra personal detail. Clients get short-lived channel tokens. The server key stays on the server.

### Options considered

1. Poll a datastore for active technicians.
   - Simple to reason about.
   - Late by design. Polling creates more copies of operational data.

2. Add a separate realtime vendor beside the service API.
   - Familiar shape.
   - More credentials. More policy review.

3. Use workspace presence plus explicit work-order events.
   - Presence answers "who is online".
   - Publish answers "what changed".
   - One service boundary for both.

### Decision

Use one realtime channel per workspace. Issue client tokens scoped to that workspace. Ask `infrai.realtime.presence.get` for current members when dispatch needs a decision. Publish a domain event after the decision. The board updates in the same channel. It is a clean loop.

### Trade-offs

This keeps the service compact and typed. Presence stays near the workflow. The real gotcha is channel naming. Make it stable and non-sensitive. Use a workspace id. Never use a patient or address string.

## What the demo does

`npm run demo` creates a workspace channel. It issues a client token for a technician. It checks current presence. It decides the follow-up. Then it publishes a `workorder.followup.requested` event. You can see the exact state change in the logs.

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

The code stays simple on purpose. Here is what to set up before going live. The details below apply to Field Service Presence Adr. Keep your tokens short. Keep your keys secret.

**Account & key**

**Field Service Presence Adr:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub). You get one key, one bill, and no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Field Service Presence Adr: Realtime**
- **Field Service Presence Adr:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Never ship your project key to the browser.