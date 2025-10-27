'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ClipboardPaste, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const formSchema = z.object({
  scriptContent: z.string().min(1, 'Script content cannot be empty.'),
});

type AnalysisFormProps = {
  onAnalyze: (scriptContent: string) => void;
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
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAnalyze(values.scriptContent);
  }

  const handlePasteExample = () => {
    form.setValue('scriptContent', exampleScript);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyze Shell Script</CardTitle>
        <CardDescription>
          Paste your shell script below to scan for dangerous code patterns without execution.
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={handlePasteExample}>
                <ClipboardPaste />
                Paste Example
              </Button>
              <div className="flex items-center gap-2">
                {hasResult && (
                  <Button type="button" variant="outline" onClick={() => { form.reset({scriptContent: ''}); onClear(); }}>
                    <XCircle />
                    Clear
                  </Button>
                )}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Script'
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
