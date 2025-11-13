'use server';
/**
 * @fileOverview Defines a Genkit tool for detecting, fetching, and returning the content of remote scripts within a given shell script.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sha256 } from '@/lib/crypto';

const FetchedScriptSchema = z.object({
  url: z.string().url().describe('The URL of the fetched script.'),
  content: z.string().optional().describe('The content of the script. Will be empty if fetching fails.'),
  hash: z.string().optional().describe('The SHA-256 hash of the script content.'),
  error: z.string().optional().describe('An error message if the script could not be fetched.'),
});

/**
 * Checks if a given string is a structurally valid URL.
 * @param str - The string to validate.
 * @returns True if the string is a valid URL, false otherwise.
 */
function isValidUrl(str: string): boolean {
  // Simple check to filter out URLs with shell variables.
  if (str.includes('$') || str.includes('{') || str.includes('}')) {
    return false;
  }
  try {
    new URL(str);
    return true;
  } catch (_) {
    return false;
  }
}

export const detectAndFetchRemoteScripts = ai.defineTool(
  {
    name: 'detectAndFetchRemoteScripts',
    description:
      'Detects lines in a shell script that download and execute remote scripts (e.g., curl ... | bash, wget ... | sh). It then fetches the content of these remote scripts and computes their hash.',
    inputSchema: z.object({
      scriptContent: z.string().describe('The content of the primary shell script to analyze.'),
    }),
    outputSchema: z.array(FetchedScriptSchema).describe('An array of fetched remote scripts with their content and hash.'),
  },
  async ({ scriptContent }) => {
    // This regex looks for curl/wget piping to a shell or being sourced.
    // It's designed to be less greedy and capture common patterns.
    // It specifically avoids shell variables like ${...} or $...
    const urlRegex = /(?:curl|wget)[^|;]*?\s+((?:https?:\/\/)[\w./-]+)/g;
    const sourceRegex = /source\s+<(?:curl|wget)[^>]+>\s*([^)]*https?:\/\/[^\s'")]+)/g;

    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(scriptContent)) !== null) {
      if (match[1]) {
        urls.push(match[1].trim());
      }
    }
     while ((match = sourceRegex.exec(scriptContent)) !== null) {
      if (match[1]) {
        urls.push(match[1].trim());
      }
    }

    // Deduplicate and validate URLs
    const uniqueUrls = [...new Set(urls)].filter(isValidUrl);

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
              error: `Failed to fetch script from ${url}. Status: ${response.status} ${response.statusText}.`,
            };
          }
          const content = await response.text();
          const hash = await sha256(content);
          return { url, content, hash };
        } catch (e: any) {
          return { url, error: `An exception occurred while trying to fetch script from ${url}: ${e.message}.` };
        }
      })
    );

    return fetchedScripts;
  }
);
