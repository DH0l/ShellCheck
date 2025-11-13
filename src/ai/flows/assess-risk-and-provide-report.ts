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
import knownScripts from '../known-scripts.json';

const AssessRiskAndProvideReportInputSchema = z.object({
  scriptContent: z.string().describe('The content of the shell script to be analyzed.'),
});
export type AssessRiskAndProvideReportInput = z.infer<typeof AssessRiskAndProvideReportInputSchema>;

const FetchedScriptWithStatusSchema = z.object({
  url: z.string().url(),
  status: z.enum(['verified', 'unverified', 'error']),
  details: z.string().optional(),
});

const BillOfMaterialsSchema = z.object({
  remoteScripts: z.array(FetchedScriptWithStatusSchema).describe('A list of all remote scripts that are sourced or executed, with their verification status.'),
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

The tool will return the content of any fetched scripts, along with their verification status.
- A 'verified' status means the script's content matches a known, trusted version.
- An 'unverified' status means the script's content does not match any known version and must be treated with caution.
- An 'error' status means the script could not be fetched, which is a significant risk.

Based on the content of the main script AND the content and verification status of any fetched remote scripts, provide a comprehensive security analysis. Your analysis should heavily factor in the trust level of the remote scripts. An unverified or erroneously fetched script should significantly increase the risk score.

Your response MUST be a valid JSON object that strictly adheres to the specified output schema.
It must contain three top-level properties: 'riskScore', 'report', and 'billOfMaterials'.

1.  **riskScore**: Assign a numerical score from 1-10 representing the overall risk.
2.  **report**: Provide a detailed markdown-formatted string. Describe each identified issue, its location, and remediation suggestions.
3.  **billOfMaterials**: This must be a separate JSON object containing two arrays:
    - \`remoteScripts\`: An array of objects, where each object details a remote script's URL, its verification status ('verified', 'unverified', 'error'), and any relevant details (like an error message).
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
    // We pass an empty object and let the tool call do the work.
    const toolResponse = await assessRiskAndProvideReportPrompt(input);

    if (!toolResponse.output) {
      throw new Error('Analysis failed to produce an output.');
    }

    const fetchedScripts = toolResponse.toolRequests[0]?.toolResponse?.parts.map(p => p.data) || [];

    const billOfMaterials: {
      remoteScripts: z.infer<typeof FetchedScriptWithStatusSchema>[];
      externalBinaries: string[]; // This will be populated by the LLM
    } = {
      remoteScripts: [],
      externalBinaries: toolResponse.output.billOfMaterials.externalBinaries || [],
    };

    const knownScriptsMap = new Map(knownScripts.map(s => [s.url, s.hash]));

    for (const script of fetchedScripts) {
      if (script.error) {
        billOfMaterials.remoteScripts.push({
          url: script.url,
          status: 'error',
          details: script.error,
        });
      } else if (script.hash && knownScriptsMap.get(script.url) === script.hash) {
        billOfMaterials.remoteScripts.push({
          url: script.url,
          status: 'verified',
        });
      } else {
        billOfMaterials.remoteScripts.push({
          url: script.url,
          status: 'unverified',
        });
      }
    }

    // Create a new prompt input with the verification results included
    const finalPromptInput = {
      ...input,
      verificationResults: billOfMaterials,
    };
    
    // Call the prompt again with the full context.
    const finalResponse = await assessRiskAndProvideReportPrompt(finalPromptInput);
    
    if (!finalResponse.output) {
        throw new Error("Final analysis failed to produce an output.");
    }
    
    // Ensure the final BoM from the LLM is merged with our verified one
    finalResponse.output.billOfMaterials.remoteScripts = billOfMaterials.remoteScripts;

    return finalResponse.output;
  }
);
