import { z } from "zod";

const sharePercent = z.coerce.number().int().min(1).max(99);

const collabMemberSchema = z.object({
  username: z.string().min(1).max(40).trim(),
  sharePercent,
});

export const setBeatSplitsSchema = z
  .object({
    ownerSharePercent: sharePercent,
    collaborators: z.array(collabMemberSchema).min(1).max(2),
  })
  .refine(
    (value) =>
      value.ownerSharePercent +
        value.collaborators.reduce((sum, member) => sum + member.sharePercent, 0) ===
      100,
    { message: "Owner and collaborator percents must sum to 100" }
  )
  .refine(
    (value) => {
      const names = value.collaborators.map((member) => member.username.toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: "Collaborators must be unique" }
  );

export const updateCollabSettingsSchema = z.object({
  showCollabCredits: z.boolean().optional(),
  cancel: z.literal(true).optional(),
});

export const collabRespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export type SetBeatSplitsInput = z.infer<typeof setBeatSplitsSchema>;
export type UpdateCollabSettingsInput = z.infer<typeof updateCollabSettingsSchema>;
export type CollabRespondInput = z.infer<typeof collabRespondSchema>;
