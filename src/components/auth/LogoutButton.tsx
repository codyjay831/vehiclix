"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  variant?: "icon" | "full";
  className?: string;
  onLogout?: () => void;
}

function InnerButton({ variant, className }: { variant: "icon" | "full"; className?: string }) {
  const { pending } = useFormStatus();

  if (variant === "icon") {
    return (
      <Button
        type="submit"
        disabled={pending}
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 text-muted-foreground hover:text-destructive", className)}
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Logout</span>
      </Button>
    );
  }

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="ghost"
      className={cn(
        "w-full font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive",
        className
      )}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {pending ? "Logging out..." : "Logout"}
    </Button>
  );
}

/**
 * Reusable logout button that handles the server action and form state.
 */
export function LogoutButton({ variant = "icon", className, onLogout }: LogoutButtonProps) {
  return (
    <form 
      action={logoutAction} 
      className={cn(variant === "full" && "w-full")}
      onSubmit={() => {
        if (onLogout) onLogout();
      }}
    >
      <InnerButton variant={variant} className={className} />
    </form>
  );
}
