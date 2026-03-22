"use client";

import * as React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Role } from "@prisma/client";
import { createOrganizationUserAction } from "@/actions/team";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_ERROR } from "@/lib/auth/password";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Mail, Lock, UserCircle, UserPlus } from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUser: any) => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: Role.STAFF as Role,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      const result = await createOrganizationUserAction(formData);
      if (result.success) {
        toast.success("User added to team");
        onSuccess({
          ...formData,
          id: (result as any).user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId: null, // Placeholder as we don't have it on the client easily, but UserTable doesn't need it
          isStub: false,
          phone: null,
          passwordHash: null, // Don't expose hash
          emailVerifiedAt: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
        });
        setFormData({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          role: Role.STAFF,
        });
      } else {
        toast.error(result.error || "Failed to add user");
      }
    } catch (error) {
      toast.error("An error occurred while adding user");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-3xl overflow-hidden border-2 shadow-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="p-8 bg-muted/30 border-b-2">
            <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-primary" />
              Add <span className="text-primary">Team Member</span>
            </DialogTitle>
            <DialogDescription className="text-sm font-medium italic mt-1">
              Create a new user for your dealership with specific permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 italic">
                  First Name
                </Label>
                <Input 
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-all font-bold text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 italic">
                  Last Name
                </Label>
                <Input 
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="h-12 rounded-xl border-2 focus:border-primary transition-all font-bold text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 italic">
                <Mail className="h-3 w-3" />
                Email Address
              </Label>
              <Input 
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="h-12 rounded-xl border-2 focus:border-primary transition-all font-bold text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 italic">
                <Lock className="h-3 w-3" />
                Password
              </Label>
              <Input 
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="h-12 rounded-xl border-2 focus:border-primary transition-all font-bold text-sm"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
              <p className="text-[9px] font-medium text-muted-foreground italic px-1">
                {PASSWORD_MIN_ERROR}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 italic">
                <ShieldCheck className="h-3 w-3" />
                Role & Permissions
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => { if (val === Role.OWNER || val === Role.STAFF) setFormData({ ...formData, role: val }); }}
              >
                <SelectTrigger className="h-12 rounded-xl border-2 focus:border-primary transition-all font-bold text-sm italic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 shadow-xl">
                  <SelectItem value={Role.STAFF} className="font-bold text-xs uppercase italic py-3 cursor-pointer">
                    Staff Member
                  </SelectItem>
                  <SelectItem value={Role.OWNER} className="font-bold text-xs uppercase italic py-3 cursor-pointer">
                    Dealership Owner
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/10 border-t-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="h-12 rounded-xl font-black uppercase tracking-widest text-xs italic px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="h-12 rounded-xl font-black uppercase tracking-widest text-xs italic px-8 gap-2 shadow-lg shadow-primary/20"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create Team Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
