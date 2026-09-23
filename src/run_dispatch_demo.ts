import { infrai } from './infrai_client.js';
import { processDispatchFollowup } from './dispatch_followup.js';

async function main() {
  const workspaceChannel = 'workspace-field-ops-7';

  await infrai.realtime.channel.create({
    channel: workspaceChannel,
    type: 'presence',
    vendor: 'ably'
  });

  await infrai.realtime.token.issue({
    client_id: 'tech-17',
    channels: [workspaceChannel],
    capabilities: ['subscribe', 'publish', 'presence'],
    ttl_seconds: 900
  });

  const result = await processDispatchFollowup({
    workspaceChannel,
    accountId: 'acct-field-42',
    workOrderId: 'wo-1042',
    dispatchStatus: 'assigned',
    photoCount: 2,
    followUpDueAt: '2026-04-02T12:30:00.000Z',
    candidateTechnicianIds: ['tech-17', 'tech-88']
  });

  console.log(
    JSON.stringify(
      {
        channel: workspaceChannel,
        presenceCount: result.presenceCount,
        action: result.decision.action,
        publishedEvent: result.publishedEvent.type
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
