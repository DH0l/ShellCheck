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
 * Checks if a given string is a structurally valid and fetchable URL, filtering out shell variables.
 * @param str - The string to validate.
 * @returns True if the string is a valid URL, false otherwise.
 */
function isValidUrl(str: string): boolean {
  // 1. Immediately reject any string that contains shell variable syntax or command substitution.
  // This is the primary defense against the errors we've been seeing.
  if (/\${|`|\$\(/.test(str)) {
    return false;
  }
  
  // 2. Use the standard URL constructor for robust parsing. This will throw an error for malformed URLs.
  try {
    const parsedUrl = new URL(str);
    // 3. Ensure the protocol is one we can actually fetch (http or https).
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch (_) {
    // If the URL constructor throws, it's definitively not a valid URL.
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
    // This regex is designed to capture potential URLs in common curl/wget patterns.
    // It's intentionally a bit broad, as the strict validation happens in `isValidUrl`.
    const urlRegex = /(?:curl|wget)[^|;]*?\s+((?:https?:\/\/)[^\s'"`${}()]+)/g;
    
    const potentialUrls: string[] = [];
    let match;

    while ((match = urlRegex.exec(scriptContent)) !== null) {
      if (match[1]) {
        potentialUrls.push(match[1].trim());
      }
    }
    
    // The most critical step: Filter the list of potential URLs using our robust validator.
    // Also, deduplicate the list to avoid fetching the same URL multiple times.
    const uniqueValidUrls = [...new Set(potentialUrls.filter(isValidUrl))];

    const fetchedScripts = await Promise.all(
      uniqueValidUrls.map(async (url) => {
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
