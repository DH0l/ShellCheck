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
  input: {
    schema: z.object({
      scriptContent: z.string(),
      verificationResults: BillOfMaterialsSchema,
    }),
  },
  output: {schema: AssessRiskAndProvideReportOutputSchema},
  prompt: `You are an expert AI security analyst. Your task is to analyze a shell script for potential security risks and provide a detailed report in a structured JSON format.

You will be given the main script content and a pre-compiled "Bill of Materials" that lists all detected remote scripts and their verification status.

- A 'verified' status means the script's content matches a known, trusted version.
- An 'unverified' status means the script's content does not match any known version and must be treated with extreme caution.
- An 'error' status means the script could not be fetched, which is itself a significant risk.

Your analysis MUST heavily factor in the verification status of these remote dependencies. An 'unverified' or 'error' status for a remote script should dramatically increase the risk score and be a primary focus of your report.

Based on ALL the information provided (the main script and the verification results), generate your analysis.

Your response MUST be a single, valid JSON object that strictly adheres to the specified output schema.
It must contain three top-level properties: 'riskScore', 'report', and 'billOfMaterials'.

1.  **riskScore**: Assign a numerical score from 1-10 representing the overall risk.
2.  **report**: Provide a detailed markdown-formatted string. Describe each identified issue, its location, why it's a risk (especially in the context of unverified scripts), and concrete remediation suggestions.
3.  **billOfMaterials**: Analyze the script to identify any external binaries that are downloaded and executed. Populate the \`externalBinaries\` array with these findings. You do not need to modify the \`remoteScripts\` array; it is provided for your context. The final JSON output should include the original \`remoteScripts\` data alongside your findings for \`externalBinaries\`.

Main shell script content to analyze:
\`\`\`shell
{{{scriptContent}}}
\`\`\`

Context - Verification results for remote scripts:
\`\`\`json
{{{json verificationResults}}}
\`\`\`

REMINDER: Your entire output must be a single, valid JSON object matching the required schema. Do not include any other text, comments, or explanations outside of the JSON structure.`,
});

const assessRiskAndProvideReportFlow = ai.defineFlow(
  {
    name: 'assessRiskAndProvideReportFlow',
    inputSchema: AssessRiskAndProvideReportInputSchema,
    outputSchema: AssessRiskAndProvideReportOutputSchema,
  },
  async ({scriptContent}) => {
    // 1. Detect and fetch all remote scripts first.
    const detectedScripts = await detectAndFetchRemoteScripts({scriptContent});

    // 2. Verify the fetched scripts against the known scripts database.
    const knownScriptsMap = new Map(knownScripts.map(s => [s.url, s.hash]));
    const verificationResults: z.infer<typeof BillOfMaterialsSchema> = {
      remoteScripts: [],
      externalBinaries: [], // This will be populated by the LLM later.
    };

    for (const script of detectedScripts) {
      if (script.error) {
        verificationResults.remoteScripts.push({
          url: script.url,
          status: 'error',
          details: script.error,
        });
      } else if (script.hash && knownScriptsMap.get(script.url) === script.hash) {
        verificationResults.remoteScripts.push({
          url: script.url,
          status: 'verified',
        });
      } else {
        verificationResults.remoteScripts.push({
          url: script.url,
          status: 'unverified',
        });
      }
    }

    // 3. Call the prompt a single time with all context.
    const {output} = await assessRiskAndProvideReportPrompt({
      scriptContent,
      verificationResults,
    });

    if (!output) {
      throw new Error('Analysis failed to produce an output.');
    }
    
    // 4. The LLM populates the externalBinaries, but we trust our verified remoteScripts list more.
    // So, we merge our verified list with the LLM's findings for binaries.
    output.billOfMaterials.remoteScripts = verificationResults.remoteScripts;

    return output;
  }
);
