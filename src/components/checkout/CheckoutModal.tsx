import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, QrCode, Copy, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentGateway {
  id: string;
  gateway: string;
  is_active: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  price: number;
  sellerId: string;
  onSuccess: () => void;
}

interface CustomerData {
  fullName: string;
  email: string;
  phone: string;
}

interface PixData {
  pixCode: string;
  pixImage?: string;
  paymentId: string;
}

const GATEWAY_INFO: Record<string, { name: string; logo: string }> = {
  abacatepay: { name: "AbacatePay", logo: "🥑" },
  asaas: { name: "Asaas", logo: "🏦" },
  mercadopago: { name: "Mercado Pago", logo: "🛒" },
  pushinpay: { name: "PushinPay", logo: "⚡" },
};

type Step = "form" | "gateway" | "pix";

export function CheckoutModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  price,
  sellerId,
  onSuccess,
}: CheckoutModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [availableGateways, setAvailableGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [customerData, setCustomerData] = useState<CustomerData>({
    fullName: "",
    email: "",
    phone: "",
  });
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setPixData(null);
      setCopied(false);
      setLoadingGateways(true);
      
      // Fetch gateways
      const fetchGateways = async () => {
        try {
          const { data, error } = await supabase
            .from("payment_configurations")
            .select("id, gateway, is_active")
            .eq("user_id", sellerId)
            .eq("is_active", true);

          if (error) throw error;
          setAvailableGateways(data || []);
          if (data && data.length > 0) {
            setSelectedGateway(data[0].gateway);
          }
        } catch (error) {
          console.error("Error fetching gateways:", error);
        } finally {
          setLoadingGateways(false);
        }
      };

      fetchGateways();
    } else {
      // Reset form when closing
      setCustomerData({ fullName: "", email: "", phone: "" });
      setSelectedGateway("");
    }
  }, [isOpen, sellerId]);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    setCustomerData(prev => ({ ...prev, phone: formatPhone(value) }));
  };

  const validateForm = () => {
    if (!customerData.fullName.trim()) {
      toast.error("Por favor, informe seu nome completo");
      return false;
    }
    if (!customerData.email.trim() || !customerData.email.includes("@")) {
      toast.error("Por favor, informe um email válido");
      return false;
    }
    const phoneNumbers = customerData.phone.replace(/\D/g, "");
    if (phoneNumbers.length < 10) {
      toast.error("Por favor, informe um telefone válido");
      return false;
    }
    return true;
  };

  const handleContinueToGateway = () => {
    if (!validateForm()) return;
    
    if (availableGateways.length === 1) {
      // If only one gateway, skip selection and generate PIX directly
      handleGeneratePix();
    } else if (availableGateways.length > 1) {
      setStep("gateway");
    } else {
      toast.error("Nenhum método de pagamento disponível");
    }
  };

  const handleGeneratePix = async () => {
    if (!selectedGateway) {
      toast.error("Selecione um método de pagamento");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          courseId,
          gateway: selectedGateway,
          paymentMethod: "pix",
          amount: price,
          customerData: {
            name: customerData.fullName,
            email: customerData.email,
            phone: customerData.phone.replace(/\D/g, ""),
          },
        },
      });

      if (error) throw error;

      if (data.success || data.pixCode || data.redirectUrl) {
        if (data.pixCode) {
          setPixData({
            pixCode: data.pixCode,
            pixImage: data.pixImage,
            paymentId: data.paymentId,
          });
          setStep("pix");
        } else if (data.redirectUrl) {
          // For gateways that redirect (like AbacatePay checkout page)
          window.location.href = data.redirectUrl;
        }
      } else {
        throw new Error(data.message || "Erro ao gerar PIX");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.pixCode) {
      await navigator.clipboard.writeText(pixData.pixCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const goBack = () => {
    if (step === "gateway") setStep("form");
    else if (step === "pix") setStep("gateway");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "form" && (
              <button onClick={goBack} className="p-1 hover:bg-muted rounded-md transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            {step === "form" && "Dados para Compra"}
            {step === "gateway" && "Método de Pagamento"}
            {step === "pix" && "Pague com PIX"}
          </DialogTitle>
          <DialogDescription>
            {step === "form" && "Preencha seus dados para continuar"}
            {step === "gateway" && "Escolha como deseja pagar"}
            {step === "pix" && "Escaneie o QR Code ou copie o código"}
          </DialogDescription>
        </DialogHeader>

        {/* Course Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h4 className="font-medium mb-1 line-clamp-1">{courseTitle}</h4>
          <p className="text-2xl font-bold text-primary">{formatPrice(price)}</p>
        </div>

        {loadingGateways && step === "form" ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : availableGateways.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Este vendedor ainda não configurou métodos de pagamento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Customer Form */}
            {step === "form" && (
              <>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome completo"
                      value={customerData.fullName}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={customerData.email}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={customerData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleContinueToGateway}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Continuar para Pagamento"
                  )}
                </Button>
              </>
            )}

            {/* Step 2: Gateway Selection (if multiple) */}
            {step === "gateway" && (
              <>
                <RadioGroup value={selectedGateway} onValueChange={setSelectedGateway}>
                  {availableGateways.map((gw) => {
                    const info = GATEWAY_INFO[gw.gateway];
                    return (
                      <div
                        key={gw.gateway}
                        className="flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem value={gw.gateway} id={gw.gateway} />
                        <Label htmlFor={gw.gateway} className="flex items-center gap-2 cursor-pointer flex-1">
                          <span className="text-xl">{info?.logo}</span>
                          <span className="font-medium">{info?.name}</span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGeneratePix}
                  disabled={loading || !selectedGateway}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code PIX
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Step 3: PIX QR Code Display */}
            {step === "pix" && pixData && (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  {pixData.pixImage ? (
                    <img
                      src={`data:image/png;base64,${pixData.pixImage}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 rounded-lg border"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                      <QrCode className="h-24 w-24 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* PIX Code */}
                <div className="space-y-2">
                  <Label>Código PIX Copia e Cola</Label>
                  <div className="relative">
                    <Input
                      readOnly
                      value={pixData.pixCode}
                      className="pr-12 text-xs font-mono"
                    />
                    <button
                      onClick={copyPixCode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-md transition-colors"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyPixCode}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                      Código Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Código PIX
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Após o pagamento, seu acesso será liberado automaticamente.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}