'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
type ButtonSize = VariantProps<typeof buttonVariants>['size'];

interface GlowButtonProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  glow?: boolean;
  children?: React.ReactNode;
}

const variantMap: Record<string, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-transparent hover:bg-accent/10 hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent/10 hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizeMap: Record<string, string> = {
  default: 'h-11 px-6 py-2.5',
  sm: 'h-9 rounded-md px-4',
  lg: 'h-13 rounded-lg px-8 text-base',
  icon: 'h-10 w-10',
};

export function GlowButton({
  variant = 'default',
  size = 'default',
  className,
  glow = true,
  children,
  ...props
}: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantMap[variant ?? 'default'],
        sizeMap[size ?? 'default'],
        glow && variant === 'default' && 'glow-primary',
        className,
      )}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
