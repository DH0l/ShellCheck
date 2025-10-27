'use server';

/**
 * @fileOverview This file defines a Genkit flow for detecting potentially dangerous code patterns in shell scripts.
 *
 * It includes functions for:
 * - detectDangerousPatterns: Analyzes shell scripts for security risks.
 * - DetectDangerousPatternsInput: Input type for the analysis, including the script content.
 * - DetectDangerousPatternsOutput: Output type, providing a risk assessment and detailed report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectDangerousPatternsInputSchema = z.object({
  scriptContent: z
    .string()
    .describe('The content of the shell script to analyze.'),
});
export type DetectDangerousPatternsInput = z.infer<
  typeof DetectDangerousPatternsInputSchema
>;

const DetectDangerousPatternsOutputSchema = z.object({
  riskScore: z
    .number()
    .describe(
      'A numerical score indicating the overall risk level of the script.'
    ),
  report: z
    .string()
    .describe(
      'A detailed report outlining identified issues, their locations, and remediation suggestions.'
    ),
});
export type DetectDangerousPatternsOutput = z.infer<
  typeof DetectDangerousPatternsOutputSchema
>;

export async function detectDangerousPatterns(
  input: DetectDangerousPatternsInput
): Promise<DetectDangerousPatternsOutput> {
  return detectDangerousPatternsFlow(input);
}

const detectDangerousPatternsPrompt = ai.definePrompt({
  name: 'detectDangerousPatternsPrompt',
  input: {schema: DetectDangerousPatternsInputSchema},
  output: {schema: DetectDangerousPatternsOutputSchema},
  prompt: `You are a security expert analyzing shell scripts for potential vulnerabilities.

  Analyze the provided shell script for common security issues, including but not limited to:
  - Command injection vulnerabilities
  - Insecure file handling practices
  - Privilege escalation attempts
  - Use of deprecated or unsafe functions

  Based on your analysis, assign a risk score from 0 to 100, where 0 indicates no risk and 100 indicates critical risk.
  Provide a detailed report outlining the identified issues, their locations in the code, and specific suggestions for remediation.

  Shell Script:
  \`\`\`
  {{{scriptContent}}}
  \`\`\`

  Ensure that the outputted report is easy to read and understand by someone with limited security expertise.
  Make sure to include filenames and line numbers in the report where applicable.
  Risk Score: {{riskScore}}
  Report: {{report}}`,
});

const detectDangerousPatternsFlow = ai.defineFlow(
  {
    name: 'detectDangerousPatternsFlow',
    inputSchema: DetectDangerousPatternsInputSchema,
    outputSchema: DetectDangerousPatternsOutputSchema,
  },
  async input => {
    const {output} = await detectDangerousPatternsPrompt(input);
    return output!;
  }
);
