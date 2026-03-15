import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion, HTMLMotionProps } from "framer-motion";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent font-medium",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-transparent font-medium",
      outline: "bg-transparent border border-border hover:bg-secondary/50 text-foreground font-medium",
      ghost: "bg-transparent hover:bg-secondary/50 text-foreground font-medium border border-transparent",
      danger: "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 font-medium",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-10 px-6 text-sm",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-all duration-200 ease-out active:scale-[0.98]",
          "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// Card
export const Card = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn("bg-card border border-border rounded-md p-6 shadow-sm", className)}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// Badge
export function Badge({ className, variant = "default", children }: { className?: string, variant?: "default" | "success" | "outline" | "accent", children: React.ReactNode }) {
  const variants = {
    default: "bg-secondary text-secondary-foreground border-transparent",
    success: "bg-success/10 text-success border-success/20",
    outline: "bg-transparent text-muted-foreground border-border",
    accent: "bg-accent/10 text-accent border-accent/20",
  };
  
  return (
    <div className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap", variants[variant], className)}>
      {children}
    </div>
  );
}
