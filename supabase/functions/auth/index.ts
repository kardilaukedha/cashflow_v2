import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import * as bcrypt from "npm:bcryptjs@2.4.3";
import { SignJWT, jwtVerify } from "npm:jose@5.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET_STR =
  Deno.env.get("SESSION_SECRET") || "cashflow_secret_key_2024_supabase";

const jwtSecret = new TextEncoder().encode(JWT_SECRET_STR);

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function createToken(payload: Record<string, unknown>): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(jwtSecret);
}

async function verifyToken(
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/auth\/?/, "/");
    const supabase = getSupabaseAdmin();

    if (path === "/login" && req.method === "POST") {
      const { email, password } = await req.json();
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .limit(1);
      if (error || !users?.length) {
        return jsonResponse({
          data: null,
          error: { message: "Invalid login credentials" },
        });
      }
      const user = users[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return jsonResponse({
          data: null,
          error: { message: "Invalid login credentials" },
        });
      }

      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1);
      const role = profiles?.[0]?.role || "karyawan";

      const tokenPayload = { id: user.id, email: user.email, role };
      const token = await createToken(tokenPayload);

      await supabase
        .from("login_history")
        .insert({
          user_id: user.id,
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          status: "success",
        })
        .then(() => {});

      return jsonResponse({
        data: {
          session: { access_token: token, user: tokenPayload },
        },
        error: null,
      });
    }

    if (path === "/me" && req.method === "GET") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.split(" ")[1];
      if (!token) {
        return jsonResponse(
          { data: null, error: { message: "Unauthorized" } },
          401
        );
      }
      const payload = await verifyToken(token);
      if (!payload) {
        return jsonResponse(
          { data: null, error: { message: "Invalid token" } },
          401
        );
      }
      return jsonResponse({ data: { user: payload }, error: null });
    }

    if (path === "/register" && req.method === "POST") {
      const { email, password } = await req.json();
      const hash = await bcrypt.hash(password, 10);
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({ email, password_hash: hash })
        .select("id, email")
        .single();
      if (error) {
        if (error.code === "23505") {
          return jsonResponse({
            data: null,
            error: { message: "Email already registered" },
          });
        }
        return jsonResponse({ data: null, error: { message: error.message } }, 500);
      }
      await supabase.from("user_profiles").insert({
        user_id: newUser.id,
        role: "karyawan",
        full_name: "",
        email,
      });
      const token = await createToken({
        id: newUser.id,
        email: newUser.email,
      });
      return jsonResponse({
        data: {
          session: {
            access_token: token,
            user: { id: newUser.id, email: newUser.email },
          },
        },
        error: null,
      });
    }

    if (path === "/create-user" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.split(" ")[1];
      if (!token) {
        return jsonResponse(
          { data: null, error: { message: "Unauthorized" } },
          401
        );
      }
      const caller = await verifyToken(token);
      if (!caller || caller.role !== "superadmin") {
        return jsonResponse(
          { data: null, error: { message: "Akses ditolak." } },
          403
        );
      }

      const body = await req.json();
      const {
        email,
        password,
        full_name = "",
        role = "karyawan",
        phone = "",
        department = "",
        job_title = "",
        hire_date = null,
        nik = "",
        gender = "",
        date_of_birth = null,
        address = "",
        status = "active",
      } = body;

      if (!email || !password) {
        return jsonResponse(
          {
            data: null,
            error: { message: "Email dan password wajib diisi." },
          },
          400
        );
      }

      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .limit(1);
      if (existing?.length) {
        return jsonResponse({
          data: null,
          error: { message: "Email sudah terdaftar." },
        });
      }

      const hash = await bcrypt.hash(password, 10);
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({ email, password_hash: hash })
        .select("id, email")
        .single();
      if (error) {
        return jsonResponse({ data: null, error: { message: error.message } }, 500);
      }

      await supabase.from("user_profiles").insert({
        user_id: newUser.id,
        role,
        full_name,
        email,
        phone,
        department,
        job_title,
        hire_date: hire_date || null,
        nik,
        gender,
        date_of_birth: date_of_birth || null,
        address,
        status,
      });

      return jsonResponse({
        data: { id: newUser.id, email: newUser.email },
        error: null,
      });
    }

    if (path.startsWith("/delete-user/") && req.method === "DELETE") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.split(" ")[1];
      if (!token) {
        return jsonResponse(
          { data: null, error: { message: "Unauthorized" } },
          401
        );
      }
      const caller = await verifyToken(token);
      if (!caller || caller.role !== "superadmin") {
        return jsonResponse(
          { data: null, error: { message: "Akses ditolak." } },
          403
        );
      }

      const userId = path.split("/delete-user/")[1];
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", userId)
        .limit(1);
      if (profile?.[0]?.email === "admin@admin.com") {
        return jsonResponse({
          data: null,
          error: { message: "Tidak bisa menghapus akun superadmin utama." },
        });
      }

      await supabase.from("user_profiles").delete().eq("user_id", userId);
      await supabase.from("users").delete().eq("id", userId);
      return jsonResponse({ data: null, error: null });
    }

    if (path === "/update-password" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.split(" ")[1];
      if (!token) {
        return jsonResponse(
          { data: null, error: { message: "Unauthorized" } },
          401
        );
      }
      const caller = await verifyToken(token);
      if (!caller) {
        return jsonResponse(
          { data: null, error: { message: "Invalid token" } },
          401
        );
      }

      const { password } = await req.json();
      const hash = await bcrypt.hash(password, 10);
      await supabase
        .from("users")
        .update({ password_hash: hash })
        .eq("id", caller.id);
      return jsonResponse({ data: { user: caller }, error: null });
    }

    if (path === "/logout" && req.method === "POST") {
      return jsonResponse({ data: null, error: null });
    }

    return jsonResponse(
      { data: null, error: { message: "Not found" } },
      404
    );
  } catch (err) {
    return jsonResponse(
      { data: null, error: { message: (err as Error).message } },
      500
    );
  }
});
