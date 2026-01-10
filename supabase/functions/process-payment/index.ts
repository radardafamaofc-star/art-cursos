import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
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

    const { courseId, gateway, paymentMethod, amount, customerData } = await req.json();

    if (!courseId || !gateway || !amount) {
      throw new Error("Dados incompletos");
    }

    // Use customer data from form or fall back to user data
    const customer = {
      name: customerData?.name || userData.user.user_metadata?.full_name || userData.user.email,
      email: customerData?.email || userData.user.email,
      phone: customerData?.phone || "",
      cpf: customerData?.cpf || "",
    };

    // Get course info to find seller
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, price, created_by")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      throw new Error("Curso não encontrado");
    }

    // Get seller's payment configuration
    const { data: paymentConfig, error: configError } = await supabase
      .from("payment_configurations")
      .select("*")
      .eq("user_id", course.created_by)
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
        paymentResult = await processAbacatePayPayment(paymentConfig, course, customer, amount);
        break;
      case "asaas":
        paymentResult = await processAsaasPayment(paymentConfig, course, customer, amount, paymentMethod);
        break;
      case "mercadopago":
        paymentResult = await processMercadoPagoPayment(paymentConfig, course, customer, amount, paymentMethod);
        break;
      case "pushinpay":
        paymentResult = await processPushinPayPayment(paymentConfig, course, customer, amount);
        break;
      default:
        throw new Error("Gateway não suportado");
    }

    // Create payment record
    if (paymentResult.success || paymentResult.redirectUrl || paymentResult.pixCode) {
      await supabase.from("payments").insert({
        course_id: courseId,
        user_id: userData.user.id,
        seller_id: course.created_by,
        gateway,
        gateway_payment_id: paymentResult.paymentId || null,
        amount,
        status: paymentResult.status || "pending",
        payment_method: paymentMethod || "card",
        payment_data: paymentResult.data || {},
      });
    }

    return new Response(JSON.stringify(paymentResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

// AbacatePay Payment (PIX)
async function processAbacatePayPayment(config: any, course: any, customer: any, amount: number) {
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
          externalId: course.id,
          name: course.title,
          quantity: 1,
          price: Math.round(amount * 100), // Amount in cents
        },
      ],
      customer: {
        email: customer.email,
        name: customer.name,
        cellphone: customer.phone,
        taxId: customer.cpf.replace(/\D/g, ""),
      },
      returnUrl: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=success`,
      completionUrl: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=success`,
    }),
  });

  const result = await response.json();
  console.log("AbacatePay response:", JSON.stringify(result));

  if (result.error) {
    throw new Error(result.error || "Erro ao criar cobrança no AbacatePay");
  }

  // AbacatePay returns the PIX data in the response
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
async function processAsaasPayment(config: any, course: any, customer: any, amount: number, method: string) {
  const isProduction = config.additional_config?.environment === "production";
  const baseUrl = isProduction ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";

  // First, create or get customer
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
    // Customer might already exist, try to find
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

  return await createAsaasPayment(baseUrl, config.secret_key, customerId, course, amount, method);
}

async function createAsaasPayment(baseUrl: string, apiKey: string, customerId: string, course: any, amount: number, method: string) {
  const billingType = method === "pix" ? "PIX" : method === "boleto" ? "BOLETO" : "CREDIT_CARD";

  const paymentResponse = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: amount,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: `Curso: ${course.title}`,
      externalReference: course.id,
    }),
  });

  const payment = await paymentResponse.json();

  if (payment.errors) {
    throw new Error(payment.errors[0]?.description || "Erro ao criar cobrança");
  }

  if (billingType === "PIX") {
    // Get PIX QR code
    const pixResponse = await fetch(`${baseUrl}/payments/${payment.id}/pixQrCode`, {
      headers: { access_token: apiKey },
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

  return {
    success: true,
    redirectUrl: payment.invoiceUrl,
    paymentId: payment.id,
    status: "pending",
  };
}

// Mercado Pago Payment - Generate PIX directly
async function processMercadoPagoPayment(config: any, course: any, customer: any, amount: number, method: string) {
  // Create PIX payment directly
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret_key}`,
      "X-Idempotency-Key": `${course.id}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: amount,
      payment_method_id: "pix",
      payer: {
        email: customer.email,
        first_name: customer.name.split(" ")[0],
        last_name: customer.name.split(" ").slice(1).join(" ") || customer.name,
      },
      description: `Curso: ${course.title}`,
      external_reference: course.id,
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

// PushinPay Payment (PIX)
async function processPushinPayPayment(config: any, course: any, customer: any, amount: number) {
  const response = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret_key}`,
    },
    body: JSON.stringify({
      value: Math.round(amount * 100), // Amount in cents
      external_reference: course.id,
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
