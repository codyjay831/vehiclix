import { toast as sonnerToast } from "sonner";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    if (variant === "destructive") {
      return sonnerToast.error(title || "Error", {
        description: description,
      });
    }
    return sonnerToast.success(title || "Success", {
      description: description,
    });
  };

  return { toast };
}
