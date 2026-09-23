import { dispatchFollowupRequestSchema, type DispatchFollowupRequest, type FollowupDecision, type PublishedFollowupEvent } from './domain_types.js';
import { infrai } from './infrai_client.js';

export function decideFollowup(input: DispatchFollowupRequest, onlineTechnicianIds: string[]): FollowupDecision {
  const onlineCandidate = input.candidateTechnicianIds.find((id) => onlineTechnicianIds.includes(id));

  if (input.photoCount > 0 && input.dispatchStatus !== 'completed' && onlineCandidate) {
    return {
      action: 'notify_online_technician',
      assignedTechnicianId: onlineCandidate,
      reason: 'photos_ready_and_technician_online'
    };
  }

  return {
    action: 'queue_dispatch_follow_up',
    assignedTechnicianId: null,
    reason: 'no_online_candidate_for_immediate_followup'
  };
}

export function buildPublishedFollowupEvent(
  input: DispatchFollowupRequest,
  decision: FollowupDecision
): PublishedFollowupEvent {
  return {
    type: 'workorder.followup.requested',
    workOrderId: input.workOrderId,
    dispatchStatus: input.dispatchStatus,
    photoCount: input.photoCount,
    action: decision.action,
    assignedTechnicianId: decision.assignedTechnicianId,
    followUpDueAt: input.followUpDueAt
  };
}

export async function processDispatchFollowup(rawInput: unknown) {
  const input = dispatchFollowupRequestSchema.parse(rawInput);

  const presence = await infrai.realtime.presence.get(input.workspaceChannel);
  const onlineTechnicianIds = (presence.members || [])
    .map((member) => member.client_id)
    .filter((value): value is string => typeof value === 'string');

  const decision = decideFollowup(input, onlineTechnicianIds);
  const event = buildPublishedFollowupEvent(input, decision);
  const eventId = `workorder:${input.workOrderId}:due:${input.followUpDueAt}`;

  await infrai.realtime.publish({
    channel: input.workspaceChannel,
    event: 'workorder.followup.requested',
    data: JSON.stringify({ event_id: eventId, ...event }),
    account_id: input.accountId
  });

  return {
    presenceCount: onlineTechnicianIds.length,
    decision,
    publishedEvent: event
  };
}
