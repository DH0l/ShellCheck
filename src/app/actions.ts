
'use server';

import {
  assessRiskAndProvideReport,
  AssessRiskAndProvideReportOutput,
} from '@/ai/flows/assess-risk-and-provide-report';
import {
  incorporateCommunityFeedback,
  CommunityFeedbackInput,
} from '@/ai/flows/incorporate-community-feedback';
import { fetchRemoteScript } from '@/ai/flows/fetch-remote-script';

export async function analyzeScriptAction(
  values: { scriptContent?: string, scriptUrl?: string }
): Promise<{ data?: AssessRiskAndProvideReportOutput; error?: string }> {
  let scriptContent = values.scriptContent;

  if (values.scriptUrl) {
    try {
      const result = await fetchRemoteScript({ url: values.scriptUrl });
      scriptContent = result.scriptContent;
    } catch (e: any) {
      console.error(e);
      return { error: e.message || 'Failed to fetch script from the provided URL.' };
    }
  }
  
  if (!scriptContent || !scriptContent.trim()) {
    return { error: 'Script content is empty. Please paste a script or provide a valid URL.' };
  }

  try {
    const result = await assessRiskAndProvideReport({ scriptContent });
    return { data: result };
  } catch (e: any) {
    console.error(e);
    return { error: e.message || 'An unexpected error occurred during analysis.' };
  }
}

export async function submitFeedbackAction(
  feedback: CommunityFeedbackInput
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await incorporateCommunityFeedback(feedback);
    return result;
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: 'An unexpected error occurred while submitting feedback.',
    };
  }
}
