import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold transition-[background,color,border-color,box-shadow,transform] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white shadow-sm hover:bg-brand-600",
        secondary:
          "border border-foreground bg-white text-foreground hover:bg-ink-wash",
        outline:
          "border border-ink-line bg-white text-foreground hover:bg-ink-wash",
        ghost:
          "font-medium text-foreground hover:bg-ink-wash",
        warm: "bg-foreground text-white hover:bg-black",
        /** Белая пилюля на цветном или тёмном фоне (hero, промо-карточки). */
        white: "bg-white font-bold text-foreground shadow-md hover:bg-ink-wash",
        /** Полупрозрачная пилюля на цветном фоне. */
        glass:
          "border border-white/40 bg-white/20 font-bold text-white backdrop-blur-md hover:bg-white/30",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
