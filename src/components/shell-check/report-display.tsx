import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { FeedbackForm } from './feedback-form';
import type { AssessRiskAndProvideReportOutput } from '@/ai/flows/assess-risk-and-provide-report';

type ReportDisplayProps = {
  result: AssessRiskAndProvideReportOutput | null;
  isLoading: boolean;
  error: string | null;
  analysisId: string | null;
};

const getRiskColor = (score: number) => {
  if (score >= 8) return 'bg-destructive';
  if (score >= 4) return 'bg-chart-4';
  return 'bg-chart-2';
};

const getRiskText = (score: number) => {
  if (score >= 8) return 'High Risk';
  if (score >= 4) return 'Medium Risk';
  return 'Low Risk';
};

const RiskScoreIndicator = ({ score }: { score: number }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-lg font-bold">{getRiskText(score)}</span>
      <span className="text-2xl font-bold">{score}/10</span>
    </div>
    <Progress value={score * 10} className="h-3" indicatorClassName={getRiskColor(score)} />
  </div>
);

export function ReportDisplay({ result, isLoading, error, analysisId }: ReportDisplayProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-full" />
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Analysis Failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!result || !analysisId) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle>Analysis Report</CardTitle>
          <CardDescription>Generated report based on the provided script.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="mb-2 text-lg font-semibold">Risk Score</h3>
            <RiskScoreIndicator score={result.riskScore} />
          </div>
          <div>
            <h3 className="mb-2 text-lg font-semibold">Details & Remediation</h3>
            <div className="max-h-[500px] overflow-auto rounded-md border bg-secondary/30 p-4 font-code text-sm">
              <pre className="whitespace-pre-wrap break-words">{result.report}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <FeedbackForm analysisId={analysisId} />
    </div>
  );
}
