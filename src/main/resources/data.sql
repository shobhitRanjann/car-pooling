-- ============================================================
-- Seed: ROLE_SUPER_USER
-- Default credentials: admin@watermark.com / Admin@1234
-- BCrypt hash for "Admin@1234" (strength 10)
-- ============================================================
INSERT INTO app_user (email, password_hash, first_name, last_name, role, is_deleted, created_at)
SELECT 'admin@watermark.com',
       '$2a$10$7EqJtq98hPqEX7fNZaFWoOe2eoJDXxCTVMSiLNVBtqrPDKUeC9Uti',
       'Super',
       'Admin',
       'ROLE_SUPER_USER',
       false,
       NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM app_user WHERE email = 'admin@watermark.com'
);
