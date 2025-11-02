import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, FileCode2, Package, NotebookPen } from 'lucide-react';
import { FeedbackForm } from './feedback-form';
import type { AssessRiskAndProvideReportOutput } from '@/ai/flows/assess-risk-and-provide-report';
import { Separator } from '../ui/separator';

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

const BillOfMaterialsDisplay = ({ bom }: { bom: AssessRiskAndProvideReportOutput['billOfMaterials'] }) => {
  const hasRemoteScripts = bom.remoteScripts && bom.remoteScripts.length > 0;
  const hasExternalBinaries = bom.externalBinaries && bom.externalBinaries.length > 0;

  if (!hasRemoteScripts && !hasExternalBinaries) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Bill of Materials</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {hasRemoteScripts && (
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
              <FileCode2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Remote Scripts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {bom.remoteScripts.map((script, index) => (
                  <li key={index} className="break-all">{script}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {hasExternalBinaries && (
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0 pb-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">External Binaries</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {bom.externalBinaries.map((binary, index) => (
                  <li key={index} className="break-all">{binary}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


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
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <NotebookPen className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Details & Remediation</h3>
            </div>
            <div className="max-h-[500px] overflow-auto rounded-md border bg-secondary/30 p-4 font-code text-sm">
              <pre className="whitespace-pre-wrap break-words">{result.report}</pre>
            </div>
          </div>
          {(result.billOfMaterials?.remoteScripts?.length > 0 || result.billOfMaterials?.externalBinaries?.length > 0) && <Separator />}
          {result.billOfMaterials && <BillOfMaterialsDisplay bom={result.billOfMaterials} />}
        </CardContent>
      </Card>

      <FeedbackForm analysisId={analysisId} />
    </div>
  );
}
