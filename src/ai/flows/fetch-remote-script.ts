'use server';
/**
 * @fileOverview A Genkit flow for fetching the content of a remote script from a URL.
 *
 * - fetchRemoteScript - Fetches the content of a script from a given URL.
 * - FetchRemoteScriptInput - The input type for the fetchRemoteScript function.
 * - FetchRemoteScriptOutput - The output type for the fetchRemoteScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FetchRemoteScriptInputSchema = z.object({
  url: z.string().url().describe('The URL of the shell script to fetch.'),
});
export type FetchRemoteScriptInput = z.infer<typeof FetchRemoteScriptInputSchema>;

const FetchRemoteScriptOutputSchema = z.object({
  scriptContent: z.string().describe('The content of the fetched shell script.'),
});
export type FetchRemoteScriptOutput = z.infer<typeof FetchRemoteScriptOutputSchema>;

export async function fetchRemoteScript(input: FetchRemoteScriptInput): Promise<FetchRemoteScriptOutput> {
  return fetchRemoteScriptFlow(input);
}

const fetchRemoteScriptFlow = ai.defineFlow(
  {
    name: 'fetchRemoteScriptFlow',
    inputSchema: FetchRemoteScriptInputSchema,
    outputSchema: FetchRemoteScriptOutputSchema,
  },
  async ({url}) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch script: ${response.statusText}`);
      }
      const scriptContent = await response.text();
      return {scriptContent};
    } catch (e: any) {
      console.error(`Error fetching script from ${url}:`, e);
      // Re-throw or handle as a structured error
      throw new Error(`Could not fetch script from URL. Please check if the URL is correct and accessible. Details: ${e.message}`);
    }
  }
);
