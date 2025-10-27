'use server';
/**
 * @fileOverview Defines a Genkit tool for detecting, fetching, and returning the content of remote scripts within a given shell script.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FetchedScriptSchema = z.object({
  url: z.string().url().describe('The URL of the fetched script.'),
  content: z.string().optional().describe('The content of the script. Will be empty if fetching fails.'),
  error: z.string().optional().describe('An error message if the script could not be fetched.'),
});

export const detectAndFetchRemoteScripts = ai.defineTool(
  {
    name: 'detectAndFetchRemoteScripts',
    description:
      'Detects lines in a shell script that download and execute remote scripts (e.g., curl ... | bash). It then fetches the content of these remote scripts.',
    inputSchema: z.object({
      scriptContent: z.string().describe('The content of the primary shell script to analyze.'),
    }),
    outputSchema: z.array(FetchedScriptSchema).describe('An array of fetched remote scripts with their content.'),
  },
  async ({ scriptContent }) => {
    // Regular expression to find curl/wget commands that pipe to a shell.
    const urlRegex = /(?:curl\s+-?L?s?f?S?|wget\s+-?q?O?-)\s+(['"]?)(https?:\/\/[^\s'"]+)\1\s*\|\s*(?:bash|sh)/g;

    const urls: string[] = [];
    let match;
    while ((match = urlRegex.exec(scriptContent)) !== null) {
      urls.push(match[2]);
    }
    
    // Deduplicate URLs
    const uniqueUrls = [...new Set(urls)];

    const fetchedScripts = await Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'ShellCheck-AI-Analyzer/1.0',
              'Accept': 'text/plain,*/*',
            }
          });
          if (!response.ok) {
            return {
              url,
              error: `Failed to fetch script from ${url}. Status: ${response.status} ${response.statusText}. This introduces a significant security risk as the script's content cannot be verified.`,
            };
          }
          const content = await response.text();
          return { url, content };
        } catch (e: any) {
          return { url, error: `An exception occurred while trying to fetch script from ${url}: ${e.message}. This could be due to a network issue, DNS problem, or the host being unreachable.` };
        }
      })
    );
    
    return fetchedScripts;
  }
);
