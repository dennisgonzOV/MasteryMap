
-- Add production users to PSI High School
-- First, ensure PSI High School exists
INSERT INTO schools (name, address, city, state, zip_code, created_at)
VALUES ('PSI High School', '123 Education Ave', 'Learning City', 'CA', '90210', NOW())
ON CONFLICT (name) DO NOTHING;

-- Get the school ID (assuming it's the first/only PSI High School)
-- Insert users with hashed passwords (you'll need to hash these beforehand)
INSERT INTO users (username, password, role, school_id, created_at, updated_at)
SELECT 
  username,
  password_hash,
  'student',
  (SELECT id FROM schools WHERE name = 'PSI High School' LIMIT 1),
  NOW(),
  NOW()
FROM (VALUES
  ('ADan315', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('HPri196', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('RCar927', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('TOrt818', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('SAll286', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('IDuc674', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('ARic755', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('JMar824', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('JCop702', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('TMir900', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('NVal875', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('KSto867', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('EAza419', '$2a$12$REPLACE_WITH_ACTUAL_HASH'),
  ('JSer696', '$2a$12$REPLACE_WITH_ACTUAL_HASH')
) AS user_data(username, password_hash)
ON CONFLICT (username) DO NOTHING;
