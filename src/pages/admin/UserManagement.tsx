import { useState } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield, GraduationCap, UserX, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";

type UserRole = 'admin' | 'professor' | 'student';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  blocked: boolean;
  created_at: string;
  avatar_url: string | null;
}

export default function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" as UserRole });
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ['user-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('user_id, course_id');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(e => {
        counts[e.user_id] = (counts[e.user_id] || 0) + 1;
      });
      return counts;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Usuário atualizado com sucesso!');
      setEditingUser(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Usuário excluído com sucesso!');
      setDeleteUser(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir usuário: ' + error.message);
    },
  });

  const handleEdit = (userProfile: UserProfile) => {
    setEditingUser(userProfile);
    setEditForm({
      full_name: userProfile.full_name || "",
      role: userProfile.role as UserRole,
    });
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.user_id,
      updates: {
        full_name: editForm.full_name,
        role: editForm.role,
      },
    });
  };

  const handleToggleBlock = (userProfile: UserProfile) => {
    updateUserMutation.mutate({
      userId: userProfile.user_id,
      updates: { blocked: !userProfile.blocked },
    });
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    deleteUserMutation.mutate(deleteUser.user_id);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
      case 'professor':
        return <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><GraduationCap className="h-3 w-3" /> Professor</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> Aluno</Badge>;
    }
  };

  const filteredUsers = users?.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.role === 'admin').length || 0,
    professors: users?.filter(u => u.role === 'professor').length || 0,
    students: users?.filter(u => u.role === 'student').length || 0,
    blocked: users?.filter(u => u.blocked).length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader 
          title="Gerenciamento de Usuários"
          subtitle="Gerencie todos os usuários da plataforma"
        />

        <main className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{stats.admins}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.professors}</p>
                <p className="text-sm text-muted-foreground">Professores</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.students}</p>
                <p className="text-sm text-muted-foreground">Alunos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.blocked}</p>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Todos os Usuários</CardTitle>
                  <CardDescription>
                    Edite, bloqueie ou exclua usuários da plataforma
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Cursos</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userProfile) => (
                      <TableRow key={userProfile.id} className={userProfile.blocked ? "opacity-60" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {userProfile.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-medium">{userProfile.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{userProfile.user_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(userProfile.role)}</TableCell>
                        <TableCell>{enrollments?.[userProfile.user_id] || 0}</TableCell>
                        <TableCell>
                          {new Date(userProfile.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {userProfile.blocked ? (
                            <Badge variant="destructive">Bloqueado</Badge>
                          ) : (
                            <Badge variant="success">Ativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(userProfile)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleBlock(userProfile)}
                              title={userProfile.blocked ? "Desbloquear" : "Bloquear"}
                              disabled={userProfile.user_id === user?.id}
                            >
                              <UserX className={`h-4 w-4 ${userProfile.blocked ? 'text-orange-600' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUser(userProfile)}
                              title="Excluir"
                              disabled={userProfile.user_id === user?.id}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
                  <p>Os usuários aparecerão aqui após se cadastrarem na plataforma</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: UserRole) => setEditForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.full_name || 'este usuário'}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}