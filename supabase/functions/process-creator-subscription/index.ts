import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin user ID who receives the subscription payments
const ADMIN_USER_ID = "e2476f63-b58b-43b1-a8fb-b85e9a237f14";
const SUBSCRIPTION_AMOUNT = 29.99;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Usuário não autenticado");
    }

    const { gateway, amount, customerData } = await req.json();

    if (!gateway || !amount) {
      throw new Error("Dados incompletos");
    }

    const customer = {
      name: customerData?.name || userData.user.user_metadata?.full_name || userData.user.email,
      email: customerData?.email || userData.user.email,
      phone: customerData?.phone || "",
      cpf: customerData?.cpf || "",
    };

    // Get admin's payment configuration
    const { data: paymentConfig, error: configError } = await supabase
      .from("payment_configurations")
      .select("*")
      .eq("user_id", ADMIN_USER_ID)
      .eq("gateway", gateway)
      .eq("is_active", true)
      .single();

    if (configError || !paymentConfig) {
      throw new Error("Gateway de pagamento não configurado");
    }

    let paymentResult: any = { success: false };

    // Process payment based on gateway
    switch (gateway) {
      case "abacatepay":
        paymentResult = await processAbacatePayPayment(paymentConfig, customer, amount, userData.user.id);
        break;
      case "asaas":
        paymentResult = await processAsaasPayment(paymentConfig, customer, amount, userData.user.id);
        break;
      case "mercadopago":
        paymentResult = await processMercadoPagoPayment(paymentConfig, customer, amount, userData.user.id);
        break;
      case "pushinpay":
        paymentResult = await processPushinPayPayment(paymentConfig, customer, amount, userData.user.id);
        break;
      default:
        throw new Error("Gateway não suportado");
    }

    // Create subscription record
    if (paymentResult.success || paymentResult.redirectUrl || paymentResult.pixCode) {
      await supabase.from("creator_subscriptions").upsert({
        user_id: userData.user.id,
        gateway,
        payment_id: paymentResult.paymentId || null,
        amount: SUBSCRIPTION_AMOUNT,
        status: "pending",
      }, {
        onConflict: 'user_id'
      });
    }

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Subscription payment error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// AbacatePay Payment
async function processAbacatePayPayment(config: any, customer: any, amount: number, userId: string) {
  const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app");
  
  const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.secret_key}`,
    },
    body: JSON.stringify({
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: `creator-${userId}`,
          name: "Assinatura Criador de Conteúdo",
          quantity: 1,
          price: Math.round(amount * 100),
        },
      ],
      customer: {
        email: customer.email,
        name: customer.name,
        cellphone: customer.phone,
        taxId: customer.cpf.replace(/\D/g, ""),
      },
      returnUrl: `${baseUrl}/student?subscription=success`,
      completionUrl: `${baseUrl}/student?subscription=success`,
    }),
  });

  const result = await response.json();
  console.log("AbacatePay response:", JSON.stringify(result));

  if (result.error) {
    throw new Error(result.error || "Erro ao criar cobrança");
  }

  const billingData = result.data || result;
  
  return {
    success: true,
    redirectUrl: billingData.url,
    pixCode: billingData.pixQrCode || billingData.pix?.qrCode,
    pixImage: billingData.pixQrCodeBase64 || billingData.pix?.qrCodeBase64,
    paymentId: billingData.id,
    status: "pending",
    data: result,
  };
}

// Asaas Payment
async function processAsaasPayment(config: any, customer: any, amount: number, userId: string) {
  const isProduction = config.additional_config?.environment === "production";
  const baseUrl = isProduction ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";

  const customerResponse = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: config.secret_key,
    },
    body: JSON.stringify({
      name: customer.name,
      email: customer.email,
      mobilePhone: customer.phone,
    }),
  });

  const customerResult = await customerResponse.json();
  let customerId = customerResult.id;

  if (!customerId && customerResult.errors) {
    const searchResponse = await fetch(`${baseUrl}/customers?email=${customer.email}`, {
      headers: { access_token: config.secret_key },
    });
    const searchResult = await searchResponse.json();
    if (searchResult.data && searchResult.data.length > 0) {
      customerId = searchResult.data[0].id;
    } else {
      throw new Error("Erro ao criar cliente");
    }
  }

  const paymentResponse = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: config.secret_key,
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: amount,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: "Assinatura Criador de Conteúdo",
      externalReference: `creator-${userId}`,
    }),
  });

  const payment = await paymentResponse.json();

  if (payment.errors) {
    throw new Error(payment.errors[0]?.description || "Erro ao criar cobrança");
  }

  const pixResponse = await fetch(`${baseUrl}/payments/${payment.id}/pixQrCode`, {
    headers: { access_token: config.secret_key },
  });
  const pixData = await pixResponse.json();

  return {
    success: true,
    pixCode: pixData.payload,
    pixImage: pixData.encodedImage,
    paymentId: payment.id,
    status: "pending",
    data: { pixData },
  };
}

// Mercado Pago Payment
async function processMercadoPagoPayment(config: any, customer: any, amount: number, userId: string) {
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret_key}`,
      "X-Idempotency-Key": `creator-${userId}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      payment_method_id: "pix",
      payer: {
        email: customer.email,
        first_name: customer.name.split(" ")[0],
        last_name: customer.name.split(" ").slice(1).join(" ") || customer.name,
      },
      description: "Assinatura Criador de Conteúdo",
      external_reference: `creator-${userId}`,
    }),
  });

  const payment = await response.json();
  console.log("MercadoPago response:", JSON.stringify(payment));

  if (payment.error) {
    throw new Error(payment.message || "Erro ao criar pagamento PIX");
  }

  const pixData = payment.point_of_interaction?.transaction_data;

  return {
    success: true,
    pixCode: pixData?.qr_code,
    pixImage: pixData?.qr_code_base64,
    paymentId: payment.id?.toString(),
    status: "pending",
    data: payment,
  };
}

// PushinPay Payment
async function processPushinPayPayment(config: any, customer: any, amount: number, userId: string) {
  const response = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret_key}`,
    },
    body: JSON.stringify({
      value: Math.round(amount * 100),
      external_reference: `creator-${userId}`,
      payer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    }),
  });

  const result = await response.json();
  console.log("PushinPay response:", JSON.stringify(result));

  if (!result.qr_code) {
    throw new Error(result.message || "Erro ao gerar PIX");
  }

  return {
    success: true,
    pixCode: result.qr_code,
    pixImage: result.qr_code_base64,
    paymentId: result.id,
    status: "pending",
    data: result,
  };
}
