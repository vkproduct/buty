import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-lg border border-input bg-white px-4 py-2 text-base text-foreground transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-muted focus-visible:border-foreground focus-visible:shadow-[0_0_0_1px_#222] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
