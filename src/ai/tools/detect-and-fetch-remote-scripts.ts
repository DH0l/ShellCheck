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
 * Checks if a given string is a structurally valid URL and doesn't contain shell variables.
 * @param str - The string to validate.
 * @returns True if the string is a valid URL, false otherwise.
 */
function isValidUrl(str: string): boolean {
  // Filter out strings containing common shell variable patterns like $, {, or }.
  if (/[${}]/.test(str)) {
    return false;
  }
  try {
    // Check if the URL can be parsed by the standard URL constructor.
    const parsedUrl = new URL(str);
    // Ensure it's a http or https protocol.
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (_) {
    // If the URL constructor throws an error, it's not a valid URL.
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
    // Regex updated to be more specific and avoid capturing URLs with shell variables.
    // It specifically looks for http/https URLs that are not part of a variable expansion.
    const urlRegex = /(?:curl|wget)[^|;]*?\s+((?:https?:\/\/)[^\s'"`${}()]+)/g;
    
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(scriptContent)) !== null) {
      if (match[1]) {
        const potentialUrl = match[1].trim();
        // The isValidUrl function now provides a much stronger guarantee.
        if (isValidUrl(potentialUrl)) {
            urls.push(potentialUrl);
        }
      }
    }
    
    // Deduplicate URLs before processing.
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
