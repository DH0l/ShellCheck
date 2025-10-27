'use server';
/**
 * @fileOverview This file defines a Genkit flow for assessing the risk of a shell script and providing a detailed report.
 *
 * - assessRiskAndProvideReport - The main function that takes the shell script content as input and returns a risk assessment report.
 * - AssessRiskAndProvideReportInput - The input type for the assessRiskAndProvideReport function.
 * - AssessRiskAndProvideReportOutput - The output type for the assessRiskAndProvideReport function, including a risk score and a detailed report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessRiskAndProvideReportInputSchema = z.object({
  scriptContent: z.string().describe('The content of the shell script to be analyzed.'),
});
export type AssessRiskAndProvideReportInput = z.infer<typeof AssessRiskAndProvideReportInputSchema>;

const AssessRiskAndProvideReportOutputSchema = z.object({
  riskScore: z.number().describe('A numerical score representing the overall risk level of the script.'),
  report: z.string().describe('A detailed report outlining the identified issues, their locations, and remediation suggestions.'),
});
export type AssessRiskAndProvideReportOutput = z.infer<typeof AssessRiskAndProvideReportOutputSchema>;

export async function assessRiskAndProvideReport(
  input: AssessRiskAndProvideReportInput
): Promise<AssessRiskAndProvideReportOutput> {
  return assessRiskAndProvideReportFlow(input);
}

const assessRiskAndProvideReportPrompt = ai.definePrompt({
  name: 'assessRiskAndProvideReportPrompt',
  input: {schema: AssessRiskAndProvideReportInputSchema},
  output: {schema: AssessRiskAndProvideReportOutputSchema},
  prompt: `You are an AI tool that analyzes shell scripts for potential security risks and vulnerabilities.
  Based on the provided script content, assess the overall risk level and generate a detailed report.

  The report should include the following:
  - A risk score (1-10, where 1 is very low risk and 10 is very high risk) based on the severity and number of detected issues.
  - A detailed description of each identified issue, including its location in the code.
  - Specific suggestions for remediating each identified issue to improve the script's security.

  Here is the shell script content:
  \`\`\`shell
  {{{scriptContent}}}
  \`\`\`
  `,
});

const assessRiskAndProvideReportFlow = ai.defineFlow(
  {
    name: 'assessRiskAndProvideReportFlow',
    inputSchema: AssessRiskAndProvideReportInputSchema,
    outputSchema: AssessRiskAndProvideReportOutputSchema,
  },
  async input => {
    const {output} = await assessRiskAndProvideReportPrompt(input);
    return output!;
  }
);
