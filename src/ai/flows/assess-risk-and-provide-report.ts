'use server';
/**
 * @fileOverview This file defines a Genkit flow for assessing the risk of a shell script and providing a detailed report.
 *
 * - assessRiskAndProvideReport - The main function that takes the shell script content as input and returns a risk assessment report.
 * - AssessRiskAndProvideReportInput - The input type for the assessRiskAndProvideReport function.
 * - AssessRiskAndProvideReportOutput - The output type for the assessRiskAndProvideReport function, including a risk score and a detailed report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {detectAndFetchRemoteScripts} from '../tools/detect-and-fetch-remote-scripts';

const AssessRiskAndProvideReportInputSchema = z.object({
  scriptContent: z.string().describe('The content of the shell script to be analyzed.'),
});
export type AssessRiskAndProvideReportInput = z.infer<typeof AssessRiskAndProvideReportInputSchema>;

const BillOfMaterialsSchema = z.object({
  remoteScripts: z.array(z.string().url()).describe('A list of URLs for all remote scripts that are sourced or executed.'),
  externalBinaries: z.array(z.string()).describe('A list of any external binaries that are downloaded and executed.'),
});

const AssessRiskAndProvideReportOutputSchema = z.object({
  riskScore: z.number().describe('A numerical score representing the overall risk level of the script (1-10).'),
  report: z.string().describe('A detailed report outlining the identified issues, their locations, and remediation suggestions.'),
  billOfMaterials: BillOfMaterialsSchema.describe('A bill of materials listing all detected remote scripts and external binaries.'),
});
export type AssessRiskAndProvideReportOutput = z.infer<typeof AssessRiskAndProvideReportOutputSchema>;

export async function assessRiskAndProvideReport(
  input: AssessRiskAndProvideReportInput
): Promise<AssessRiskAndProvideReportOutput> {
  return assessRiskAndProvideReportFlow(input);
}

const assessRiskAndProvideReportPrompt = ai.definePrompt({
  name: 'assessRiskAndProvideReportPrompt',
  input: {schema: z.any()},
  output: {schema: AssessRiskAndProvideReportOutputSchema},
  tools: [detectAndFetchRemoteScripts],
  prompt: `You are an AI tool that analyzes shell scripts for potential security risks.

  Analyze the provided script content. If you detect any lines that download and execute remote scripts (e.g., using curl or wget), you MUST use the 'detectAndFetchRemoteScripts' tool to fetch the content of those scripts.

  Based on the content of the main script AND any fetched remote scripts, provide a comprehensive security analysis.

  Your response MUST be a valid JSON object that strictly adheres to the specified output schema.
  It must contain three top-level properties: 'riskScore', 'report', and 'billOfMaterials'.

  1.  **riskScore**: Assign a numerical score from 1-10 representing the overall risk.
  2.  **report**: Provide a detailed markdown-formatted string. Describe each identified issue, its location in the code (with line numbers), an explanation of the risk, and concrete suggestions for remediation.
  3.  **billOfMaterials**: This must be a separate JSON object containing two arrays:
      - \`remoteScripts\`: A list of all remote script URLs that are downloaded or sourced.
      - \`externalBinaries\`: A list of any external binaries that are downloaded and executed.

  Here is the main shell script content to analyze:
  \`\`\`shell
  {{{scriptContent}}}
  \`\`\`

  REMINDER: Your entire output must be a single, valid JSON object matching the required schema. Do not include any other text or explanation outside of the JSON structure.`,
});

const assessRiskAndProvideReportFlow = ai.defineFlow(
  {
    name: 'assessRiskAndProvideReportFlow',
    inputSchema: AssessRiskAndProvideReportInputSchema,
    outputSchema: AssessRiskAndProvideReportOutputSchema,
  },
  async input => {
    const finalPromptInput = {
      scriptContent: input.scriptContent,
    };

    const finalResponse = await assessRiskAndProvideReportPrompt(finalPromptInput);

    return finalResponse.output!;
  }
);
