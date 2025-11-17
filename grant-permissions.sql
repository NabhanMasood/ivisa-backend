-- SQL script to grant permissions to database user
-- Run this script as a PostgreSQL superuser (usually 'postgres')

-- Replace 'Asad' with your actual database username if different
-- You can check your username from the .env file or app.module.ts

-- Connect to your database first:
-- \c ivisa123_backend_db

-- Grant permissions on all existing tables in the public schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "Asad";

-- Grant permissions on all existing sequences (for auto-increment columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "Asad";

-- Grant permissions on all future tables (so new tables automatically get permissions)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "Asad";

-- Grant permissions on all future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "Asad";

-- Optional: If you need to create tables, grant CREATE privilege
-- GRANT CREATE ON SCHEMA public TO "Asad";

-- Verify permissions (optional - run this to check)
-- \dp

