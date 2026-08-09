import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing auth token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const jwt = authHeader.replace("Bearer ", "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client with user's JWT for RPC calls
  const userClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  // Verify caller is authenticated
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get caller's profile to find company_id
  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return new Response(
      JSON.stringify({ error: "You must belong to a company to invite users" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify caller is company admin via RPC
  const { data: isAdmin, error: adminCheckError } = await userClient.rpc(
    "is_company_admin",
    { p_company_id: profile.company_id }
  );

  if (adminCheckError || !isAdmin) {
    return new Response(
      JSON.stringify({ error: "Only Company Admins can invite users" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  const { full_name, email, role_code, is_active } = await req.json();
  if (!full_name || !email || !role_code) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: full_name, email, role_code" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Prevent assigning company_admin via invite
  if (role_code === "company_admin") {
    return new Response(
      JSON.stringify({ error: "Cannot assign Company Admin role through invite" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Admin client to create auth user
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Invite user by email — creates auth user and sends invitation email
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { full_name } }
  );

  if (inviteError) {
    return new Response(
      JSON.stringify({ error: inviteError.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!inviteData?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Failed to create user" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Call invite_company_user RPC to set up profile and role
  const { error: rpcError } = await userClient.rpc("invite_company_user", {
    p_user_id: inviteData.user.id,
    p_company_id: profile.company_id,
    p_full_name: full_name,
    p_email: email,
    p_role_code: role_code,
    p_is_active: is_active ?? true,
  });

  if (rpcError) {
    // Best-effort cleanup: delete the auth user if RPC fails
    await adminClient.auth.admin.deleteUser(inviteData.user.id);
    return new Response(
      JSON.stringify({ error: rpcError.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, user_id: inviteData.user.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
