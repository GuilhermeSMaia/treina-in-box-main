import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Service role client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller's roles
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const callerRoleSet = new Set(
      (callerRoles ?? []).map((r: { role: string }) => r.role)
    );
    const isOwner = callerRoleSet.has("owner");
    const isAdmin = callerRoleSet.has("admin");

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { target_user_id, role, action } = await req.json();

    if (!target_user_id || !role || !action) {
      return new Response(
        JSON.stringify({ error: "Missing target_user_id, role, or action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Permission checks
    const allowedRoles = isOwner
      ? ["admin", "mentor", "student"]
      : ["mentor", "student"]; // admin can only manage mentor/student

    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `You cannot manage the role: ${role}` }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prevent self-demotion
    if (target_user_id === callerId) {
      return new Response(
        JSON.stringify({ error: "Cannot modify your own role" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "assign") {
      // Remove existing role first, then assign new one
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", target_user_id)
        .neq("role", "owner"); // never remove owner role

      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: target_user_id, role });

      if (error) throw error;
    } else if (action === "remove") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", target_user_id)
        .eq("role", role);

      if (error) throw error;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'assign' or 'remove'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
