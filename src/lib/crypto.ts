'use server';

/**
 * @fileOverview Provides cryptographic utility functions.
 */
import { webcrypto } from 'crypto';

/**
 * Calculates the SHA-256 hash of a given string.
 * @param text - The string to hash.
 * @returns A promise that resolves to the hex-encoded SHA-256 hash.
 */
export async function sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
