import { z } from 'zod';

export const dispatchFollowupRequestSchema = z.object({
  workspaceChannel: z.string().min(1),
  accountId: z.string().min(1),
  workOrderId: z.string().min(1),
  dispatchStatus: z.enum(['assigned', 'en_route', 'on_site', 'completed']),
  photoCount: z.number().int().min(0),
  followUpDueAt: z.string().datetime(),
  candidateTechnicianIds: z.array(z.string().min(1)).min(1)
});

export type DispatchFollowupRequest = z.infer<typeof dispatchFollowupRequestSchema>;

export type FollowupAction = 'notify_online_technician' | 'queue_dispatch_follow_up';

export type FollowupDecision = {
  action: FollowupAction;
  assignedTechnicianId: string | null;
  reason: string;
};

export type PublishedFollowupEvent = {
  type: 'workorder.followup.requested';
  workOrderId: string;
  dispatchStatus: DispatchFollowupRequest['dispatchStatus'];
  photoCount: number;
  action: FollowupAction;
  assignedTechnicianId: string | null;
  followUpDueAt: string;
};
