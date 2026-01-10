import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Eye, EyeOff, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface PaymentConfig {
  id?: string;
  gateway: string;
  is_active: boolean;
  public_key: string;
  secret_key: string;
  webhook_secret: string;
  additional_config: Record<string, any>;
}

const GATEWAYS = [
  {
    id: "abacatepay",
    name: "AbacatePay",
    description: "Gateway brasileiro com PIX rápido e seguro",
    logo: "🥑",
    fields: [
      { key: "secret_key", label: "API Key", placeholder: "Sua chave de API", secret: true },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "Secret do webhook", secret: true },
    ],
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "Gateway brasileiro com PIX, boleto e cartão",
    logo: "🏦",
    fields: [
      { key: "secret_key", label: "API Key", placeholder: "$aact_...", secret: true },
      { key: "webhook_secret", label: "Webhook Token", placeholder: "Token do webhook", secret: true },
    ],
    additionalFields: [
      { key: "environment", label: "Ambiente", type: "select", options: ["sandbox", "production"] },
    ],
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "O gateway mais popular do Brasil",
    logo: "🛒",
    fields: [
      { key: "public_key", label: "Public Key", placeholder: "APP_USR-..." },
      { key: "secret_key", label: "Access Token", placeholder: "APP_USR-...", secret: true },
    ],
  },
  {
    id: "pushinpay",
    name: "PushinPay",
    description: "Solução de pagamentos com PIX instantâneo",
    logo: "⚡",
    fields: [
      { key: "secret_key", label: "API Token", placeholder: "Seu token de API", secret: true },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "Secret do webhook", secret: true },
    ],
  },
];

export default function PaymentSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("abacatepay");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, PaymentConfig>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Fetch existing configurations
  const { data: existingConfigs, isLoading } = useQuery({
    queryKey: ["payment-configurations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payment_configurations")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Initialize configs from database
  useEffect(() => {
    if (existingConfigs) {
      const configMap: Record<string, PaymentConfig> = {};
      GATEWAYS.forEach((gateway) => {
        const existing = existingConfigs.find((c: any) => c.gateway === gateway.id);
        if (existing) {
          configMap[gateway.id] = {
            id: existing.id,
            gateway: existing.gateway,
            is_active: existing.is_active,
            public_key: existing.public_key || "",
            secret_key: existing.secret_key || "",
            webhook_secret: existing.webhook_secret || "",
            additional_config: typeof existing.additional_config === 'object' && existing.additional_config !== null && !Array.isArray(existing.additional_config) 
              ? existing.additional_config as Record<string, any>
              : {},
          };
        } else {
          configMap[gateway.id] = {
            gateway: gateway.id,
            is_active: false,
            public_key: "",
            secret_key: "",
            webhook_secret: "",
            additional_config: {},
          };
        }
      });
      setConfigs(configMap);
    }
  }, [existingConfigs]);

  const updateConfig = (gateway: string, field: string, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [field]: value,
      },
    }));
  };

  const updateAdditionalConfig = (gateway: string, field: string, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        additional_config: {
          ...prev[gateway]?.additional_config,
          [field]: value,
        },
      },
    }));
  };

  const saveConfiguration = async (gatewayId: string) => {
    if (!user) return;
    setSaving(gatewayId);

    try {
      const config = configs[gatewayId];
      const data = {
        user_id: user.id,
        gateway: gatewayId,
        is_active: config.is_active,
        public_key: config.public_key || null,
        secret_key: config.secret_key || null,
        webhook_secret: config.webhook_secret || null,
        additional_config: config.additional_config,
      };

      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from("payment_configurations")
          .update(data)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("payment_configurations")
          .insert(data);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["payment-configurations"] });
      toast.success("Configuração salva com sucesso!");
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSaving(null);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />

      <div className="lg:pl-64">
        <DashboardHeader
          title="Configurações de Pagamento"
          subtitle="Configure seus gateways de pagamento para receber pelos cursos"
        />

        <main className="p-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gateways de Pagamento
              </CardTitle>
              <CardDescription>
                Configure as credenciais dos gateways que deseja utilizar. Você pode ativar múltiplos gateways e seus alunos poderão escolher na hora do pagamento.
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto mb-6">
              {GATEWAYS.map((gateway) => {
                const config = configs[gateway.id];
                const isConfigured = config?.secret_key;
                const isActive = config?.is_active;

                return (
                  <TabsTrigger
                    key={gateway.id}
                    value={gateway.id}
                    className="flex items-center gap-2 py-3 relative"
                  >
                    <span className="text-xl">{gateway.logo}</span>
                    <span>{gateway.name}</span>
                    {isActive && isConfigured && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 absolute top-1 right-1" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {GATEWAYS.map((gateway) => {
              const config = configs[gateway.id] || {
                gateway: gateway.id,
                is_active: false,
                public_key: "",
                secret_key: "",
                webhook_secret: "",
                additional_config: {},
              };

              return (
                <TabsContent key={gateway.id} value={gateway.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{gateway.logo}</span>
                          <div>
                            <CardTitle>{gateway.name}</CardTitle>
                            <CardDescription>{gateway.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`${gateway.id}-active`} className="text-sm">
                            {config.is_active ? "Ativo" : "Inativo"}
                          </Label>
                          <Switch
                            id={`${gateway.id}-active`}
                            checked={config.is_active || false}
                            onCheckedChange={(checked) => updateConfig(gateway.id, "is_active", checked)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {gateway.fields.map((field) => {
                        const fieldKey = `${gateway.id}-${field.key}`;
                        const isSecret = field.secret;
                        const showValue = showSecrets[fieldKey];

                        return (
                          <div key={field.key} className="space-y-2">
                            <Label htmlFor={fieldKey}>{field.label}</Label>
                            <div className="relative">
                              <Input
                                id={fieldKey}
                                type={isSecret && !showValue ? "password" : "text"}
                                value={(config as any)[field.key] || ""}
                                onChange={(e) => updateConfig(gateway.id, field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="pr-10"
                              />
                              {isSecret && (
                                <button
                                  type="button"
                                  onClick={() => toggleSecret(fieldKey)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {gateway.additionalFields?.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={`${gateway.id}-${field.key}`}>{field.label}</Label>
                          {field.type === "select" && field.options ? (
                            <select
                              id={`${gateway.id}-${field.key}`}
                              value={config.additional_config?.[field.key] || field.options[0]}
                              onChange={(e) => updateAdditionalConfig(gateway.id, field.key, e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt === "sandbox" ? "Sandbox (Testes)" : "Produção"}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={`${gateway.id}-${field.key}`}
                              value={config.additional_config?.[field.key] || ""}
                              onChange={(e) => updateAdditionalConfig(gateway.id, field.key, e.target.value)}
                            />
                          )}
                        </div>
                      ))}

                      <div className="pt-4 border-t">
                        <Button
                          onClick={() => saveConfiguration(gateway.id)}
                          disabled={saving === gateway.id}
                          className="w-full sm:w-auto"
                        >
                          {saving === gateway.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Salvar Configuração
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                        <p className="font-medium mb-2">📌 Instruções:</p>
                        {gateway.id === "abacatepay" && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Acesse <a href="https://abacatepay.com" target="_blank" className="text-primary hover:underline">AbacatePay</a> e crie uma conta</li>
                            <li>Vá em Configurações → API</li>
                            <li>Copie sua chave de API</li>
                          </ul>
                        )}
                        {gateway.id === "asaas" && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Acesse <a href="https://www.asaas.com" target="_blank" className="text-primary hover:underline">Asaas</a> e crie uma conta</li>
                            <li>Vá em Integrações → API</li>
                            <li>Gere sua chave de API</li>
                          </ul>
                        )}
                        {gateway.id === "mercadopago" && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Acesse <a href="https://www.mercadopago.com.br/developers" target="_blank" className="text-primary hover:underline">Mercado Pago Developers</a></li>
                            <li>Crie uma aplicação</li>
                            <li>Copie as credenciais de produção</li>
                          </ul>
                        )}
                        {gateway.id === "pushinpay" && (
                          <ul className="list-disc list-inside space-y-1">
                            <li>Acesse <a href="https://pushinpay.com.br" target="_blank" className="text-primary hover:underline">PushinPay</a></li>
                            <li>Crie sua conta e acesse o painel</li>
                            <li>Gere seu token de API em Configurações</li>
                          </ul>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </main>
      </div>
    </div>
  );
}
