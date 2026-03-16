"use client";

import * as React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  UserCircle 
} from "lucide-react";
import { Role, User } from "@prisma/client";
import { format } from "date-fns";
import { deleteOrganizationUserAction, updateOrganizationUserRoleAction } from "@/actions/team";
import { toast } from "sonner";
import { AddUserModal } from "./AddUserModal";

interface UserTableProps {
  initialUsers: User[];
  currentUserRole: Role;
  currentUserId: string;
}

export function UserTable({ initialUsers, currentUserRole, currentUserId }: UserTableProps) {
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [isPending, startTransition] = React.useTransition();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const handleDelete = (userId: string) => {
    if (!confirm("Are you sure you want to remove this user? This cannot be undone.")) return;

    startTransition(async () => {
      try {
        const result = await deleteOrganizationUserAction(userId);
        if (result.success) {
          toast.success("User removed from team");
          setUsers(users.filter(u => u.id !== userId));
        } else {
          toast.error(result.error || "Failed to remove user");
        }
      } catch (error) {
        toast.error("An error occurred while removing user");
      }
    });
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    startTransition(async () => {
      try {
        const result = await updateOrganizationUserRoleAction(userId, newRole);
        if (result.success) {
          toast.success("User role updated");
          setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } else {
          toast.error(result.error || "Failed to update role");
        }
      } catch (error) {
        toast.error("An error occurred while updating role");
      }
    });
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch (role) {
      case Role.OWNER:
        return "default";
      case Role.STAFF:
        return "secondary";
      case Role.SUPER_ADMIN:
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tight italic">
          Active <span className="text-primary">Team Members</span>
        </h2>
        <Button 
          onClick={() => setIsAddModalOpen(true)} 
          className="rounded-xl font-black uppercase tracking-widest text-xs h-10 px-6 gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="rounded-2xl border-2 overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Name</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Email</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Role</TableHead>
              <TableHead className="font-black uppercase tracking-widest text-[10px]">Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-bold uppercase tracking-tight text-sm italic">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground text-sm">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="font-black uppercase tracking-widest text-[9px]">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-medium">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-2 shadow-xl">
                          <DropdownMenuLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-2 py-1.5">
                            Member Options
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {user.role === Role.OWNER ? (
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, Role.STAFF)} className="flex items-center gap-2 font-bold text-xs uppercase italic cursor-pointer">
                              <ShieldCheck className="h-4 w-4" />
                              Change to Staff
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, Role.OWNER)} className="flex items-center gap-2 font-bold text-xs uppercase italic cursor-pointer">
                              <ShieldCheck className="h-4 w-4" />
                              Change to Owner
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(user.id)}
                            className="flex items-center gap-2 text-destructive focus:text-destructive font-bold text-xs uppercase italic cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove from team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-medium italic">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddUserModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={(newUser) => {
          setUsers([newUser as User, ...users]);
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
}
