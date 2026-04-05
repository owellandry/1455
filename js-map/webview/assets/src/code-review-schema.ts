import { z } from "zod";

export const codeReviewStructuredOutputchema = z.object({
  title: z.string(),
  body: z.string(),
  confidence_score: z.number().min(0).max(1),
  priority: z.number().int().min(0).max(3).nullable().optional(),
  code_location: z.object({
    absolute_file_path: z.string(),
    line_range: z.object({
      start: z.number().int(),
      end: z.number().int(),
    }),
  }),
});

export const codeReviewResponseSchema = z.object({
  findings: z.array(codeReviewStructuredOutputchema),
  overall_correctness: z
    .enum(["patch is correct", "patch is incorrect"])
    .nullable()
    .optional(),
  overall_explanation: z.string().nullable().optional(),
  overall_confidence_score: z.number().min(0).max(1).nullable().optional(),
});

export type CodeReviewFinding = z.infer<typeof codeReviewStructuredOutputchema>;
export type CodeReviewResponse = z.infer<typeof codeReviewResponseSchema>;
