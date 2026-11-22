// NAFAS | نَفَس — Supabase Edge Function: process-notifications
// Reliable Server-Side Transactional Email Worker via Resend API
// Owns RESEND_API_KEY and NAFAS_ALERT_EMAIL privately on server; processes durable notification_outbox

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
    const alertRecipient = Deno.env.get('NAFAS_ALERT_EMAIL') || Deno.env.get('FOUNDER_EMAIL') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 1. Fetch pending notification events from durable outbox
    const { data: pendingItems, error: fetchError } = await adminClient
      .from('notification_outbox')
      .select('*')
      .in('delivery_status', ['pending', 'retry_scheduled'])
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Database fetch error: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notification items in outbox.', processedCount: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. If Resend is not configured, record truthful unconfigured state
    if (!resendApiKey || !alertRecipient) {
      const ids = pendingItems.map(i => i.id);
      await adminClient
        .from('notification_outbox')
        .update({
          delivery_status: 'unconfigured',
          error_message: 'RESEND_API_KEY or NAFAS_ALERT_EMAIL is not configured on the server environment.',
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      return new Response(
        JSON.stringify({
          status: 'BLOCKED_BY_EXTERNAL_CONFIGURATION',
          message: 'Notification processing halted: RESEND_API_KEY or NAFAS_ALERT_EMAIL missing in environment secrets.',
          affectedCount: pendingItems.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Process each notification with idempotency and retry handling
    const results = [];
    for (const item of pendingItems) {
      const payload = item.payload || {};
      const trackingNumber = payload.trackingNumber || 'NFS-UNKNOWN';
      const category = payload.category || 'مخالفة بيئية';
      const governorate = payload.governorateId || 'العراق';
      const neighborhood = payload.neighborhood || 'ميداني';
      const isHazardous = Boolean(payload.isHazardous);
      const isUrgent = isHazardous || payload.severity === 'critical';

      const subject = isUrgent
        ? `🚨 [NAFAS ALERT] إنذار بيئي عاجل — بلاغ رقم ${trackingNumber} (${governorate})`
        : `[NAFAS] إشعار استلام بلاغ بيئي جديد — رقم ${trackingNumber}`;

      const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"/></head>
<body style="font-family: Arial, sans-serif; background-color: #F7F1E7; padding: 20px; color: #222238;">
  <div style="max-w: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 24px; border: 1px solid #E5DCCD;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #62467D; margin: 0;">نَفَس | NAFAS — مركز الرقابة البيئية</h2>
      <p style="color: #8C7E72; font-size: 13px;">منظومة حماية البيئة المجتمعية في العراق</p>
    </div>
    <div style="background: ${isUrgent ? '#FEE2E2' : '#F3F4F6'}; border: 1px solid ${isUrgent ? '#FCA5A5' : '#E5E7EB'}; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
      <h3 style="color: ${isUrgent ? '#991B1B' : '#1F2937'}; margin-top: 0;">تفاصيل الإشعار الرسمي</h3>
      <p><strong>رقم التتبع الميداني:</strong> <span style="font-family: monospace; font-size: 16px; color: #62467D;">${trackingNumber}</span></p>
      <p><strong>نوع المخالفة:</strong> ${category}</p>
      <p><strong>المحافظة / الحي:</strong> ${governorate} — ${neighborhood}</p>
      <p><strong>مستوى الخطورة:</strong> ${payload.severity || 'متوسط'}</p>
      <p><strong>المصدر:</strong> نظام البلاغات المركزي (PostgreSQL / Supabase)</p>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://mahamadfared1029-spec.github.io/nafas-iraq/#admin" style="background: #62467D; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
        فتح مركز قيادة المشرف العام للمراجعة
      </a>
    </div>
    <p style="font-size: 11px; color: #9CA3AF; text-align: center; margin-top: 24px;">
      هذه الرسالة مُرسلة آلياً عبر خادم نَفَس المؤمن بتشفير TLS ومسجلة في جدول notification_outbox.
    </p>
  </div>
</body>
</html>`;

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': item.event_id
          },
          body: JSON.stringify({
            from: 'NAFAS Iraq <alerts@nafas-iraq.org>',
            to: [alertRecipient],
            subject: subject,
            html: emailHtml
          })
        });

        const resData = await resendResponse.json();

        if (resendResponse.ok) {
          await adminClient
            .from('notification_outbox')
            .update({
              delivery_status: 'sent',
              external_message_id: resData.id || `msg_${Date.now()}`,
              last_attempt_at: new Date().toISOString(),
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          results.push({ id: item.id, status: 'sent', messageId: resData.id });
        } else {
          const nextAttempt = (item.attempt_count || 0) + 1;
          const nextStatus = nextAttempt >= 3 ? 'failed' : 'retry_scheduled';

          await adminClient
            .from('notification_outbox')
            .update({
              delivery_status: nextStatus,
              attempt_count: nextAttempt,
              last_attempt_at: new Date().toISOString(),
              error_message: `Resend API Error: ${resData.message || JSON.stringify(resData)}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);

          results.push({ id: item.id, status: nextStatus, error: resData.message });
        }
      } catch (sendErr: any) {
        const nextAttempt = (item.attempt_count || 0) + 1;
        const nextStatus = nextAttempt >= 3 ? 'failed' : 'retry_scheduled';

        await adminClient
          .from('notification_outbox')
          .update({
            delivery_status: nextStatus,
            attempt_count: nextAttempt,
            last_attempt_at: new Date().toISOString(),
            error_message: sendErr?.message || 'Network fetch error during Resend dispatch',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: nextStatus, error: sendErr?.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processedCount: results.length, details: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
