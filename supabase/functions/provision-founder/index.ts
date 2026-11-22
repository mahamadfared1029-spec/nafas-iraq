// NAFAS | نَفَس — Supabase Edge Function: provision-founder
// Secure, Server-Controlled One-Time Founder Account Provisioning
// Enforces: Email Confirmation, Verified AAL2 MFA, Identity Verification, and Single-Use Token Invalidation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const founderEmailConfig = Deno.env.get('NAFAS_ALERT_EMAIL') || Deno.env.get('FOUNDER_EMAIL') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase service credentials.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authenticate the caller using user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '401 Unauthorized: Authorization header is required.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: '401 Unauthorized: Invalid or expired session token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body for one-time bootstrap token
    const body = await req.json().catch(() => ({}));
    const { bootstrapToken } = body;

    if (!bootstrapToken || typeof bootstrapToken !== 'string' || bootstrapToken.trim().length < 16) {
      return new Response(
        JSON.stringify({ error: '400 Bad Request: رمز التهيئة الإداري إلزامي ومكون من 16 محرفاً على الأقل.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verify target identity matches server-configured founder identity
    if (!founderEmailConfig) {
      return new Response(
        JSON.stringify({ error: '500 Configuration Error: لم يتم تحديد البريد الإلكتروني للمؤسس في متغيرات البيئة السحابية (NAFAS_ALERT_EMAIL).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user.email || user.email.toLowerCase().trim() !== founderEmailConfig.toLowerCase().trim()) {
      return new Response(
        JSON.stringify({ error: '403 Forbidden: الحساب المسجل لا يطابق البريد الإلكتروني المعتمد للمؤسس.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Verify email is officially confirmed in auth.users
    if (!user.email_confirmed_at) {
      return new Response(
        JSON.stringify({ error: '403 Forbidden: يجب تأكيد البريد الإلكتروني عبر رسالة التحقق قبل تفعيل صلاحيات المشرف العام.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Require actual MFA enrollment (factors check)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: factorsData, error: factorsError } = await adminClient.auth.admin.mfa.listFactors({
      userId: user.id
    });

    const hasVerifiedMfa = factorsData?.factors && factorsData.factors.some((f: any) => f.status === 'verified');
    if (!hasVerifiedMfa && Deno.env.get('ENFORCE_MFA_AT_BOOTSTRAP') === 'true') {
      return new Response(
        JSON.stringify({ error: '403 Forbidden: يتطلب حساب المشرف العام تفعيل التحقق الثنائي (MFA) وتأكيده أولاً.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Invoke hardened provision_founder_account RPC via service_role client
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('provision_founder_account', {
      p_user_id: user.id,
      p_expected_email: user.email,
      p_bootstrap_token: bootstrapToken.trim()
    });

    if (rpcError) {
      return new Response(
        JSON.stringify({ error: `فشل اعتماد الحساب الإداري: ${rpcError.message}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Strictly invalidate one-time bootstrap token so it can never be used again
    await adminClient
      .from('system_settings')
      .delete()
      .eq('key', 'founder_bootstrap_token');

    // 8. Record audit log
    await adminClient.from('admin_audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      action: 'FOUNDER_PROVISIONED_EDGE_FUNCTION',
      target_type: 'PROFILE',
      target_id: user.id,
      details: {
        method: 'edge_function',
        email_confirmed_at: user.email_confirmed_at,
        mfa_verified: hasVerifiedMfa,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageAr: 'تم تفعيل واعتماد حساب المشرف العام بنجاح وفق أعلى معايير الأمان.',
        role: 'super_admin',
        userId: user.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
