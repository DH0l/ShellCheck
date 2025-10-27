'use client';

import { useState } from 'react';
import type { AssessRiskAndProvideReportOutput } from '@/ai/flows/assess-risk-and-provide-report';
import { analyzeScriptAction } from '@/app/actions';
import { AnalysisForm } from './analysis-form';
import { ReportDisplay } from './report-display';

export function ShellCheckPage() {
  const [analysisResult, setAnalysisResult] = useState<AssessRiskAndProvideReportOutput | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async (scriptContent: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setAnalysisId(null);

    const result = await analyzeScriptAction(scriptContent);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setAnalysisResult(result.data);
      // Generate a unique ID for this analysis session for feedback purposes
      try {
        setAnalysisId(crypto.randomUUID());
      } catch (e) {
        // Fallback for environments where crypto.randomUUID is not available
        setAnalysisId(Date.now().toString());
      }
    }
    setIsLoading(false);
  };

  const handleClear = () => {
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setAnalysisId(null);
  };

  return (
    <div className="space-y-8">
      <AnalysisForm
        onAnalyze={handleAnalysis}
        isLoading={isLoading}
        onClear={handleClear}
        hasResult={!!analysisResult || !!error}
      />
      <ReportDisplay
        result={analysisResult}
        isLoading={isLoading}
        error={error}
        analysisId={analysisId}
      />
    </div>
  );
}
