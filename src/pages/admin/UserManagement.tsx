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
import { Users, Shield, GraduationCap, UserX, Pencil, Trash2, Search, Loader2, Calendar, Plus, Mail, Lock, Eye, EyeOff } from "lucide-react";
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
import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface CreatorSubscription {
  id: string;
  user_id: string;
  expires_at: string | null;
  status: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "" as UserRole });
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [subscriptionDays, setSubscriptionDays] = useState<number>(30);
  const [currentSubscription, setCurrentSubscription] = useState<CreatorSubscription | null>(null);
  
  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    email: "", 
    password: "", 
    full_name: "", 
    role: "student" as UserRole 
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Edit credentials state
  const [userEmail, setUserEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

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

  const { data: subscriptions } = useQuery({
    queryKey: ['creator-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Get latest subscription per user
      const latestByUser: Record<string, CreatorSubscription> = {};
      data.forEach(sub => {
        if (!latestByUser[sub.user_id] || new Date(sub.created_at) > new Date(latestByUser[sub.user_id].expires_at || 0)) {
          latestByUser[sub.user_id] = sub;
        }
      });
      return latestByUser;
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

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, newExpiresAt }: { subscriptionId: string; newExpiresAt: Date }) => {
      const { error } = await supabase
        .from('creator_subscriptions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', subscriptionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-subscriptions'] });
      toast.success('Data de expiração atualizada com sucesso!');
      setCurrentSubscription(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar assinatura: ' + error.message);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: { email: string; password: string; full_name: string; role: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_user',
          ...userData,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Usuário criado com sucesso!');
      setShowCreateModal(false);
      setCreateForm({ email: "", password: "", full_name: "", role: "student" });
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message);
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ user_id, new_email }: { user_id: string; new_email: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_email',
          user_id,
          new_email,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Email atualizado com sucesso!');
      setNewEmail("");
    },
    onError: (error) => {
      toast.error('Erro ao atualizar email: ' + error.message);
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ user_id, new_password }: { user_id: string; new_password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'update_password',
          user_id,
          new_password,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Senha atualizada com sucesso!');
      setNewPassword("");
    },
    onError: (error) => {
      toast.error('Erro ao atualizar senha: ' + error.message);
    },
  });

  const fetchUserEmail = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'get_user_email',
          user_id: userId,
        }),
      });
      const result = await response.json();
      if (response.ok && result.email) {
        setUserEmail(result.email);
        setNewEmail(result.email);
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  const handleEdit = async (userProfile: UserProfile) => {
    setEditingUser(userProfile);
    setEditForm({
      full_name: userProfile.full_name || "",
      role: userProfile.role as UserRole,
    });
    setNewPassword("");
    setNewEmail("");
    setUserEmail("");
    
    // Fetch user email
    fetchUserEmail(userProfile.user_id);
    
    // Fetch subscription if professor
    if (userProfile.role === 'professor' && subscriptions?.[userProfile.user_id]) {
      const sub = subscriptions[userProfile.user_id];
      setCurrentSubscription(sub);
      if (sub.expires_at) {
        const daysRemaining = differenceInDays(new Date(sub.expires_at), new Date());
        setSubscriptionDays(Math.max(0, daysRemaining));
      } else {
        setSubscriptionDays(30);
      }
    } else {
      setCurrentSubscription(null);
      setSubscriptionDays(30);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    // Update user profile
    await updateUserMutation.mutateAsync({
      userId: editingUser.user_id,
      updates: {
        full_name: editForm.full_name,
        role: editForm.role,
      },
    });

    // Update subscription expiration if professor with existing subscription
    if (editForm.role === 'professor' && currentSubscription) {
      const newExpiresAt = addDays(new Date(), subscriptionDays);
      await updateSubscriptionMutation.mutateAsync({
        subscriptionId: currentSubscription.id,
        newExpiresAt,
      });
    }
  };

  const handleUpdateSubscriptionOnly = () => {
    if (!currentSubscription) return;
    const newExpiresAt = addDays(new Date(), subscriptionDays);
    updateSubscriptionMutation.mutate({
      subscriptionId: currentSubscription.id,
      newExpiresAt,
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
                <div className="flex items-center gap-4">
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Usuário
                  </Button>
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

            {/* Email and Password Section */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-4 w-4" />
                <Label className="text-sm font-medium">Credenciais de Acesso</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="current_email" className="text-xs text-muted-foreground">Email atual</Label>
                <p className="text-sm">{userEmail || 'Carregando...'}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new_email">Novo Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="new_email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@email.com"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editingUser && updateEmailMutation.mutate({ 
                      user_id: editingUser.user_id, 
                      new_email: newEmail 
                    })}
                    disabled={updateEmailMutation.isPending || !newEmail || newEmail === userEmail}
                  >
                    {updateEmailMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Atualizar'
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova Senha</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nova senha (mín. 6 caracteres)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editingUser && updatePasswordMutation.mutate({ 
                      user_id: editingUser.user_id, 
                      new_password: newPassword 
                    })}
                    disabled={updatePasswordMutation.isPending || newPassword.length < 6}
                  >
                    {updatePasswordMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Atualizar'
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Professor subscription expiration */}
            {(editForm.role === 'professor' || editingUser?.role === 'professor') && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-blue-600">
                  <Calendar className="h-4 w-4" />
                  <Label className="text-sm font-medium">Assinatura de Professor</Label>
                </div>
                
                {currentSubscription ? (
                  <>
                    <div className="text-sm text-muted-foreground">
                      {currentSubscription.expires_at ? (
                        <>
                          <p>
                            Expira em: <strong>{format(new Date(currentSubscription.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong>
                          </p>
                          <p className="mt-1">
                            {differenceInDays(new Date(currentSubscription.expires_at), new Date()) > 0 
                              ? `(${differenceInDays(new Date(currentSubscription.expires_at), new Date())} dias restantes)`
                              : '(Expirado)'}
                          </p>
                        </>
                      ) : (
                        <p>Sem data de expiração definida</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subscription_days">Definir nova expiração (dias a partir de hoje)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="subscription_days"
                          type="number"
                          min="0"
                          max="365"
                          value={subscriptionDays}
                          onChange={(e) => setSubscriptionDays(parseInt(e.target.value) || 0)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground self-center">
                          = {format(addDays(new Date(), subscriptionDays), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSubscriptionDays(7)}
                        >
                          7 dias
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSubscriptionDays(30)}
                        >
                          30 dias
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSubscriptionDays(90)}
                        >
                          90 dias
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSubscriptionDays(365)}
                        >
                          1 ano
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Este usuário não possui assinatura de professor ativa.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateUserMutation.isPending || updateSubscriptionMutation.isPending}
            >
              {(updateUserMutation.isPending || updateSubscriptionMutation.isPending) ? (
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

      {/* Create User Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Adicione um novo usuário à plataforma
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create_email">Email *</Label>
              <Input
                id="create_email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_password">Senha *</Label>
              <div className="relative">
                <Input
                  id="create_password"
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_full_name">Nome Completo</Label>
              <Input
                id="create_full_name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_role">Cargo</Label>
              <Select
                value={createForm.role}
                onValueChange={(value: UserRole) => setCreateForm(prev => ({ ...prev, role: value }))}
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
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createUserMutation.mutate(createForm)} 
              disabled={createUserMutation.isPending || !createForm.email || createForm.password.length < 6}
            >
              {createUserMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}