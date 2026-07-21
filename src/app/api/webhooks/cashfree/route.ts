import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
  );
}

const PLANS = {
  trial: { price: 20, cards: 10, name: 'Trial Pack' },
  starter: { price: 320, cards: 400, name: 'Starter' },
  pro: { price: 640, cards: 800, name: 'Pro' },
  business: { price: 1120, cards: 1400, name: 'Business' }
};

export async function POST(request: NextRequest) {
  const supabase = getAdminSupabase();
  try {
    const payloadString = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    const secretKey = process.env.CASHFREE_SECRET_KEY || '';

    if (signature && timestamp && secretKey) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', secretKey)
          .update(timestamp + payloadString)
          .digest('base64');

        if (signature !== expectedSignature) {
          logger.warn('Cashfree signature mismatch', { signature, expectedSignature });
        }
      } catch (err) {
        logger.error('Signature verification error', err);
      }
    }

    const payload = JSON.parse(payloadString);
    logger.info('Cashfree Webhook received', { type: payload.type, orderId: payload.data?.order?.order_id });

    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = payload.data.order.order_id;

      // 1. Fetch pending payment
      const { data: paymentInfo, error: payError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('transaction_id', orderId)
        .eq('status', 'PENDING')
        .single();

      if (!paymentInfo || payError) {
        return NextResponse.json({ message: 'Order already processed or not found' });
      }

      const planName = paymentInfo.plan;
      let planDetails = Object.values(PLANS).find(
        p => p.name.toLowerCase() === planName?.toLowerCase()
      );

      if (!planDetails) {
        return NextResponse.json({ error: 'Invalid plan associated with order' }, { status: 400 });
      }

      // 2. Update User Profile
      const { data: currentUser } = await supabase
        .from('users')
        .select('remaining_cards')
        .eq('id', paymentInfo.user_id)
        .single();

      const currentBalance = currentUser?.remaining_cards || 0;

      const updateData: any = {
        plan: planDetails.name,
        remaining_cards: currentBalance + planDetails.cards,
        plan_expiry: null
      };

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', paymentInfo.user_id);

      // 3. Update Payment History
      await supabase.from('payment_history')
        .update({ status: 'SUCCESS' })
        .eq('transaction_id', orderId);

      logger.info('Successfully processed Cashfree webhook', { orderId, plan: planName, userId: paymentInfo.user_id });
      return NextResponse.json({ success: true });
    }

    logger.warn('Unhandled webhook event type', { type: payload.type });
    return NextResponse.json({ message: 'Unhandled webhook event type' });
  } catch (error: any) {
    logger.error('Cashfree Webhook Internal Error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
