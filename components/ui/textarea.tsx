import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onWheel, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLTextAreaElement>) => {
      // Prevent parent smooth-scroll hijackers (like Lenis) from stopping native scrolling
      (e.nativeEvent as any).lenisStopPropagation = true;
      e.stopPropagation();
      onWheel?.(e);
    };

    return (
      <textarea
        data-lenis-prevent="true"
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overscroll-contain',
          className
        )}
        ref={ref}
        onWheel={handleWheel}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
