"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteUserByEmailAction } from "@/actions/super-admin";

export function DeleteUserTool() {
  const [email, setEmail] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    if (!email.trim()) return;

    setIsDeleting(true);
    try {
      const result = await deleteUserByEmailAction(email.trim());
      if (result.success) {
        toast.success("User deleted successfully");
        setEmail("");
        setIsDialogOpen(false);
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("A system error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="rounded-[2rem] border-2 border-red-500/20 shadow-xl overflow-hidden bg-red-50/10 backdrop-blur-sm">
      <CardHeader className="bg-red-500/5 border-b border-red-500/10 p-6">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <CardTitle className="text-sm font-black uppercase tracking-widest text-red-700">
            Operator Tool: Delete Test User
          </CardTitle>
        </div>
        <CardDescription className="text-red-900/60 font-medium">
          TEMPORARY: Force delete a user by email to unblock testing. Safety checks applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Target User Email
            </label>
            <Input
              placeholder="e.g. test-owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border-2 border-red-500/10 focus:border-red-500/30 transition-all bg-white/50 backdrop-blur-sm"
            />
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs"
                disabled={!email.trim()}
              >
                Delete User
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem]">
              <DialogHeader>
                <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">
                  Dangerous Action
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">
                  You are about to permanently delete the user <span className="text-red-600 font-bold">{email}</span>. 
                  This action cannot be undone. Safety checks will block if the user has critical data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl font-bold uppercase tracking-widest text-xs"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="rounded-xl font-black uppercase tracking-widest text-xs min-w-[120px]"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
