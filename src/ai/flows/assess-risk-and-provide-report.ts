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
  prompt: `You are an AI tool that analyzes shell scripts for potential security risks and vulnerabilities.
  Your response MUST be in the specified JSON format.
  
  You must provide three separate top-level properties in your JSON response: 'riskScore', 'report', and 'billOfMaterials'.

  1.  **riskScore**: A numerical score from 1-10.
  2.  **report**: A detailed markdown-formatted string describing each identified issue, its location, and remediation suggestions.
  3.  **billOfMaterials**: A structured object containing two arrays:
      - \`remoteScripts\`: A list of all remote script URLs that are downloaded and executed.
      - \`externalBinaries\`: A list of any external binaries that are downloaded and executed.

  If you detect that the script is sourcing other scripts from a remote URL, use the 'detectAndFetchRemoteScripts' tool to fetch their content.
  The tool will return the content of any successfully fetched scripts.
  Incorporate the analysis of these sub-scripts into your main 'report' and list their URLs and any binaries in the 'billOfMaterials' object.

  Here is the main shell script content:
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
    const finalPromptInput = {
      scriptContent: input.scriptContent,
    };

    const finalResponse = await assessRiskAndProvideReportPrompt(finalPromptInput);

    return finalResponse.output!;
  }
);
