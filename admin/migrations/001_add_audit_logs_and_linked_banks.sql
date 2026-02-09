-- =============================================
-- MIGRATION: Add Audit Logs and Linked Bank Accounts
-- Run this in your Supabase SQL Editor
-- =============================================

-- Admin Audit Logs for compliance and security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Encrypted bank account storage (separate from profiles for security)
CREATE TABLE IF NOT EXISTS linked_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    bank_code TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number_masked TEXT NOT NULL,
    encrypted_account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for user lookup
CREATE INDEX IF NOT EXISTS idx_linked_bank_accounts_user_id ON linked_bank_accounts(user_id);

-- Enable RLS on both tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Audit logs: Only admins can view (via service role, no direct access)
CREATE POLICY "audit_logs_admin_only" ON audit_logs
    FOR ALL
    TO authenticated
    USING (false);

-- Linked bank accounts: Users can only see their own
CREATE POLICY "linked_bank_accounts_user_select" ON linked_bank_accounts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "linked_bank_accounts_user_insert" ON linked_bank_accounts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "linked_bank_accounts_user_update" ON linked_bank_accounts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "linked_bank_accounts_user_delete" ON linked_bank_accounts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
