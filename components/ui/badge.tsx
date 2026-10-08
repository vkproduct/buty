import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-50 text-brand-700",
        success: "border-transparent bg-success-50 text-success-700",
        brand: "border-transparent bg-gradient-cta text-white",
        teal: "border-transparent bg-teal-50 text-teal-800",
        coral: "border-transparent bg-coral-50 text-coral-700",
        amber: "border-transparent bg-amber-50 text-amber-800",
        outline: "border-ink-line bg-white text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
