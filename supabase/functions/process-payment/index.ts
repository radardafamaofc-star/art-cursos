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

    const { courseId, gateway, paymentMethod, amount } = await req.json();

    if (!courseId || !gateway || !amount) {
      throw new Error("Dados incompletos");
    }

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
      case "stripe":
        paymentResult = await processStripePayment(paymentConfig, course, userData.user, amount);
        break;
      case "asaas":
        paymentResult = await processAsaasPayment(paymentConfig, course, userData.user, amount, paymentMethod);
        break;
      case "mercadopago":
        paymentResult = await processMercadoPagoPayment(paymentConfig, course, userData.user, amount, paymentMethod);
        break;
      case "pushinpay":
        paymentResult = await processPushinPayPayment(paymentConfig, course, userData.user, amount);
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

// Stripe Payment
async function processStripePayment(config: any, course: any, user: any, amount: number) {
  const stripe = await import("https://esm.sh/stripe@14.0.0");
  const stripeClient = new stripe.default(config.secret_key);

  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: course.title,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=success`,
    cancel_url: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=cancelled`,
    customer_email: user.email,
    metadata: {
      course_id: course.id,
      user_id: user.id,
    },
  });

  return {
    success: true,
    redirectUrl: session.url,
    paymentId: session.id,
    status: "pending",
  };
}

// Asaas Payment
async function processAsaasPayment(config: any, course: any, user: any, amount: number, method: string) {
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
      name: user.user_metadata?.full_name || user.email,
      email: user.email,
    }),
  });

  const customer = await customerResponse.json();
  const customerId = customer.id || customer.errors ? null : customer.id;

  if (!customerId && customer.errors) {
    // Customer might already exist, try to find
    const searchResponse = await fetch(`${baseUrl}/customers?email=${user.email}`, {
      headers: { access_token: config.secret_key },
    });
    const searchResult = await searchResponse.json();
    if (searchResult.data && searchResult.data.length > 0) {
      const existingCustomerId = searchResult.data[0].id;
      return await createAsaasPayment(baseUrl, config.secret_key, existingCustomerId, course, amount, method);
    }
    throw new Error("Erro ao criar cliente");
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

// Mercado Pago Payment
async function processMercadoPagoPayment(config: any, course: any, user: any, amount: number, method: string) {
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret_key}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: course.title,
          quantity: 1,
          unit_price: amount,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: user.email,
      },
      external_reference: course.id,
      back_urls: {
        success: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=success`,
        failure: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=failed`,
        pending: `${Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/course/${course.id}?payment=pending`,
      },
      auto_return: "approved",
    }),
  });

  const preference = await response.json();

  if (preference.error) {
    throw new Error(preference.message || "Erro ao criar preferência");
  }

  return {
    success: true,
    redirectUrl: preference.init_point,
    paymentId: preference.id,
    status: "pending",
  };
}

// PushinPay Payment (PIX)
async function processPushinPayPayment(config: any, course: any, user: any, amount: number) {
  const response = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.secret_key}`,
    },
    body: JSON.stringify({
      value: Math.round(amount * 100), // Amount in cents
      webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      external_reference: course.id,
    }),
  });

  const result = await response.json();

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
