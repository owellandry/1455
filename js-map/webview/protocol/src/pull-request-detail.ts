import { z } from "zod";

export const pullRequestCommentTypeSchema = z.enum([
  "comment",
  "review",
  "review_comment",
]);

export const pullRequestCommentSchema = z.object({
  authorLogin: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
  diffHunk: z.string().nullable().optional(),
  id: z.string(),
  inReplyToId: z.string().nullable().optional(),
  line: z.number().nullable().optional(),
  path: z.string().nullable().optional(),
  startLine: z.number().nullable().optional(),
  type: pullRequestCommentTypeSchema,
  url: z.string().nullable(),
});

export const pullRequestCommitSchema = z.object({
  authorLogin: z.string().nullable(),
  authorName: z.string().nullable(),
  committedDate: z.string(),
  messageHeadline: z.string(),
  oid: z.string(),
  url: z.string().nullable(),
});

export const pullRequestTimelineSourceSchema = z.object({
  comments: z.array(pullRequestCommentSchema),
  commits: z.array(pullRequestCommitSchema),
});

export type PullRequestComment = z.infer<typeof pullRequestCommentSchema>;
export type PullRequestCommit = z.infer<typeof pullRequestCommitSchema>;
export type PullRequestTimelineSource = z.infer<
  typeof pullRequestTimelineSourceSchema
>;
