-- Migration: add cart JSONB column to customers table
-- Run once against the production Postgres database before deploying the
-- updated backend.  Safe to run multiple times (IF NOT EXISTS guard).
--
-- How to run on production:
--   Option A – psql:
--     psql "$DATABASE_URL" -f backend/migrations/add_customers_cart_column.sql
--
--   Option B – Vercel Postgres / Neon / Supabase SQL editor:
--     Paste the ALTER TABLE statement below into the SQL console and execute.
--
--   Option C – Node one-liner (from the backend directory):
--     node -e "require('dotenv').config(); const {Pool}=require('pg'); \
--       const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); \
--       p.query(\"ALTER TABLE customers ADD COLUMN IF NOT EXISTS cart JSONB NOT NULL DEFAULT '[]'::jsonb\") \
--       .then(()=>{console.log('done');p.end()}).catch(e=>{console.error(e);p.end(process.exitCode=1)});"

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS cart JSONB NOT NULL DEFAULT '[]'::jsonb;
