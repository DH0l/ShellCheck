'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { submitFeedbackAction } from '@/app/actions';
import { cn } from '@/lib/utils';

const feedbackFormSchema = z.object({
  accuracyRating: z.number().min(1, 'Please provide a rating.'),
  feedbackText: z.string().optional(),
  suggestions: z.string().optional(),
});

type FeedbackFormProps = {
  analysisId: string;
};

const StarRating = ({ rating, setRating }: { rating: number; setRating: (rating: number) => void }) => {
  const [hoverRating, setHoverRating] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-7 w-7 cursor-pointer transition-colors',
            (hoverRating || rating) >= star ? 'fill-chart-4 text-chart-4' : 'text-muted-foreground'
          )}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
        />
      ))}
    </div>
  );
};

export function FeedbackForm({ analysisId }: FeedbackFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      accuracyRating: 0,
      feedbackText: '',
      suggestions: '',
    },
  });

  async function onSubmit(values: z.infer<typeof feedbackFormSchema>) {
    if (values.accuracyRating === 0) {
        form.setError("accuracyRating", { message: "Please provide a rating."});
        return;
    }
    setIsSubmitting(true);
    const result = await submitFeedbackAction({
      ...values,
      scriptAnalysisId: analysisId,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for helping us improve!',
      });
      form.reset({ accuracyRating: 0, feedbackText: '', suggestions: '' });
    } else {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: result.message,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Feedback</CardTitle>
        <CardDescription>
          Help improve our analysis by rating its accuracy and providing suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="accuracyRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How accurate was this analysis?</FormLabel>
                  <FormControl>
                    <StarRating rating={field.value} setRating={(value) => field.onChange(value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="feedbackText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Was anything missed or incorrectly flagged?" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suggestions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Suggestions for Improvement (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any ideas for new features or improvements?" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
