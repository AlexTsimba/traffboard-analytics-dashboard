-- Create default admin user
-- Password: admin123456 (hashed)

INSERT INTO users (email, password_hash, role, is_verified, two_factor_enabled) 
VALUES (
  'admin@traffboard.com',
  '7f9a6c5b8e3d2a1f:193c6a5ff73987e123f74ec16da1c19a959a46cf725fa5d07da7e82d4dca6148',
  'admin',
  true,
  false
) ON CONFLICT (email) DO NOTHING;

-- Insert sample data for testing (optional)
INSERT INTO conversions (date, foreign_partner_id, foreign_campaign_id, foreign_landing_id, os_family, country, unique_clicks, registrations_count, ftd_count)
VALUES 
  ('2024-06-09', 123, 456, 789, 'Windows', 'US', 1000, 50, 5),
  ('2024-06-10', 123, 456, 789, 'Mac', 'CA', 800, 40, 4),
  ('2024-06-10', 124, 457, 790, 'Android', 'UK', 1200, 60, 6)
ON CONFLICT DO NOTHING;

INSERT INTO players (player_id, date, partner_id, campaign_id, player_country, prequalified, deposits_sum, casino_real_ngr, fixed_per_player)
VALUES 
  (1001, '2024-06-09', 123, 456, 'US', true, 1000.00, 950.00, 100.00),
  (1002, '2024-06-10', 123, 456, 'CA', true, 1500.00, 1400.00, 100.00),
  (1003, '2024-06-10', 124, 457, 'UK', true, 800.00, 750.00, 100.00)
ON CONFLICT (player_id) DO NOTHING;

-- Log successful setup
\echo 'Database setup completed successfully!'
\echo 'Admin user created: admin@traffboard.com / admin123456'
\echo 'Sample data inserted for testing'
