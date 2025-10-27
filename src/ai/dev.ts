import { config } from 'dotenv';
config();

import '@/ai/flows/assess-risk-and-provide-report.ts';
import '@/ai/flows/incorporate-community-feedback.ts';
import '@/ai/flows/detect-dangerous-patterns.ts';