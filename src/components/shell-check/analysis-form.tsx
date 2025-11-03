'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, ClipboardPaste, XCircle, Link, ScanLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  scriptContent: z.string().optional(),
  scriptUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
}).refine(data => !!data.scriptContent || !!data.scriptUrl, {
  message: 'Please provide either script content or a URL.',
  path: ['scriptContent'], 
});

type AnalysisFormProps = {
  onAnalyze: (values: { scriptContent?: string; scriptUrl?: string }) => void;
  isLoading: boolean;
  onClear: () => void;
  hasResult: boolean;
};

const exampleScript = `#!/bin/bash

# WARNING: This script contains a potential command injection vulnerability.
echo "This script will try to remove a file."
read -p "Enter a filename to remove: " filename

# This is the dangerous part
rm $filename

echo "Operation finished."
`;

export function AnalysisForm({ onAnalyze, isLoading, onClear, hasResult }: AnalysisFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scriptContent: '',
      scriptUrl: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAnalyze(values);
  }

  const handlePasteExample = () => {
    form.setValue('scriptContent', exampleScript);
    form.setValue('scriptUrl', '');
  };

  const handleClear = () => {
    form.reset({ scriptContent: '', scriptUrl: '' });
    onClear();
  }
  
  const scriptContent = form.watch('scriptContent');
  const scriptUrl = form.watch('scriptUrl');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyze Shell Script</CardTitle>
        <CardDescription>
          Paste your shell script below or provide a URL to scan for dangerous code patterns without execution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="scriptContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Shell Script Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste your shell script here..."
                      className="min-h-[250px] font-code text-sm"
                      {...field}
                      disabled={!!scriptUrl}
                      onChange={(e) => {
                        if (e.target.value) form.setValue('scriptUrl', '');
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="relative flex items-center">
                <Separator className="flex-1" />
                <span className="mx-4 text-sm text-muted-foreground">OR</span>
                <Separator className="flex-1" />
            </div>

            <FormField
              control={form.control}
              name="scriptUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Script URL</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="https://example.com/script.sh"
                        className="pl-9"
                        {...field}
                        disabled={!!scriptContent}
                        onChange={(e) => {
                            if (e.target.value) form.setValue('scriptContent', '');
                            field.onChange(e);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={handlePasteExample} disabled={isLoading}>
                <ClipboardPaste />
                Paste Example
              </Button>
              <div className="flex items-center gap-2">
                {hasResult && (
                  <Button type="button" variant="outline" onClick={handleClear} disabled={isLoading}>
                    <XCircle />
                    Clear
                  </Button>
                )}
                <Button type="submit" disabled={isLoading || (!scriptContent && !scriptUrl)}>
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ScanLine />
                      Analyze Script
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
