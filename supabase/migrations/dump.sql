--
-- PostgreSQL database dump
--

\restrict lqI4wZtN1SxlxibbKf91XakgZiwNbCGaahVU4XXAn59JHbep25657tyjiiXCoeL

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_dashboard_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_dashboard_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    visible_widgets jsonb DEFAULT '["balance", "income", "expense", "runway", "trend_chart", "category_chart", "transactions"]'::jsonb,
    default_date_range text DEFAULT '30_days'::text,
    chart_colors jsonb DEFAULT '{}'::jsonb,
    quick_filters jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_dashboard_preferences OWNER TO postgres;

--
-- Name: ai_tips_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_tips_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    language text DEFAULT 'id'::text,
    tone text DEFAULT 'friendly'::text,
    preferred_categories text[] DEFAULT ARRAY[]::text[],
    frequency text DEFAULT 'weekly'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_tips_settings OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_roles text[] DEFAULT '{karyawan,karyawan_sariroti}'::text[],
    priority text DEFAULT 'normal'::text
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: api_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    api_key text NOT NULL,
    is_active boolean DEFAULT false,
    last_tested_at timestamp with time zone,
    test_status text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.api_settings OWNER TO postgres;

--
-- Name: backup_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    schedule_frequency text NOT NULL,
    backup_scope text[] DEFAULT ARRAY['all'::text],
    storage_location text DEFAULT 'email'::text,
    next_backup_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_schedules_schedule_frequency_check CHECK ((schedule_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


ALTER TABLE public.backup_schedules OWNER TO postgres;

--
-- Name: batch_salary_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batch_salary_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    batch_name text NOT NULL,
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    total_employees integer DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    payment_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'draft'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT batch_salary_payments_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT batch_salary_payments_period_year_check CHECK ((period_year >= 2000)),
    CONSTRAINT batch_salary_payments_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.batch_salary_payments OWNER TO postgres;

--
-- Name: bread_scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bread_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkin_id uuid NOT NULL,
    user_id uuid NOT NULL,
    sku_code text NOT NULL,
    sku_name text DEFAULT ''::text,
    quantity integer DEFAULT 0,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bread_scans OWNER TO postgres;

--
-- Name: budget_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid,
    budget_period text DEFAULT 'monthly'::text,
    amount numeric(15,2) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    alert_threshold_percentage integer DEFAULT 80,
    rollover_enabled boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.budget_plans OWNER TO postgres;

--
-- Name: bulk_operation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bulk_operation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    operation_type text NOT NULL,
    target_count integer DEFAULT 0,
    success_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bulk_operation_logs OWNER TO postgres;

--
-- Name: cashflow_forecasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cashflow_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    forecast_date date NOT NULL,
    predicted_income numeric(15,2) DEFAULT 0,
    predicted_expense numeric(15,2) DEFAULT 0,
    predicted_balance numeric(15,2) DEFAULT 0,
    scenario text DEFAULT 'realistic'::text,
    is_manual boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cashflow_forecasts OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    color text DEFAULT '#6366f1'::text NOT NULL,
    icon text DEFAULT 'Circle'::text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: category_hierarchy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category_hierarchy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    parent_category_id uuid NOT NULL,
    child_category_id uuid NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.category_hierarchy OWNER TO postgres;

--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    logo_url text,
    address text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    email text DEFAULT ''::text,
    npwp text,
    currency text DEFAULT 'IDR'::text,
    fiscal_year_start integer DEFAULT 1,
    timezone text DEFAULT 'Asia/Jakarta'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.company_settings OWNER TO postgres;

--
-- Name: employee_loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_loans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    remaining_amount numeric DEFAULT 0 NOT NULL,
    monthly_deduction numeric DEFAULT 0 NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT employee_loans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'paid_off'::text])))
);


ALTER TABLE public.employee_loans OWNER TO postgres;

--
-- Name: employee_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    auto_salary_increment_enabled boolean DEFAULT false,
    auto_salary_increment_percentage numeric(5,2) DEFAULT 0,
    auto_salary_increment_months integer DEFAULT 12,
    prorate_salary_enabled boolean DEFAULT true,
    thr_calculation_formula text DEFAULT 'one_month_salary'::text,
    max_loan_percentage numeric(5,2) DEFAULT 50,
    max_loan_tenure_months integer DEFAULT 12,
    loan_interest_rate numeric(5,2) DEFAULT 0,
    allow_multiple_loans boolean DEFAULT false,
    late_deduction_amount numeric(15,2) DEFAULT 0,
    overtime_multiplier numeric(5,2) DEFAULT 1.5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.employee_policies OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    position_id uuid,
    job_position_id uuid,
    name text NOT NULL,
    employee_code text NOT NULL,
    basic_salary numeric(15,2) DEFAULT 0 NOT NULL,
    transport_allowance numeric(15,2) DEFAULT 0 NOT NULL,
    communication_allowance numeric(15,2) DEFAULT 0 NOT NULL,
    motorcycle_rental numeric(15,2) DEFAULT 0 NOT NULL,
    meal_allowance numeric(15,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT employees_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: export_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.export_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    export_type text NOT NULL,
    file_format text NOT NULL,
    date_range_start date,
    date_range_end date,
    exported_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.export_logs OWNER TO postgres;

--
-- Name: export_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.export_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_name text NOT NULL,
    export_type text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.export_templates OWNER TO postgres;

--
-- Name: holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    name text NOT NULL,
    is_national boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.holidays OWNER TO postgres;

--
-- Name: integrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    integration_type text NOT NULL,
    integration_name text NOT NULL,
    credentials jsonb DEFAULT '{}'::jsonb,
    configuration jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT false,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.integrations OWNER TO postgres;

--
-- Name: invite_link_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invite_link_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invite_link_id uuid NOT NULL,
    used_by uuid NOT NULL,
    used_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invite_link_usage OWNER TO postgres;

--
-- Name: invite_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invite_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    invite_token text NOT NULL,
    role text NOT NULL,
    max_uses integer DEFAULT 1 NOT NULL,
    current_uses integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invite_links_max_uses_check CHECK ((max_uses > 0)),
    CONSTRAINT invite_links_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin_keuangan'::text, 'admin_sariroti'::text, 'karyawan'::text, 'karyawan_sariroti'::text])))
);


ALTER TABLE public.invite_links OWNER TO postgres;

--
-- Name: job_positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    base_salary numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.job_positions OWNER TO postgres;

--
-- Name: login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ip_address text,
    device_info text,
    status text DEFAULT 'success'::text,
    logged_in_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.login_history OWNER TO postgres;

--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    runway_alert_enabled boolean DEFAULT true,
    runway_threshold_days integer DEFAULT 30,
    large_transaction_alert boolean DEFAULT true,
    large_transaction_threshold numeric DEFAULT 5000000,
    salary_payment_reminder boolean DEFAULT true,
    loan_due_reminder boolean DEFAULT true,
    attendance_cutoff_reminder boolean DEFAULT true,
    weekly_summary_email boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_settings OWNER TO postgres;

--
-- Name: payroll_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    attendance_start_day integer DEFAULT 21,
    attendance_end_day integer DEFAULT 20,
    payment_day integer DEFAULT 25,
    working_hours_per_day numeric DEFAULT 8,
    overtime_multiplier numeric DEFAULT 1.5,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payroll_periods OWNER TO postgres;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.positions OWNER TO postgres;

--
-- Name: recurring_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    type text NOT NULL,
    frequency text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_occurrence date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recurring_transactions_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'yearly'::text]))),
    CONSTRAINT recurring_transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


ALTER TABLE public.recurring_transactions OWNER TO postgres;

--
-- Name: report_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    schedule_frequency text NOT NULL,
    recipients text[] DEFAULT ARRAY[]::text[],
    next_run_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT report_schedules_schedule_frequency_check CHECK ((schedule_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


ALTER TABLE public.report_schedules OWNER TO postgres;

--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_name text NOT NULL,
    report_type text NOT NULL,
    configuration jsonb DEFAULT '{}'::jsonb,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.report_templates OWNER TO postgres;

--
-- Name: salary_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    is_taxable boolean DEFAULT false,
    calculation_type text DEFAULT 'fixed'::text,
    formula text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT salary_components_calculation_type_check CHECK ((calculation_type = ANY (ARRAY['fixed'::text, 'percentage'::text]))),
    CONSTRAINT salary_components_type_check CHECK ((type = ANY (ARRAY['income'::text, 'deduction'::text])))
);


ALTER TABLE public.salary_components OWNER TO postgres;

--
-- Name: salary_payment_proofs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_payment_proofs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_payment_id uuid NOT NULL,
    salary_payment_id uuid NOT NULL,
    proof_type text DEFAULT 'transfer'::text,
    proof_url text,
    proof_number text,
    uploaded_by uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT salary_payment_proofs_proof_type_check CHECK ((proof_type = ANY (ARRAY['transfer'::text, 'cash'::text, 'check'::text])))
);


ALTER TABLE public.salary_payment_proofs OWNER TO postgres;

--
-- Name: salary_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    period_month integer NOT NULL,
    period_year integer NOT NULL,
    basic_salary numeric(15,2) DEFAULT 0 NOT NULL,
    transport_allowance numeric(15,2) DEFAULT 0 NOT NULL,
    communication_allowance numeric(15,2) DEFAULT 0 NOT NULL,
    motorcycle_rental numeric(15,2) DEFAULT 0 NOT NULL,
    meal_allowance numeric(15,2) DEFAULT 0 NOT NULL,
    bonus numeric(15,2) DEFAULT 0 NOT NULL,
    loan_deduction numeric DEFAULT 0,
    total_salary numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT salary_payments_period_month_check CHECK (((period_month >= 1) AND (period_month <= 12))),
    CONSTRAINT salary_payments_period_year_check CHECK ((period_year >= 2000))
);


ALTER TABLE public.salary_payments OWNER TO postgres;

--
-- Name: sariroti_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sariroti_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid NOT NULL,
    min_visits integer DEFAULT 5,
    max_visits integer DEFAULT 10,
    plan_deadline time without time zone DEFAULT '09:00:00'::time without time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sariroti_settings OWNER TO postgres;

--
-- Name: sku_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sku_items (
    id integer NOT NULL,
    kode character varying(50) NOT NULL,
    nama character varying(255) NOT NULL,
    kategori character varying(100) NOT NULL,
    cbp integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sku_items OWNER TO postgres;

--
-- Name: sku_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sku_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sku_items_id_seq OWNER TO postgres;

--
-- Name: sku_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sku_items_id_seq OWNED BY public.sku_items.id;


--
-- Name: stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_profile_id uuid,
    nama_toko text NOT NULL,
    nama_pemilik text DEFAULT ''::text,
    alamat text DEFAULT ''::text,
    nomor_hp text DEFAULT ''::text,
    sharelok text DEFAULT ''::text,
    foto_toko text DEFAULT ''::text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.stores OWNER TO postgres;

--
-- Name: transaction_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    tag_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transaction_tags OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'karyawan'::text NOT NULL,
    full_name text DEFAULT ''::text NOT NULL,
    email text,
    phone text DEFAULT ''::text,
    department text DEFAULT ''::text,
    job_title text DEFAULT ''::text,
    hire_date date,
    nik text DEFAULT ''::text,
    gender text DEFAULT ''::text,
    date_of_birth date,
    address text DEFAULT ''::text,
    status text DEFAULT 'active'::text,
    employee_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profiles_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin_keuangan'::text, 'admin_sariroti'::text, 'karyawan'::text, 'karyawan_sariroti'::text])))
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: visit_checkins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visit_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visit_plan_id uuid NOT NULL,
    user_id uuid NOT NULL,
    store_name text NOT NULL,
    store_address text DEFAULT ''::text,
    checkin_time timestamp with time zone DEFAULT now(),
    checkout_time timestamp with time zone,
    duration_minutes integer,
    selfie_url text DEFAULT ''::text,
    visit_type text DEFAULT 'regular'::text,
    total_billing numeric DEFAULT 0,
    has_expired_bread boolean DEFAULT false,
    notes text DEFAULT ''::text,
    status text DEFAULT 'completed'::text,
    gps_lat numeric(10,8),
    gps_lng numeric(11,8),
    gps_accuracy numeric,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.visit_checkins OWNER TO postgres;

--
-- Name: visit_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visit_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_date date NOT NULL,
    stores jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'draft'::text,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    notes text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT visit_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.visit_plans OWNER TO postgres;

--
-- Name: sku_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sku_items ALTER COLUMN id SET DEFAULT nextval('public.sku_items_id_seq'::regclass);


--
-- Data for Name: admin_dashboard_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_dashboard_preferences (id, user_id, visible_widgets, default_date_range, chart_colors, quick_filters, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_tips_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_tips_settings (id, user_id, is_enabled, language, tone, preferred_categories, frequency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, user_id, title, content, is_active, created_at, updated_at, target_roles, priority) FROM stdin;
\.


--
-- Data for Name: api_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_settings (id, user_id, provider, api_key, is_active, last_tested_at, test_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: backup_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backup_schedules (id, user_id, schedule_frequency, backup_scope, storage_location, next_backup_date, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: batch_salary_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batch_salary_payments (id, user_id, batch_name, period_month, period_year, total_employees, total_amount, payment_date, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bread_scans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bread_scans (id, checkin_id, user_id, sku_code, sku_name, quantity, notes, created_at) FROM stdin;
\.


--
-- Data for Name: budget_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.budget_plans (id, user_id, category_id, budget_period, amount, start_date, end_date, alert_threshold_percentage, rollover_enabled, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bulk_operation_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bulk_operation_logs (id, user_id, operation_type, target_count, success_count, failed_count, details, created_at) FROM stdin;
\.


--
-- Data for Name: cashflow_forecasts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cashflow_forecasts (id, user_id, forecast_date, predicted_income, predicted_expense, predicted_balance, scenario, is_manual, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, user_id, name, type, color, icon, is_default, created_at) FROM stdin;
\.


--
-- Data for Name: category_hierarchy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category_hierarchy (id, user_id, parent_category_id, child_category_id, display_order, created_at) FROM stdin;
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_settings (id, user_id, company_name, logo_url, address, phone, email, npwp, currency, fiscal_year_start, timezone, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_loans (id, user_id, employee_id, amount, remaining_amount, monthly_deduction, start_date, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employee_policies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_policies (id, user_id, auto_salary_increment_enabled, auto_salary_increment_percentage, auto_salary_increment_months, prorate_salary_enabled, thr_calculation_formula, max_loan_percentage, max_loan_tenure_months, loan_interest_rate, allow_multiple_loans, late_deduction_amount, overtime_multiplier, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, user_id, position_id, job_position_id, name, employee_code, basic_salary, transport_allowance, communication_allowance, motorcycle_rental, meal_allowance, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: export_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.export_logs (id, user_id, export_type, file_format, date_range_start, date_range_end, exported_at) FROM stdin;
\.


--
-- Data for Name: export_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.export_templates (id, user_id, template_name, export_type, configuration, created_at) FROM stdin;
\.


--
-- Data for Name: holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holidays (id, user_id, date, name, is_national, created_at) FROM stdin;
\.


--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.integrations (id, user_id, integration_type, integration_name, credentials, configuration, is_active, last_sync_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invite_link_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invite_link_usage (id, invite_link_id, used_by, used_at) FROM stdin;
\.


--
-- Data for Name: invite_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invite_links (id, created_by, invite_token, role, max_uses, current_uses, expires_at, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: job_positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_positions (id, user_id, name, base_salary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_history (id, user_id, ip_address, device_info, status, logged_in_at) FROM stdin;
890a7339-3134-4c42-8a07-dbdf4e285a4d	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 13:24:56.792394+00
198ddf70-4792-4843-9f84-8a1de6681af3	a845c6f8-e4c2-4a2d-9654-01a81fe9363e	127.0.0.1	\N	success	2026-03-07 13:26:03.353993+00
9fc86cd9-e33f-4bc6-8520-f6d49e4f5f5c	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 13:27:25.269651+00
cb090a3b-00dc-4c0a-8f5d-6e2b68d5c0d7	a845c6f8-e4c2-4a2d-9654-01a81fe9363e	127.0.0.1	\N	success	2026-03-07 13:28:10.331573+00
7f8f37dd-d433-4458-8090-b75112de1177	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 13:37:43.534806+00
7b533d9b-ce9a-40ee-b0ff-6e37490a000b	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 13:37:48.845059+00
6d5c8188-b090-4a3c-887c-6dc35256b04b	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 17:24:32.301639+00
4ad637db-3cb3-4ac5-bbe1-3f9422aadaf9	a845c6f8-e4c2-4a2d-9654-01a81fe9363e	127.0.0.1	\N	success	2026-03-07 17:28:48.847547+00
21ee10ed-be38-4af2-8a3e-fbd8dc2a65ec	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 17:32:53.860448+00
6fc2efb0-e840-4ab0-bd63-3187fd2121f7	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 18:28:28.667276+00
80e88573-1d97-411d-8b3d-c4534235f92d	1624e614-e515-47b2-93c5-30ea6e29c8c2	127.0.0.1	\N	success	2026-03-07 18:29:07.100786+00
96a33abf-717a-4880-a2e9-aa5a25fa6275	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-07 18:32:47.814423+00
06c1a7b2-d47c-4d4a-9fc5-dbe05f33424f	ab969a56-b30d-441b-b54a-5c83d402e5b6	127.0.0.1	\N	success	2026-03-09 16:40:44.276599+00
\.


--
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_settings (id, user_id, runway_alert_enabled, runway_threshold_days, large_transaction_alert, large_transaction_threshold, salary_payment_reminder, loan_due_reminder, attendance_cutoff_reminder, weekly_summary_email, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payroll_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_periods (id, user_id, attendance_start_day, attendance_end_day, payment_day, working_hours_per_day, overtime_multiplier, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.positions (id, user_id, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recurring_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recurring_transactions (id, user_id, category_id, description, amount, type, frequency, start_date, end_date, next_occurrence, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: report_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_schedules (id, user_id, template_id, schedule_frequency, recipients, next_run_date, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.report_templates (id, user_id, template_name, report_type, configuration, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: salary_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_components (id, user_id, name, type, is_taxable, calculation_type, formula, is_active, display_order, created_at) FROM stdin;
\.


--
-- Data for Name: salary_payment_proofs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_payment_proofs (id, batch_payment_id, salary_payment_id, proof_type, proof_url, proof_number, uploaded_by, notes, created_at) FROM stdin;
\.


--
-- Data for Name: salary_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_payments (id, user_id, employee_id, payment_date, period_month, period_year, basic_salary, transport_allowance, communication_allowance, motorcycle_rental, meal_allowance, bonus, loan_deduction, total_salary, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sariroti_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sariroti_settings (id, user_profile_id, min_visits, max_visits, plan_deadline, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sku_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sku_items (id, kode, nama, kategori, cbp, is_active, created_at, updated_at) FROM stdin;
1	RTS	Roti Tawar Special	Roti Tawar	15000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
2	RTG	Roti Tawar Gandum	Roti Tawar	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
3	RTPDM	Roti Tawar Pandan Manis	Roti Tawar	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
4	RCC	Roti Tawar Choco Chip	Roti Tawar	19000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
5	RTKL	Roti Tawar Klasik	Roti Tawar	12500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
6	RKU	Roti Tawar Kupas	Roti Tawar	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
7	RJKU	Roti Jumbo Tawar Kupas	Roti Tawar	21000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
8	DOP	Roti Tawar Doble Soft F	Roti Tawar	14500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
9	DOM	Roti Tawar Doble Soft	Roti Tawar	20500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
10	RTJS	Roti Tawar Jumbo Spesial	Roti Tawar	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
11	RJMS	Roti Jumbo Milk Soft	Roti Tawar	17500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
12	SCC	Sandwich Coklat	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
13	SAB	Sandwich Blueberry	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
14	SAP	Sandwich Krim Peanut	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
15	SKI	Sandwich Keju	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
16	SMG	Sandwich Margarin Gula	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
17	SSM	Sandwich Pandan Sarikaya	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
18	SCB	Sandwich Choco Blast	Sandwich	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
19	ZSCCK	Zupper Sandwich Krim Coklat	Zupper Sandwich	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
20	ZSCMK	Zupper Sandwich Krim Moka	Zupper Sandwich	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
21	ZSCS	Zupper Sandwich Creamy Sweet	Zupper Sandwich	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
22	ZSCST	Zuper Sandwich Krim Strawberry	Zupper Sandwich	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
23	ICK GT	Choco Bun	Bun & Sobek	4000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
24	ICZ GT	Cheese Bun	Bun & Sobek	4000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
25	ICE	Sweet Cheese Bun	Bun & Sobek	4000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
26	IST	Blueberry Bun GT	Bun & Sobek	4000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
27	IBL	Blueberry Bun	Bun & Sobek	4000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
28	ICO	Coconut Bun GT	Bun & Sobek	4000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
29	TOC	Roti Sobek Coklat Coklat	Bun & Sobek	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
30	TCC	Roti Sobek Coklat Meses	Bun & Sobek	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
31	TCS	Roti Sobek Coklat Sarikaya	Bun & Sobek	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
32	TST	Roti Sobek Coklat Strawberry	Bun & Sobek	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
33	TCB	Roti Sobek Coklat Blueberry	Bun & Sobek	13500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
34	TCBIII	Roti Sobek Krim Meses	Bun & Sobek	13500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
35	TDST	Sobek Duo Strawberry	Bun & Sobek	11000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
36	TDCB	Sobek Duo Blueberry	Bun & Sobek	11000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
37	TDOC	Sobek Duo Cokelat	Bun & Sobek	8500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
38	TDSA	Sobek Duo Sarikaya	Bun & Sobek	8000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
39	KBC	Klasik Bantal Sweet Cheese	Bun & Sobek	8500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
40	RMNS	Roti Mini Strawberry	Bun & Sobek	8000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
41	BUR	Burgerbun	Bun & Sobek	11000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
42	SRPL	Plain Rolls	Bun & Sobek	11000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
43	SCM	Roti Krim Cokelat Meses	Roti Krim	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
44	SCCIII	Roti Creamy Cokelat Meses	Roti Krim	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
45	SCVIII	Roti Krim Coklat	Roti Krim	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
46	SCCJII	Roti Krim Keju	Roti Krim	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
47	SRMIII	Roti Krim Moca	Roti Krim	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
48	ZCRCK	Zuperr Creamy Choco Double Choco	Zuperr Creamy	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
49	ZCRCR	Zuperr Creamy Choco Choco Berry	Zuperr Creamy	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
50	ZCRCB	Zuperr Creamy Choco Choco Banana	Zuperr Creamy	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
51	SRS	Roti Sandroll Zuperr Creamy Strawberry	Zuperr Creamy	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
52	DCS	Dorayaki Si Coklat	Dorayaki	7500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
53	DCP	Dorayaki Choco Peanut	Dorayaki	7500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
54	DCH	Dorayaki Hokkaido Cheese	Dorayaki	7500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
55	DHF	Dorayaki Honey Flavor	Dorayaki	7500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
56	DSK	Dorayaki Sarikaya	Dorayaki	5500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
57	DMT	Dorayaki Martabak	Dorayaki	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
58	DPS	Dorayaki Pandan Sarikaya	Dorayaki	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
59	DNS	Dorayaki Nastar	Dorayaki	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
60	RKJ	Roti Kasur Keju	Roti Kasur & Sisir	14000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
61	RSM	Roti Sisir Mentega	Roti Kasur & Sisir	11000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
62	RKS	Roti Kasur Susu	Roti Kasur & Sisir	11000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
63	CCC	Chiffon Cake Coklat	Cake	25000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
64	CCP	Chiffon Cake Pandan	Cake	25000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
65	MCP VI	Mini Cupcake Vanilla Coconut Isi 6	Cake	22000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
66	KAOF	Kastela Original Family	Cake	255000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
67	KAOM	Kastela Original Medium	Cake	105000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
68	BKV	Bolu Kukus Putih Vanilla	Cake	12500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
69	BMO	Bolu Mini Original	Cake	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
70	WFO	Waffle Original	Cake	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
71	LSPO	Lapis Surabaya Premium Original	Lapis Surabaya	12500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
72	LSPK	Lapis Surabaya Premium Keju	Lapis Surabaya	12500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
73	LSPP	Lapis Surabaya Premium Pandan	Lapis Surabaya	12500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
74	LSPM	Lapis Surabaya Premium Moca	Lapis Surabaya	12500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
75	SCCP	Soft Cake Putu Pandan	Soft Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
76	SCPI	Soft Cake Pisang Ijo	Soft Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
77	SCET	Soft Cake Es Teler	Soft Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
78	SCGA	Soft Cake Gula Aren	Soft Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
79	SCPSM	Soft Cake Pandan Salted Caramel Mocca	Soft Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
80	STCS	Steam Cheese Cake Strawberry	Steam Cheese Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
81	STCC	Steam Cheese Cake	Steam Cheese Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
82	STCK	Steam Cheese Cake Cokelat	Steam Cheese Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
83	STCB	Steam Cheese Cake Banana	Steam Cheese Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
84	STCTM	Steam Cheese Cake Tiramisu	Steam Cheese Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
85	STCBA	Steam Cheese Cake Basket	Steam Cheese Cake	9500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
86	STCDC	Steam Cheese Cake Duo	Steam Cheese Cake	7000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
87	SCSC	Sari Choco Spread Coklat	Sari Choco	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
88	SCSCH	Sari Choco Spread Coklat Hazelnut	Sari Choco	18000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
89	SCM110	Sari Choco Milk 110ml	Sari Choco	5000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
90	SCM180	Sari Choco Milk 180ml	Sari Choco	6000	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
91	BKCK	Bamkohem Original	Bamkohem	10500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
92	BKKJ	Bamkohem Keju	Bamkohem	10500	t	2026-03-07 13:36:39.431677+00	2026-03-07 13:36:39.431677+00
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stores (id, user_profile_id, nama_toko, nama_pemilik, alamat, nomor_hp, sharelok, foto_toko, status, created_at, updated_at) FROM stdin;
9920e385-b5c9-4745-b834-a387c6b3f7b1	5ffbf9b2-f641-445a-9901-9b4bd9522280	toko 1	ujang					active	2026-03-07 13:27:13.825724+00	2026-03-07 13:27:13.825724+00
\.


--
-- Data for Name: transaction_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_tags (id, user_id, transaction_id, tag_name, created_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, category_id, date, description, amount, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, user_id, role, full_name, email, phone, department, job_title, hire_date, nik, gender, date_of_birth, address, status, employee_id, created_at, updated_at) FROM stdin;
9c4ef118-9316-47d0-8897-6422530b2518	ab969a56-b30d-441b-b54a-5c83d402e5b6	superadmin	Super Admin	admin@admin.com				\N			\N		active	\N	2026-03-07 13:23:15.220118+00	2026-03-07 13:23:15.220118+00
5ffbf9b2-f641-445a-9901-9b4bd9522280	a845c6f8-e4c2-4a2d-9654-01a81fe9363e	karyawan_sariroti	asep	sariroti@sariroti.com				\N		Laki-laki	\N		active	\N	2026-03-07 13:25:38.233766+00	2026-03-07 13:25:38.233766+00
119bf17c-d53f-4575-a74a-74102ab1a00e	1624e614-e515-47b2-93c5-30ea6e29c8c2	admin_sariroti	admin sari roti	sari2@sariroti.com				\N			\N		active	\N	2026-03-07 18:28:56.911547+00	2026-03-07 18:28:56.911547+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, created_at) FROM stdin;
a845c6f8-e4c2-4a2d-9654-01a81fe9363e	sariroti@sariroti.com	$2b$10$sE1SDrLrpO8U5RIwUqMxPeLob6GaxfgwoeWX.CEkTVhjNz7Tsic52	2026-03-07 13:25:38.204243+00
1624e614-e515-47b2-93c5-30ea6e29c8c2	sari2@sariroti.com	$2b$10$SxkFO5aBO4kHDKm3.hEt0.7087XcBFPxsIsgsHYjvJRa4YQuv75d.	2026-03-07 18:28:56.907923+00
ab969a56-b30d-441b-b54a-5c83d402e5b6	admin@admin.com	$2b$10$v.gjkisiG5SfpMgVaXeg8.az3Rl0yduJILAGQwCZfB5RehXpRJ58a	2026-03-07 13:23:15.220118+00
\.


--
-- Data for Name: visit_checkins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visit_checkins (id, visit_plan_id, user_id, store_name, store_address, checkin_time, checkout_time, duration_minutes, selfie_url, visit_type, total_billing, has_expired_bread, notes, status, gps_lat, gps_lng, gps_accuracy, created_at) FROM stdin;
\.


--
-- Data for Name: visit_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visit_plans (id, user_id, plan_date, stores, status, submitted_at, approved_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Name: sku_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sku_items_id_seq', 92, true);


--
-- Name: admin_dashboard_preferences admin_dashboard_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dashboard_preferences
    ADD CONSTRAINT admin_dashboard_preferences_pkey PRIMARY KEY (id);


--
-- Name: admin_dashboard_preferences admin_dashboard_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dashboard_preferences
    ADD CONSTRAINT admin_dashboard_preferences_user_id_key UNIQUE (user_id);


--
-- Name: ai_tips_settings ai_tips_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tips_settings
    ADD CONSTRAINT ai_tips_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_tips_settings ai_tips_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tips_settings
    ADD CONSTRAINT ai_tips_settings_user_id_key UNIQUE (user_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_settings api_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_settings
    ADD CONSTRAINT api_settings_pkey PRIMARY KEY (id);


--
-- Name: backup_schedules backup_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_pkey PRIMARY KEY (id);


--
-- Name: batch_salary_payments batch_salary_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_salary_payments
    ADD CONSTRAINT batch_salary_payments_pkey PRIMARY KEY (id);


--
-- Name: bread_scans bread_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bread_scans
    ADD CONSTRAINT bread_scans_pkey PRIMARY KEY (id);


--
-- Name: budget_plans budget_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_plans
    ADD CONSTRAINT budget_plans_pkey PRIMARY KEY (id);


--
-- Name: bulk_operation_logs bulk_operation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_operation_logs
    ADD CONSTRAINT bulk_operation_logs_pkey PRIMARY KEY (id);


--
-- Name: cashflow_forecasts cashflow_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow_forecasts
    ADD CONSTRAINT cashflow_forecasts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_hierarchy category_hierarchy_parent_category_id_child_category_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_hierarchy
    ADD CONSTRAINT category_hierarchy_parent_category_id_child_category_id_key UNIQUE (parent_category_id, child_category_id);


--
-- Name: category_hierarchy category_hierarchy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_hierarchy
    ADD CONSTRAINT category_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: employee_loans employee_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loans
    ADD CONSTRAINT employee_loans_pkey PRIMARY KEY (id);


--
-- Name: employee_policies employee_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_policies
    ADD CONSTRAINT employee_policies_pkey PRIMARY KEY (id);


--
-- Name: employee_policies employee_policies_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_policies
    ADD CONSTRAINT employee_policies_user_id_key UNIQUE (user_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_user_id_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_employee_code_key UNIQUE (user_id, employee_code);


--
-- Name: export_logs export_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_logs
    ADD CONSTRAINT export_logs_pkey PRIMARY KEY (id);


--
-- Name: export_templates export_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_templates
    ADD CONSTRAINT export_templates_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: integrations integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_pkey PRIMARY KEY (id);


--
-- Name: invite_link_usage invite_link_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_link_usage
    ADD CONSTRAINT invite_link_usage_pkey PRIMARY KEY (id);


--
-- Name: invite_links invite_links_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_links
    ADD CONSTRAINT invite_links_invite_token_key UNIQUE (invite_token);


--
-- Name: invite_links invite_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_links
    ADD CONSTRAINT invite_links_pkey PRIMARY KEY (id);


--
-- Name: job_positions job_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_positions
    ADD CONSTRAINT job_positions_pkey PRIMARY KEY (id);


--
-- Name: job_positions job_positions_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_positions
    ADD CONSTRAINT job_positions_user_id_name_key UNIQUE (user_id, name);


--
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: recurring_transactions recurring_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_pkey PRIMARY KEY (id);


--
-- Name: report_schedules report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: salary_components salary_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_components
    ADD CONSTRAINT salary_components_pkey PRIMARY KEY (id);


--
-- Name: salary_payment_proofs salary_payment_proofs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payment_proofs
    ADD CONSTRAINT salary_payment_proofs_pkey PRIMARY KEY (id);


--
-- Name: salary_payments salary_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_pkey PRIMARY KEY (id);


--
-- Name: sariroti_settings sariroti_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sariroti_settings
    ADD CONSTRAINT sariroti_settings_pkey PRIMARY KEY (id);


--
-- Name: sariroti_settings sariroti_settings_user_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sariroti_settings
    ADD CONSTRAINT sariroti_settings_user_profile_id_key UNIQUE (user_profile_id);


--
-- Name: sku_items sku_items_kode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sku_items
    ADD CONSTRAINT sku_items_kode_key UNIQUE (kode);


--
-- Name: sku_items sku_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sku_items
    ADD CONSTRAINT sku_items_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: transaction_tags transaction_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_pkey PRIMARY KEY (id);


--
-- Name: transaction_tags transaction_tags_transaction_id_tag_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_transaction_id_tag_name_key UNIQUE (transaction_id, tag_name);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: categories unique_user_category; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT unique_user_category UNIQUE (user_id, name, type);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visit_checkins visit_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visit_checkins
    ADD CONSTRAINT visit_checkins_pkey PRIMARY KEY (id);


--
-- Name: visit_plans visit_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visit_plans
    ADD CONSTRAINT visit_plans_pkey PRIMARY KEY (id);


--
-- Name: idx_announcements_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcements_user_id ON public.announcements USING btree (user_id);


--
-- Name: idx_api_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_settings_user_id ON public.api_settings USING btree (user_id);


--
-- Name: idx_batch_salary_payments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_batch_salary_payments_user_id ON public.batch_salary_payments USING btree (user_id);


--
-- Name: idx_bread_scans_checkin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bread_scans_checkin_id ON public.bread_scans USING btree (checkin_id);


--
-- Name: idx_budget_plans_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_plans_user_id ON public.budget_plans USING btree (user_id);


--
-- Name: idx_cashflow_forecasts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cashflow_forecasts_user_id ON public.cashflow_forecasts USING btree (user_id);


--
-- Name: idx_categories_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_type ON public.categories USING btree (type);


--
-- Name: idx_categories_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);


--
-- Name: idx_company_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_settings_user_id ON public.company_settings USING btree (user_id);


--
-- Name: idx_employee_loans_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_loans_employee_id ON public.employee_loans USING btree (employee_id);


--
-- Name: idx_employee_loans_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_loans_user_id ON public.employee_loans USING btree (user_id);


--
-- Name: idx_employees_job_position_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_job_position_id ON public.employees USING btree (job_position_id);


--
-- Name: idx_employees_position_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_position_id ON public.employees USING btree (position_id);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_employees_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_user_id ON public.employees USING btree (user_id);


--
-- Name: idx_export_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_export_logs_user_id ON public.export_logs USING btree (user_id);


--
-- Name: idx_invite_link_usage_invite_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invite_link_usage_invite_id ON public.invite_link_usage USING btree (invite_link_id);


--
-- Name: idx_invite_link_usage_used_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invite_link_usage_used_by ON public.invite_link_usage USING btree (used_by);


--
-- Name: idx_invite_links_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invite_links_active ON public.invite_links USING btree (is_active);


--
-- Name: idx_invite_links_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invite_links_created_by ON public.invite_links USING btree (created_by);


--
-- Name: idx_invite_links_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invite_links_token ON public.invite_links USING btree (invite_token);


--
-- Name: idx_job_positions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_positions_user_id ON public.job_positions USING btree (user_id);


--
-- Name: idx_login_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_user_id ON public.login_history USING btree (user_id);


--
-- Name: idx_positions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_positions_user_id ON public.positions USING btree (user_id);


--
-- Name: idx_recurring_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recurring_transactions_user_id ON public.recurring_transactions USING btree (user_id);


--
-- Name: idx_salary_payments_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_payments_employee_id ON public.salary_payments USING btree (employee_id);


--
-- Name: idx_salary_payments_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_payments_period ON public.salary_payments USING btree (period_year, period_month);


--
-- Name: idx_salary_payments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_payments_user_id ON public.salary_payments USING btree (user_id);


--
-- Name: idx_stores_user_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stores_user_profile_id ON public.stores USING btree (user_profile_id);


--
-- Name: idx_transactions_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_category_id ON public.transactions USING btree (category_id);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_date ON public.transactions USING btree (date);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_transactions_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, date DESC);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_user_profiles_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);


--
-- Name: idx_user_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);


--
-- Name: idx_visit_checkins_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visit_checkins_user_id ON public.visit_checkins USING btree (user_id);


--
-- Name: idx_visit_checkins_visit_plan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visit_checkins_visit_plan_id ON public.visit_checkins USING btree (visit_plan_id);


--
-- Name: idx_visit_plans_plan_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visit_plans_plan_date ON public.visit_plans USING btree (plan_date);


--
-- Name: idx_visit_plans_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visit_plans_user_id ON public.visit_plans USING btree (user_id);


--
-- Name: admin_dashboard_preferences admin_dashboard_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dashboard_preferences
    ADD CONSTRAINT admin_dashboard_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ai_tips_settings ai_tips_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_tips_settings
    ADD CONSTRAINT ai_tips_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: announcements announcements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: api_settings api_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_settings
    ADD CONSTRAINT api_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: backup_schedules backup_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: batch_salary_payments batch_salary_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batch_salary_payments
    ADD CONSTRAINT batch_salary_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bread_scans bread_scans_checkin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bread_scans
    ADD CONSTRAINT bread_scans_checkin_id_fkey FOREIGN KEY (checkin_id) REFERENCES public.visit_checkins(id) ON DELETE CASCADE;


--
-- Name: bread_scans bread_scans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bread_scans
    ADD CONSTRAINT bread_scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: budget_plans budget_plans_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_plans
    ADD CONSTRAINT budget_plans_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: budget_plans budget_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_plans
    ADD CONSTRAINT budget_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bulk_operation_logs bulk_operation_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bulk_operation_logs
    ADD CONSTRAINT bulk_operation_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cashflow_forecasts cashflow_forecasts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cashflow_forecasts
    ADD CONSTRAINT cashflow_forecasts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: category_hierarchy category_hierarchy_child_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_hierarchy
    ADD CONSTRAINT category_hierarchy_child_category_id_fkey FOREIGN KEY (child_category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_hierarchy category_hierarchy_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_hierarchy
    ADD CONSTRAINT category_hierarchy_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_hierarchy category_hierarchy_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category_hierarchy
    ADD CONSTRAINT category_hierarchy_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: company_settings company_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employee_loans employee_loans_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loans
    ADD CONSTRAINT employee_loans_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_loans employee_loans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_loans
    ADD CONSTRAINT employee_loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: employee_policies employee_policies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_policies
    ADD CONSTRAINT employee_policies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employees employees_job_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_job_position_id_fkey FOREIGN KEY (job_position_id) REFERENCES public.job_positions(id) ON DELETE SET NULL;


--
-- Name: employees employees_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: export_logs export_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_logs
    ADD CONSTRAINT export_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: export_templates export_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.export_templates
    ADD CONSTRAINT export_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_profiles fk_user_profiles_employee_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT fk_user_profiles_employee_id FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL NOT VALID;


--
-- Name: holidays holidays_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: integrations integrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrations
    ADD CONSTRAINT integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: invite_link_usage invite_link_usage_invite_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_link_usage
    ADD CONSTRAINT invite_link_usage_invite_link_id_fkey FOREIGN KEY (invite_link_id) REFERENCES public.invite_links(id) ON DELETE CASCADE;


--
-- Name: invite_link_usage invite_link_usage_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_link_usage
    ADD CONSTRAINT invite_link_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invite_links invite_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invite_links
    ADD CONSTRAINT invite_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_positions job_positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_positions
    ADD CONSTRAINT job_positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payroll_periods payroll_periods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: positions positions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recurring_transactions recurring_transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: recurring_transactions recurring_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_transactions
    ADD CONSTRAINT recurring_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_schedules report_schedules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id) ON DELETE CASCADE;


--
-- Name: report_schedules report_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_templates report_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: salary_components salary_components_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_components
    ADD CONSTRAINT salary_components_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: salary_payment_proofs salary_payment_proofs_batch_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payment_proofs
    ADD CONSTRAINT salary_payment_proofs_batch_payment_id_fkey FOREIGN KEY (batch_payment_id) REFERENCES public.batch_salary_payments(id) ON DELETE CASCADE;


--
-- Name: salary_payment_proofs salary_payment_proofs_salary_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payment_proofs
    ADD CONSTRAINT salary_payment_proofs_salary_payment_id_fkey FOREIGN KEY (salary_payment_id) REFERENCES public.salary_payments(id) ON DELETE CASCADE;


--
-- Name: salary_payment_proofs salary_payment_proofs_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payment_proofs
    ADD CONSTRAINT salary_payment_proofs_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: salary_payments salary_payments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: salary_payments salary_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_payments
    ADD CONSTRAINT salary_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sariroti_settings sariroti_settings_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sariroti_settings
    ADD CONSTRAINT sariroti_settings_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;


--
-- Name: stores stores_user_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;


--
-- Name: transaction_tags transaction_tags_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: transaction_tags transaction_tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: visit_checkins visit_checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visit_checkins
    ADD CONSTRAINT visit_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: visit_checkins visit_checkins_visit_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visit_checkins
    ADD CONSTRAINT visit_checkins_visit_plan_id_fkey FOREIGN KEY (visit_plan_id) REFERENCES public.visit_plans(id) ON DELETE CASCADE;


--
-- Name: visit_plans visit_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visit_plans
    ADD CONSTRAINT visit_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict lqI4wZtN1SxlxibbKf91XakgZiwNbCGaahVU4XXAn59JHbep25657tyjiiXCoeL

