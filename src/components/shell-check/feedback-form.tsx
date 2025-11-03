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
  accuracyRating: z.number().min(1, 'Please provide a star rating.'),
  feedbackText: z.string().optional(),
  suggestions: z.string().optional(),
});

type FeedbackFormProps = {
  analysisId: string;
};

const StarRating = ({ rating, setRating, disabled }: { rating: number; setRating: (rating: number) => void; disabled: boolean }) => {
  const [hoverRating, setHoverRating] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-7 w-7 transition-colors',
            disabled ? 'cursor-not-allowed text-muted-foreground/50' : 'cursor-pointer',
            (hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )}
          onClick={() => !disabled && setRating(star)}
          onMouseEnter={() => !disabled && setHoverRating(star)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
        />
      ))}
    </div>
  );
};

export function FeedbackForm({ analysisId }: FeedbackFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      accuracyRating: 0,
      feedbackText: '',
      suggestions: '',
    },
  });

  async function onSubmit(values: z.infer<typeof feedbackFormSchema>) {
    setIsSubmitting(true);
    const result = await submitFeedbackAction({
      ...values,
      scriptAnalysisId: analysisId,
    });
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for helping us improve!',
      });
      // Don't reset the form, just keep it disabled
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
          {isSuccess
            ? 'Thank you for your feedback!'
            : 'Help improve our analysis by rating its accuracy and providing suggestions.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isSubmitting || isSuccess}>
              <FormField
                control={form.control}
                name="accuracyRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How accurate was this analysis?</FormLabel>
                    <FormControl>
                      <StarRating
                        rating={field.value}
                        setRating={(value) => field.onChange(value)}
                        disabled={isSubmitting || isSuccess}
                      />
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

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting || isSuccess || form.getValues('accuracyRating') === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : isSuccess ? (
                    'Submitted'
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </div>
            </fieldset>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
