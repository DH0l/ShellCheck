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
import { runInNewSpan } from '@genkit-ai/core/instrumentation';

const AssessRiskAndProvideReportInputSchema = z.object({
  scriptContent: z.string().describe('The content of the shell script to be analyzed.'),
  // Internal property to prevent infinite recursion
  _recursionLevel: z.number().optional(),
});
export type AssessRiskAndProvideReportInput = z.infer<typeof AssessRiskAndProvideReportInputSchema>;

const AssessRiskAndProvideReportOutputSchema = z.object({
  riskScore: z.number().describe('A numerical score representing the overall risk level of the script (1-10).'),
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
  input: {schema: z.any()},
  output: {schema: AssessRiskAndProvideReportOutputSchema},
  tools: [detectAndFetchRemoteScripts],
  prompt: `You are an AI tool that analyzes shell scripts for potential security risks and vulnerabilities.
  Based on the provided script content and any sub-script analysis, assess the overall risk level and generate a single, comprehensive report.

  The report should include:
  - A final, synthesized risk score (1-10, where 1 is very low risk and 10 is very high risk).
  - A detailed description of each identified issue, including its location.
  - Specific suggestions for remediating each issue.

  If you detect that the script is sourcing other scripts from a remote URL, use the 'detectAndFetchRemoteScripts' tool to fetch their content.
  The analysis of these sub-scripts will be provided back to you. You MUST incorporate the analysis of any fetched sub-scripts into your main report.
  Do not simply list the sub-script reports. Synthesize the findings to create a holistic view of the security posture.
  If a sub-script has a high risk score, the main script's risk score MUST be elevated accordingly.

  Here is the main shell script content:
  \`\`\`shell
  {{{scriptContent}}}
  \`\`\`

  {{#if subScriptAnalysis}}
  ---
  ADDITIONAL CONTEXT FROM SUB-SCRIPT ANALYSIS:
  The following remote scripts were sourced by the main script. Their contents have been analyzed, and the reports are below.
  You MUST integrate these findings into your final, combined report for the main script.

  {{{subScriptAnalysis}}}
  {{/if}}
  `,
});

const assessRiskAndProvideReportFlow = ai.defineFlow(
  {
    name: 'assessRiskAndProvideReportFlow',
    inputSchema: AssessRiskAndProvideReportInputSchema,
    outputSchema: AssessRiskAndProvideReportOutputSchema,
  },
  async input => {
    return await runInNewSpan('assess-risk-flow', async (span) => {
      const recursionLevel = input._recursionLevel ?? 0;
      span.setAttribute('recursion.level', recursionLevel);

      if (recursionLevel > MAX_RECURSION_DEPTH) {
        return {
          riskScore: 10,
          report: `Analysis stopped at recursion depth ${recursionLevel} to prevent infinite loops. This indicates a deeply nested or circular dependency of remote scripts, which is a significant security risk.`,
        };
      }

      // First, check for remote scripts.
      const remoteScripts = await detectAndFetchRemoteScripts({ scriptContent: input.scriptContent });
      let subScriptAnalysis = '';

      if (remoteScripts.length > 0) {
        const analysisPromises = remoteScripts.map(async (subScript) => {
          if (subScript.error || !subScript.content) {
            return `
--------------------------------------------------
Sub-script analysis for: ${subScript.url}
ERROR: Could not fetch or analyze script. ${subScript.error || 'Content was empty.'}
This is a high risk, as it introduces unverified remote code.
--------------------------------------------------`;
          }

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
--------------------------------------------------`;
        });

        const reports = await Promise.all(analysisPromises);
        subScriptAnalysis = reports.join('\n\n');
        span.setAttribute('subscript.reports', subScriptAnalysis);
      }

      // Now, call the LLM with the main script and the sub-script analysis.
      const finalPromptInput = {
        scriptContent: input.scriptContent,
        subScriptAnalysis: subScriptAnalysis || undefined, // a Handlebars helper treats empty string as false
      };

      const finalResponse = await assessRiskAndProvideReportPrompt(finalPromptInput);

      return finalResponse.output!;
    });
  }
);
