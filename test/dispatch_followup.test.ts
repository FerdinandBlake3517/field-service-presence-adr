import { describe, expect, it } from 'vitest';
import { decideFollowup } from '../src/dispatch_followup.js';
import type { DispatchFollowupRequest } from '../src/domain_types.js';

describe('decideFollowup', () => {
  it('notifies the first online technician when photos are ready', () => {
    const input: DispatchFollowupRequest = {
      workspaceChannel: 'workspace-field-ops-7',
      accountId: 'acct-field-42',
      workOrderId: 'wo-1042',
      dispatchStatus: 'assigned',
      photoCount: 3,
      followUpDueAt: '2026-04-02T12:30:00.000Z',
      candidateTechnicianIds: ['tech-17', 'tech-88']
    };

    const decision = decideFollowup(input, ['tech-17']);

    expect(decision).toEqual({
      action: 'notify_online_technician',
      assignedTechnicianId: 'tech-17',
      reason: 'photos_ready_and_technician_online'
    });
  });
});
