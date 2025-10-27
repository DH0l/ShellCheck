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
import {detectAndFetchRemoteScripts} from '../tools/detect-and-fetch-remote-scripts';

const AssessRiskAndProvideReportInputSchema = z.object({
  scriptContent: z.string().describe('The content of the shell script to be analyzed.'),
  // Internal property to prevent infinite recursion
  _recursionLevel: z.number().optional(),
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

const MAX_RECURSION_DEPTH = 3;

const assessRiskAndProvideReportPrompt = ai.definePrompt({
  name: 'assessRiskAndProvideReportPrompt',
  input: {schema: AssessRiskAndProvideReportInputSchema},
  output: {schema: AssessRiskAndProvideReportOutputSchema},
  tools: [detectAndFetchRemoteScripts],
  prompt: `You are an AI tool that analyzes shell scripts for potential security risks and vulnerabilities.
  Based on the provided script content, assess the overall risk level and generate a detailed report.

  The report should include the following:
  - A risk score (1-10, where 1 is very low risk and 10 is very high risk) based on the severity and number of detected issues.
  - A detailed description of each identified issue, including its location in the code.
  - Specific suggestions for remediating each identified issue to improve the script's security.

  If you detect that the script is sourcing other scripts from a remote URL, use the 'detectAndFetchRemoteScripts' tool to fetch their content.
  You MUST incorporate the analysis of any fetched sub-scripts into your main report to provide a comprehensive security overview.

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
    const recursionLevel = input._recursionLevel ?? 0;
    if (recursionLevel > MAX_RECURSION_DEPTH) {
      return {
        riskScore: 10,
        report: `Analysis stopped at recursion depth ${recursionLevel} to prevent infinite loops. This indicates a deeply nested or circular dependency of remote scripts, which is a significant security risk.`,
      };
    }

    const llmResponse = await assessRiskAndProvideReportPrompt(input);
    const toolCalls = llmResponse.toolCalls();

    if (toolCalls.length === 0) {
      return llmResponse.output()!;
    }

    const toolOutputs = await Promise.all(
      toolCalls.map(async call => {
        const toolOutput = await call.run();
        // We need to provide the output back to the LLM.
        return call.output(toolOutput);
      })
    );

    const subScriptReports = await Promise.all(
      toolOutputs.map(async output => {
        const subScripts = output.output as z.infer<typeof detectAndFetchRemoteScripts.outputSchema>;
        if (!subScripts || subScripts.length === 0) return '';

        const reports = await Promise.all(
          subScripts.map(async subScript => {
            if (!subScript.content) return `Could not fetch or analyze script from ${subScript.url}.`;

            const subAnalysis = await assessRiskAndProvideReport({
              scriptContent: subScript.content,
              _recursionLevel: recursionLevel + 1,
            });

            return `
--------------------------------------------------
Sub-script analysis for: ${subScript.url}
Risk Score: ${subAnalysis.riskScore}/10
---
${subAnalysis.report}
--------------------------------------------------
`;
          })
        );
        return reports.join('\n\n');
      })
    );

    const finalInput = {
      ...input,
      scriptContent: `${input.scriptContent}\n\n
---
ADDITIONAL CONTEXT: The following are analysis reports for remote scripts that were sourced by the main script.
You MUST incorporate these findings into your final, combined report for the main script. Do not just list them.
Synthesize the findings to create a holistic view of the security posture.
If a sub-script has a high risk score, the main script's risk score should be elevated accordingly.

${subScriptReports.join('\n\n')}`,
    };

    const finalResponse = await assessRiskAndProvideReportPrompt(finalInput);
    return finalResponse.output()!;
  }
);
