'use server'

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const PLANS = {
  trial: { price: 20, cards: 10, name: 'Trial Pack' },
  starter: { price: 360, cards: 400, name: 'Starter Pack' },
  pro: { price: 720, cards: 800, name: 'Pro Pack' },
  business: { price: 1260, cards: 1400, name: 'Business Pack' }
};

function getCashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID || '';
  const secretKey = process.env.CASHFREE_SECRET_KEY || '';
  const isProduction = process.env.CASHFREE_ENV === 'PRODUCTION';
  const baseUrl = isProduction ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  return { appId, secretKey, isProduction, baseUrl };
}

export async function createPaymentSession(planId: keyof typeof PLANS) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const plan = PLANS[planId];
  if (!plan) throw new Error("Invalid Plan");

  if (planId === 'trial') {
    const { data: userData } = await supabase
      .from('users')
      .select('trial_used')
      .eq('id', user.id)
      .single();
    if (userData?.trial_used) {
      throw new Error("You have already used the Trial Pack. Only one trial per user is allowed.");
    }
  }

  const { appId, secretKey, isProduction, baseUrl } = getCashfreeConfig();

  if (!appId || !secretKey) {
    throw new Error("Cashfree API keys are missing in environment variables.");
  }

  const orderId = `order_${user.id}_${Date.now()}`;
  const cleanPhone = (user.user_metadata?.mobile || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';

  const { headers } = await import('next/headers');
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
  const cleanBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;

  const requestPayload = {
    order_amount: plan.price,
    order_currency: "INR",
    order_id: orderId,
    customer_details: {
      customer_id: user.id,
      customer_name: user.user_metadata?.name || 'Customer',
      customer_email: user.email || 'customer@example.com',
      customer_phone: cleanPhone
    },
    order_meta: {
      return_url: `${cleanBaseUrl}/dashboard/subscription/verify?order_id=${orderId}&plan=${planId}`,
      notify_url: `${cleanBaseUrl}/api/webhooks/cashfree`
    }
  };

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Cashfree PG Error response:", data);
      throw new Error(data.message || data.error || `Cashfree Error (${response.status})`);
    }

    if (data.payment_session_id) {
      // Record pending payment in Supabase
      await supabase.from('payment_history').insert({
        user_id: user.id,
        amount: plan.price,
        plan: plan.name,
        status: 'PENDING',
        transaction_id: orderId
      });

      return { 
        sessionId: data.payment_session_id,
        isProduction
      };
    }

    throw new Error("Failed to generate Cashfree payment session.");
  } catch (error: any) {
    console.error("Cashfree Order Exception:", error.message);
    throw new Error(error.message || "Payment Gateway Error");
  }
}

export async function verifyPaymentSession(orderId: string, planId: keyof typeof PLANS) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  try {
    // Check if already processed to avoid overwriting spent credits
    const { data: paymentInfo } = await supabase
      .from('payment_history')
      .select('status')
      .eq('transaction_id', orderId)
      .single();

    if (paymentInfo?.status === 'SUCCESS') {
      return { success: true };
    }

    const { appId, secretKey, baseUrl } = getCashfreeConfig();

    const response = await fetch(`${baseUrl}/orders/${orderId}/payments`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      }
    });

    const payments = await response.json();
    const isSuccess = Array.isArray(payments) && payments.some((p: any) => p.payment_status === 'SUCCESS');

    if (isSuccess) {
      const plan = PLANS[planId];

      const { data: currentUser } = await supabase
        .from('users')
        .select('remaining_cards')
        .eq('id', user.id)
        .single();

      const currentBalance = currentUser?.remaining_cards || 0;

      const updateData: any = {
        plan: plan.name,
        remaining_cards: currentBalance + plan.cards,
        plan_expiry: null
      };

      // Update User Plan
      await supabase.from('users').update(updateData).eq('id', user.id);

      // Update Payment History
      await supabase.from('payment_history')
        .update({ status: 'SUCCESS' })
        .eq('transaction_id', orderId);

      return { success: true };
    } else {
      await supabase.from('payment_history')
        .update({ status: 'FAILED' })
        .eq('transaction_id', orderId);
        
      return { success: false, message: 'Payment not successful or pending' };
    }
  } catch (error: any) {
    console.error("Cashfree Verify Error:", error);
    return { success: false, message: 'Verification Error' };
  }
}
