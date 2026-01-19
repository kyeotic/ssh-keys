import { z } from 'zod/v4'

export const ExternalIdSchema = z.object({
  source: z.string(),
  id: z.string(),
})

export type ExternalId = z.infer<typeof ExternalIdSchema>

export const UserProfileSchema = z.object({
  email: z.string().nullable(),
  username: z.string().nullable(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>

export const UserSchema = z.object({
  id: z.string(),
  externalIds: z.array(ExternalIdSchema).max(5),
  profile: UserProfileSchema,
})

export type User = z.infer<typeof UserSchema>
