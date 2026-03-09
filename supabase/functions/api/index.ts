import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { jwtVerify } from "npm:jose@5.2.0";

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

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

function getUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return null;
  return verifyToken(token);
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function csvResponse(content: string, filename: string) {
  return new Response("\uFEFF" + content, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

const ADMIN_ROLES = ["superadmin", "admin_sariroti", "admin_keuangan"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const user = await getUser(req);
    if (!user) {
      return jsonResponse(
        { data: null, error: { message: "Unauthorized" } },
        401
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/?/, "/");
    const supabase = getSupabase();
    const isAdmin = ADMIN_ROLES.includes(user.role as string);

    if (path === "/laporan-karyawan" && req.method === "GET") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const userProfileId = url.searchParams.get("user_profile_id");

      let query = supabase.rpc("get_laporan_karyawan_v2", {
        p_user_id: isAdmin ? null : (user.id as string),
        p_user_profile_id: isAdmin ? userProfileId : null,
        p_from: from,
        p_to: to,
      });

      const { data, error } = await query;
      if (error) {
        const result = await fallbackLaporanKaryawan(
          supabase,
          user,
          isAdmin,
          from,
          to,
          userProfileId
        );
        return jsonResponse(result);
      }
      return jsonResponse({ data, error: null });
    }

    if (path === "/laporan-karyawan/export" && req.method === "GET") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const userProfileId = url.searchParams.get("user_profile_id");

      const result = await fallbackLaporanExport(
        supabase,
        user,
        isAdmin,
        from,
        to,
        userProfileId
      );
      return csvResponse(
        result,
        `laporan-kunjungan-${from || "all"}-${to || "all"}.csv`
      );
    }

    if (path === "/performa-karyawan" && req.method === "GET") {
      if (!isAdmin) {
        return jsonResponse(
          { data: null, error: { message: "Akses ditolak." } },
          403
        );
      }
      const bulan =
        parseInt(url.searchParams.get("bulan") || "") ||
        new Date().getMonth() + 1;
      const tahun =
        parseInt(url.searchParams.get("tahun") || "") ||
        new Date().getFullYear();

      const result = await getPerformaKaryawan(supabase, bulan, tahun);
      return jsonResponse(result);
    }

    if (path === "/visit-summary" && req.method === "GET") {
      if (!isAdmin) {
        return jsonResponse(
          { data: null, error: { message: "Akses ditolak." } },
          403
        );
      }
      const date = url.searchParams.get("date");
      const result = await getVisitSummary(supabase, date);
      return jsonResponse(result);
    }

    if (path.startsWith("/visit-detail/") && req.method === "GET") {
      const planId = path.split("/visit-detail/")[1];
      const result = await getVisitDetail(supabase, planId);
      return jsonResponse(result);
    }

    if (path === "/notifikasi-deadline" && req.method === "GET") {
      const today = new Date().toISOString().split("T")[0];
      const result = await getNotifikasiDeadline(
        supabase,
        user,
        isAdmin,
        today
      );
      return jsonResponse(result);
    }

    if (path.startsWith("/store-visit-history/") && req.method === "GET") {
      if (!isAdmin) {
        return jsonResponse(
          { data: null, error: { message: "Akses ditolak." } },
          403
        );
      }
      const storeId = path.split("/store-visit-history/")[1];
      const result = await getStoreVisitHistory(supabase, storeId);
      return jsonResponse(result);
    }

    if (path === "/checkin" && req.method === "POST") {
      const body = await req.json();
      const result = await handleCheckin(supabase, user, body);
      return jsonResponse(result, result.error ? 400 : 200);
    }

    if (path.startsWith("/checkout/") && req.method === "POST") {
      const checkinId = path.split("/checkout/")[1];
      const result = await handleCheckout(supabase, user, checkinId);
      return jsonResponse(result, result.error ? 400 : 200);
    }

    if (path === "/stores" && req.method === "GET") {
      const result = await getStores(supabase, user, isAdmin);
      return jsonResponse(result);
    }

    if (path.match(/^\/stores\/\d+$/) && req.method === "PUT") {
      const storeId = path.split("/stores/")[1];
      const body = await req.json();
      const result = await updateStore(supabase, storeId, body);
      return jsonResponse(result);
    }

    if (path.match(/^\/stores\/\d+\/transfer$/) && req.method === "PUT") {
      const storeId = path.split("/stores/")[1].split("/transfer")[0];
      const body = await req.json();
      const result = await transferStore(supabase, storeId, body.new_user_profile_id);
      return jsonResponse(result);
    }

    if (path.match(/^\/stores\/\d+$/) && req.method === "DELETE") {
      const storeId = path.split("/stores/")[1];
      const { error } = await supabase.from("stores").delete().eq("id", parseInt(storeId));
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data: { success: true }, error: null });
    }

    if (path === "/stores" && req.method === "POST") {
      const body = await req.json();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id as string)
        .limit(1);
      const insertData = {
        user_profile_id: profile?.[0]?.id,
        nama_toko: body.nama_toko,
        nama_pemilik: body.nama_pemilik,
        alamat: body.alamat || "",
        nomor_hp: body.nomor_hp || "",
        sharelok: body.sharelok || "",
        foto_toko: body.foto_toko || "",
        status: "active",
      };
      const { data, error } = await supabase.from("stores").insert(insertData).select().single();
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data, error: null });
    }

    if (path === "/sku-items" && req.method === "GET") {
      const activeOnly = url.searchParams.get("active_only");
      let query = supabase.from("sku_items").select("*").order("kategori").order("nama");
      if (activeOnly === "true") query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data, error: null });
    }

    if (path === "/sku-items" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("sku_items")
        .insert({ kode: body.kode, nama: body.nama, kategori: body.kategori, cbp: body.cbp || 0, is_active: true })
        .select().single();
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data, error: null });
    }

    if (path.match(/^\/sku-items\/\d+$/) && req.method === "PUT") {
      const itemId = path.split("/sku-items/")[1];
      const body = await req.json();
      const { data, error } = await supabase.from("sku_items").update(body).eq("id", parseInt(itemId)).select().single();
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data, error: null });
    }

    if (path.match(/^\/sku-items\/\d+$/) && req.method === "DELETE") {
      const itemId = path.split("/sku-items/")[1];
      const { error } = await supabase.from("sku_items").delete().eq("id", parseInt(itemId));
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data: { success: true }, error: null });
    }

    if (path.match(/^\/sariroti-settings\//) && req.method === "GET") {
      const userProfileId = path.split("/sariroti-settings/")[1];
      const { data } = await supabase.from("sariroti_settings").select("*").eq("user_profile_id", userProfileId).limit(1);
      return jsonResponse({ data: data?.[0] || null, error: null });
    }

    if (path.match(/^\/sariroti-settings\//) && req.method === "PUT") {
      const userProfileId = path.split("/sariroti-settings/")[1];
      const body = await req.json();
      const { data: existing } = await supabase.from("sariroti_settings").select("id").eq("user_profile_id", userProfileId).limit(1);
      if (existing && existing.length > 0) {
        await supabase.from("sariroti_settings").update({
          min_visits: body.min_visits,
          max_visits: body.max_visits,
          plan_deadline: body.plan_deadline,
        }).eq("user_profile_id", userProfileId);
      } else {
        await supabase.from("sariroti_settings").insert({
          user_profile_id: userProfileId,
          min_visits: body.min_visits,
          max_visits: body.max_visits,
          plan_deadline: body.plan_deadline,
        });
      }
      return jsonResponse({ data: { success: true }, error: null });
    }

    if (path === "/user_profiles" && req.method === "GET") {
      const filter = url.searchParams.get("filter");
      const selectCols = url.searchParams.get("select") || "*";
      let query = supabase.from("user_profiles").select(selectCols);
      if (filter) {
        const [key, val] = filter.split(":");
        if (key && val) query = query.eq(key, val);
      }
      query = query.order("full_name");
      const { data, error } = await query;
      if (error) return jsonResponse({ data: null, error: { message: error.message } });
      return jsonResponse({ data, error: null });
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

async function fallbackLaporanKaryawan(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  isAdmin: boolean,
  from: string | null,
  to: string | null,
  userProfileId: string | null
) {
  let query = supabase
    .from("visit_plans")
    .select(
      "id, plan_date, status, stores, user_id, submitted_at"
    );

  if (!isAdmin) {
    query = query.eq("user_id", user.id as string);
  }
  if (from) query = query.gte("plan_date", from);
  if (to) query = query.lte("plan_date", to);
  query = query.order("plan_date", { ascending: false });

  const { data: plans, error } = await query;
  if (error) return { data: null, error: { message: error.message } };

  const results = [];
  for (const plan of plans || []) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .eq("user_id", plan.user_id)
      .limit(1);

    if (userProfileId && profile?.[0]?.id !== userProfileId) continue;

    const { data: checkins } = await supabase
      .from("visit_checkins")
      .select("id, total_billing, duration_minutes")
      .eq("visit_plan_id", plan.id);

    const totalCheckins = checkins?.length || 0;
    const totalBilling = checkins?.reduce(
      (sum: number, c: { total_billing: number }) =>
        sum + (c.total_billing || 0),
      0
    ) || 0;
    const avgDuration = totalCheckins > 0
      ? Math.round(
          (checkins?.reduce(
            (sum: number, c: { duration_minutes: number }) =>
              sum + (c.duration_minutes || 0),
            0
          ) || 0) / totalCheckins
        )
      : 0;

    const plannedStores = Array.isArray(plan.stores)
      ? plan.stores.length
      : 0;

    results.push({
      plan_date: plan.plan_date,
      user_profile_id: profile?.[0]?.id,
      full_name: profile?.[0]?.full_name,
      email: profile?.[0]?.email,
      total_checkins: totalCheckins,
      total_billing: totalBilling,
      avg_duration_minutes: avgDuration,
      plan_status: plan.status,
      plan_id: plan.id,
      planned_stores: plannedStores,
      plan_completed: totalCheckins >= plannedStores && plannedStores > 0,
    });
  }

  return { data: results, error: null };
}

async function fallbackLaporanExport(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  isAdmin: boolean,
  from: string | null,
  to: string | null,
  userProfileId: string | null
) {
  let query = supabase
    .from("visit_plans")
    .select("id, plan_date, user_id");

  if (!isAdmin) query = query.eq("user_id", user.id as string);
  if (from) query = query.gte("plan_date", from);
  if (to) query = query.lte("plan_date", to);
  query = query.order("plan_date", { ascending: false });

  const { data: plans } = await query;

  const header = [
    "Tanggal",
    "Nama Karyawan",
    "Email",
    "Nama Toko",
    "Alamat Toko",
    "Jenis Kunjungan",
    "Total Tagihan",
    "Waktu Checkin",
    "Waktu Checkout",
    "Durasi (menit)",
    "Ada Roti Tarik",
    "GPS Lat",
    "GPS Lng",
    "Akurasi GPS (m)",
    "Catatan",
  ];
  const escape = (v: unknown) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(",")];

  for (const plan of plans || []) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .eq("user_id", plan.user_id)
      .limit(1);

    if (userProfileId && profile?.[0]?.id !== userProfileId) continue;

    const { data: checkins } = await supabase
      .from("visit_checkins")
      .select("*")
      .eq("visit_plan_id", plan.id)
      .order("checkin_time", { ascending: true });

    for (const vc of checkins || []) {
      const row = [
        plan.plan_date,
        profile?.[0]?.full_name || "",
        profile?.[0]?.email || "",
        vc.store_name || "",
        vc.store_address || "",
        vc.visit_type || "",
        vc.total_billing || 0,
        vc.checkin_time
          ? new Date(vc.checkin_time).toLocaleString("id-ID")
          : "",
        vc.checkout_time
          ? new Date(vc.checkout_time).toLocaleString("id-ID")
          : "",
        vc.duration_minutes || "",
        vc.has_expired_bread ? "Ya" : "Tidak",
        vc.gps_lat || "",
        vc.gps_lng || "",
        vc.gps_accuracy || "",
        vc.notes || "",
      ];
      lines.push(row.map(escape).join(","));
    }
  }

  return lines.join("\r\n");
}

async function getPerformaKaryawan(
  supabase: ReturnType<typeof createClient>,
  bulan: number,
  tahun: number
) {
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, full_name, email, user_id")
    .eq("role", "karyawan_sariroti");

  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const endMonth = bulan === 12 ? 1 : bulan + 1;
  const endYear = bulan === 12 ? tahun + 1 : tahun;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const results = [];
  for (const p of profiles || []) {
    const { data: plans } = await supabase
      .from("visit_plans")
      .select("id, status")
      .eq("user_id", p.user_id)
      .gte("plan_date", startDate)
      .lt("plan_date", endDate);

    const totalPlans = plans?.length || 0;
    const submittedPlans =
      plans?.filter(
        (pl: { status: string }) =>
          pl.status === "submitted" || pl.status === "approved"
      ).length || 0;

    const planIds = plans?.map((pl: { id: string }) => pl.id) || [];
    let totalCheckins = 0;
    let totalBilling = 0;
    let totalDuration = 0;

    if (planIds.length > 0) {
      const { data: checkins } = await supabase
        .from("visit_checkins")
        .select("id, total_billing, duration_minutes")
        .in("visit_plan_id", planIds);

      totalCheckins = checkins?.length || 0;
      totalBilling =
        checkins?.reduce(
          (s: number, c: { total_billing: number }) =>
            s + (c.total_billing || 0),
          0
        ) || 0;
      totalDuration =
        totalCheckins > 0
          ? Math.round(
              (checkins?.reduce(
                (s: number, c: { duration_minutes: number }) =>
                  s + (c.duration_minutes || 0),
                0
              ) || 0) / totalCheckins
            )
          : 0;
    }

    results.push({
      user_profile_id: p.id,
      full_name: p.full_name,
      email: p.email,
      total_plans: totalPlans,
      submitted_plans: submittedPlans,
      total_checkins: totalCheckins,
      total_billing: totalBilling,
      avg_duration_minutes: totalDuration,
      compliance_pct:
        totalPlans > 0
          ? Math.round((submittedPlans / totalPlans) * 100)
          : 0,
    });
  }

  results.sort(
    (a: { total_billing: number }, b: { total_billing: number }) =>
      b.total_billing - a.total_billing
  );
  return { data: results, error: null };
}

async function getVisitSummary(
  supabase: ReturnType<typeof createClient>,
  date: string | null
) {
  let query = supabase
    .from("visit_plans")
    .select("id, plan_date, status, submitted_at, stores, user_id");

  if (date) query = query.eq("plan_date", date);
  query = query.order("plan_date", { ascending: false });

  const { data: plans } = await query;

  const results = [];
  for (const plan of plans || []) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, full_name, email")
      .eq("user_id", plan.user_id)
      .limit(1);

    const { data: checkins } = await supabase
      .from("visit_checkins")
      .select("id, total_billing")
      .eq("visit_plan_id", plan.id);

    results.push({
      id: plan.id,
      plan_date: plan.plan_date,
      status: plan.status,
      submitted_at: plan.submitted_at,
      stores: plan.stores,
      full_name: profile?.[0]?.full_name,
      email: profile?.[0]?.email,
      user_profile_id: profile?.[0]?.id,
      checkin_count: checkins?.length || 0,
      total_billing:
        checkins?.reduce(
          (s: number, c: { total_billing: number }) =>
            s + (c.total_billing || 0),
          0
        ) || 0,
    });
  }

  return { data: results, error: null };
}

async function getVisitDetail(
  supabase: ReturnType<typeof createClient>,
  planId: string
) {
  const { data: checkins } = await supabase
    .from("visit_checkins")
    .select("*")
    .eq("visit_plan_id", planId)
    .order("checkin_time", { ascending: true });

  const results = [];
  for (const vc of checkins || []) {
    const { data: scans } = await supabase
      .from("bread_scans")
      .select("*")
      .eq("checkin_id", vc.id);

    results.push({
      ...vc,
      bread_scans: scans?.length ? scans : null,
    });
  }

  return { data: results, error: null };
}

async function getNotifikasiDeadline(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  isAdmin: boolean,
  today: string
) {
  if (isAdmin) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, user_id")
      .eq("role", "karyawan_sariroti");

    const results = [];
    for (const p of profiles || []) {
      const { data: plans } = await supabase
        .from("visit_plans")
        .select("id, status, submitted_at")
        .eq("user_id", p.user_id)
        .eq("plan_date", today)
        .limit(1);

      const { data: settings } = await supabase
        .from("sariroti_settings")
        .select("plan_deadline")
        .eq("user_profile_id", p.id)
        .limit(1);

      const plan = plans?.[0];
      if (!plan || plan.status === "draft") {
        results.push({
          user_profile_id: p.id,
          full_name: p.full_name,
          email: p.email,
          plan_status: plan ? plan.status : "no_plan",
          submitted_at: plan?.submitted_at || null,
          plan_deadline: settings?.[0]?.plan_deadline || null,
          status: plan ? plan.status : "no_plan",
        });
      }
    }
    return { data: results, error: null };
  } else {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.id as string)
      .limit(1);

    if (!profile?.[0]) return { data: null, error: null };

    const { data: plans } = await supabase
      .from("visit_plans")
      .select("id, status, submitted_at")
      .eq("user_id", user.id as string)
      .eq("plan_date", today)
      .limit(1);

    const { data: settings } = await supabase
      .from("sariroti_settings")
      .select("plan_deadline")
      .eq("user_profile_id", profile[0].id)
      .limit(1);

    const plan = plans?.[0];
    return {
      data: {
        plan_status: plan ? plan.status : "no_plan",
        submitted_at: plan?.submitted_at || null,
        plan_deadline: settings?.[0]?.plan_deadline || null,
        status: plan ? plan.status : "no_plan",
      },
      error: null,
    };
  }
}

async function getStoreVisitHistory(
  supabase: ReturnType<typeof createClient>,
  storeId: string
) {
  const { data: store } = await supabase
    .from("stores")
    .select("nama_toko")
    .eq("id", storeId)
    .limit(1);

  if (!store?.[0]) {
    return { data: null, error: { message: "Toko tidak ditemukan." } };
  }

  const { data: checkins } = await supabase
    .from("visit_checkins")
    .select(
      "id, checkin_time, checkout_time, duration_minutes, visit_type, total_billing, has_expired_bread, gps_lat, gps_lng, notes, user_id, visit_plan_id"
    )
    .ilike("store_name", store[0].nama_toko)
    .order("checkin_time", { ascending: false })
    .limit(100);

  const results = [];
  for (const vc of checkins || []) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", vc.user_id)
      .limit(1);

    const { data: plan } = await supabase
      .from("visit_plans")
      .select("plan_date")
      .eq("id", vc.visit_plan_id)
      .limit(1);

    results.push({
      ...vc,
      karyawan_name: profile?.[0]?.full_name || "",
      plan_date: plan?.[0]?.plan_date || "",
    });
  }

  return { data: results, error: null };
}

async function handleCheckin(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  body: Record<string, unknown>
) {
  const {
    visit_plan_id,
    store_name,
    store_address,
    visit_type,
    total_billing,
    has_expired_bread,
    notes,
    gps_lat,
    gps_lng,
    gps_accuracy,
    selfie_url,
  } = body;

  if (!store_name || !visit_plan_id || !visit_type) {
    return {
      data: null,
      error: {
        message: "visit_plan_id, store_name, visit_type wajib diisi.",
      },
    };
  }

  const { data: planRows } = await supabase
    .from("visit_plans")
    .select("plan_date, user_id")
    .eq("id", visit_plan_id as string)
    .limit(1);

  if (!planRows?.[0]) {
    return { data: null, error: { message: "Plan tidak ditemukan." } };
  }

  const planUserId = planRows[0].user_id;
  const planDate = planRows[0].plan_date;

  const { data: existingPlans } = await supabase
    .from("visit_plans")
    .select("id")
    .eq("user_id", planUserId)
    .eq("plan_date", planDate);

  const planIds =
    existingPlans?.map((p: { id: string }) => p.id) || [];

  if (planIds.length > 0) {
    const { data: dupCheck } = await supabase
      .from("visit_checkins")
      .select("id")
      .in("visit_plan_id", planIds)
      .eq("user_id", planUserId)
      .ilike("store_name", (store_name as string).trim());

    if (dupCheck && dupCheck.length > 0) {
      return {
        data: null,
        error: {
          message: `Toko "${store_name}" sudah di-check-in hari ini.`,
        },
      };
    }
  }

  const { data: checkin, error } = await supabase
    .from("visit_checkins")
    .insert({
      visit_plan_id,
      user_id: planUserId,
      store_name: (store_name as string).trim(),
      store_address: store_address || "",
      checkin_time: new Date().toISOString(),
      selfie_url: selfie_url || "",
      visit_type,
      total_billing: parseFloat(String(total_billing || "0")),
      has_expired_bread:
        has_expired_bread === "true" || has_expired_bread === true,
      notes: notes || "",
      status: "completed",
      gps_lat: gps_lat ? parseFloat(String(gps_lat)) : null,
      gps_lng: gps_lng ? parseFloat(String(gps_lng)) : null,
      gps_accuracy: gps_accuracy
        ? parseFloat(String(gps_accuracy))
        : null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }
  return { data: checkin, error: null };
}

async function handleCheckout(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  checkinId: string
) {
  const { data: existing } = await supabase
    .from("visit_checkins")
    .select("*")
    .eq("id", checkinId)
    .limit(1);

  if (!existing?.[0]) {
    return {
      data: null,
      error: { message: "Check-in tidak ditemukan." },
    };
  }

  if (
    existing[0].user_id !== user.id &&
    !ADMIN_ROLES.includes(user.role as string)
  ) {
    return { data: null, error: { message: "Akses ditolak." } };
  }

  if (existing[0].checkout_time) {
    return { data: null, error: { message: "Sudah di-checkout." } };
  }

  const checkoutTime = new Date();
  const checkinTime = new Date(existing[0].checkin_time);
  const durationMinutes = Math.round(
    (checkoutTime.getTime() - checkinTime.getTime()) / 60000
  );

  const { data: updated, error } = await supabase
    .from("visit_checkins")
    .update({
      checkout_time: checkoutTime.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq("id", checkinId)
    .select()
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }
  return { data: updated, error: null };
}

async function getStores(
  supabase: ReturnType<typeof createClient>,
  user: Record<string, unknown>,
  isAdmin: boolean
) {
  if (isAdmin) {
    const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    if (error) return { data: null, error: { message: error.message } };
    return { data, error: null };
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id as string)
    .limit(1);
  if (!profile?.[0]) return { data: [], error: null };
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("user_profile_id", profile[0].id)
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

async function updateStore(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  body: Record<string, unknown>
) {
  const updateData: Record<string, unknown> = {};
  if (body.nama_toko !== undefined) updateData.nama_toko = body.nama_toko;
  if (body.nama_pemilik !== undefined) updateData.nama_pemilik = body.nama_pemilik;
  if (body.alamat !== undefined) updateData.alamat = body.alamat;
  if (body.nomor_hp !== undefined) updateData.nomor_hp = body.nomor_hp;
  if (body.sharelok !== undefined) updateData.sharelok = body.sharelok;
  if (body.foto_toko !== undefined) updateData.foto_toko = body.foto_toko;
  if (body.status !== undefined) updateData.status = body.status;

  const { data, error } = await supabase
    .from("stores")
    .update(updateData)
    .eq("id", parseInt(storeId))
    .select()
    .single();
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}

async function transferStore(
  supabase: ReturnType<typeof createClient>,
  storeId: string,
  newUserProfileId: string
) {
  const { data, error } = await supabase
    .from("stores")
    .update({ user_profile_id: newUserProfileId })
    .eq("id", parseInt(storeId))
    .select()
    .single();
  if (error) return { data: null, error: { message: error.message } };
  return { data, error: null };
}
