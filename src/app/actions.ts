
'use server';

import {
  assessRiskAndProvideReport,
  AssessRiskAndProvideReportOutput,
} from '@/ai/flows/assess-risk-and-provide-report';
import {
  incorporateCommunityFeedback,
  CommunityFeedbackInput,
} from '@/ai/flows/incorporate-community-feedback';

export async function analyzeScriptAction(
  scriptContent: string
): Promise<{ data?: AssessRiskAndProvideReportOutput; error?: string }> {
  if (!scriptContent.trim()) {
    return { error: 'Script content cannot be empty.' };
  }

  try {
    const result = await assessRiskAndProvideReport({ scriptContent });
    return { data: result };
  } catch (e) {
    console.error(e);
    return { error: 'An unexpected error occurred during analysis.' };
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
