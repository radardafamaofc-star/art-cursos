import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, QrCode, Barcode } from "lucide-react";
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

const GATEWAY_INFO: Record<string, { name: string; logo: string; methods: string[] }> = {
  stripe: { name: "Stripe", logo: "💳", methods: ["Cartão de Crédito"] },
  asaas: { name: "Asaas", logo: "🏦", methods: ["PIX", "Boleto", "Cartão"] },
  mercadopago: { name: "Mercado Pago", logo: "🛒", methods: ["PIX", "Cartão", "Boleto"] },
  pushinpay: { name: "PushinPay", logo: "⚡", methods: ["PIX"] },
};

export function CheckoutModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  price,
  sellerId,
  onSuccess,
}: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [availableGateways, setAvailableGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("pix");

  // Fetch seller's active payment gateways
  useState(() => {
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

    if (isOpen && sellerId) {
      fetchGateways();
    }
  });

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handlePayment = async () => {
    if (!selectedGateway) {
      toast.error("Selecione um método de pagamento");
      return;
    }

    setLoading(true);

    try {
      // Call edge function to process payment
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          courseId,
          gateway: selectedGateway,
          paymentMethod: selectedMethod,
          amount: price,
        },
      });

      if (error) throw error;

      if (data.success) {
        if (data.redirectUrl) {
          // Redirect to payment page
          window.location.href = data.redirectUrl;
        } else if (data.pixCode) {
          // Show PIX QR code
          toast.success("PIX gerado com sucesso!");
          // You could show a modal with the PIX code here
        } else {
          toast.success("Pagamento processado com sucesso!");
          onSuccess();
          onClose();
        }
      } else {
        throw new Error(data.message || "Erro ao processar pagamento");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Compra</DialogTitle>
          <DialogDescription>
            Complete o pagamento para acessar o curso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-1">{courseTitle}</h4>
            <p className="text-2xl font-bold text-primary">{formatPrice(price)}</p>
          </div>

          {loadingGateways ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : availableGateways.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Este vendedor ainda não configurou métodos de pagamento.</p>
            </div>
          ) : (
            <>
              {/* Gateway Selection */}
              <div className="space-y-3">
                <Label>Selecione o gateway de pagamento:</Label>
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
                          <div>
                            <span className="font-medium">{info?.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {info?.methods.join(" • ")}
                            </p>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Payment Method */}
              {selectedGateway && GATEWAY_INFO[selectedGateway]?.methods.length > 1 && (
                <div className="space-y-3">
                  <Label>Forma de pagamento:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {GATEWAY_INFO[selectedGateway].methods.map((method) => {
                      const methodKey = method.toLowerCase().replace(/\s+/g, "_");
                      const isSelected = selectedMethod === methodKey;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSelectedMethod(methodKey)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {method.includes("PIX") && <QrCode className="h-5 w-5" />}
                          {method.includes("Cartão") && <CreditCard className="h-5 w-5" />}
                          {method.includes("Boleto") && <Barcode className="h-5 w-5" />}
                          <span className="text-xs font-medium">{method}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handlePayment}
                disabled={loading || !selectedGateway}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  `Pagar ${formatPrice(price)}`
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
