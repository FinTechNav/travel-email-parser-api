-- migrations/add_timezone_cache.sql
-- Add timezone caching table to reduce API calls

CREATE TABLE IF NOT EXISTS timezone_cache (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255) UNIQUE NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timezone_cache_location ON timezone_cache(location);
CREATE INDEX IF NOT EXISTS idx_timezone_cache_updated_at ON timezone_cache(updated_at);

-- Pre-populate with critical locations for immediate performance
INSERT INTO timezone_cache (location, timezone) VALUES
-- European cities that are currently missing
('madrid', 'Europe/Madrid'),
('madrid, spain', 'Europe/Madrid'),
('mad', 'Europe/Madrid'),
('spain', 'Europe/Madrid'),
('barcelona', 'Europe/Madrid'),
('bcn', 'Europe/Madrid'),

('london', 'Europe/London'),
('lhr', 'Europe/London'),
('lgw', 'Europe/London'),

('paris', 'Europe/Paris'),
('cdg', 'Europe/Paris'),

('amsterdam', 'Europe/Amsterdam'),
('ams', 'Europe/Amsterdam'),

('frankfurt', 'Europe/Berlin'),
('fra', 'Europe/Berlin'),

('rome', 'Europe/Rome'),
('fco', 'Europe/Rome'),

('lisbon', 'Europe/Lisbon'),
('lis', 'Europe/Lisbon'),

-- US locations (already handled but good to cache)
('atlanta', 'America/New_York'),
('atl', 'America/New_York'),
('austin', 'America/Chicago'),
('aus', 'America/Chicago'),

-- PS facilities
('ps atl', 'America/New_York'),
('ps lax', 'America/Los_Angeles'),
('ps jfk', 'America/New_York'),
('ps ord', 'America/Chicago')

ON CONFLICT (location) DO UPDATE SET
  timezone = EXCLUDED.timezone,
  updated_at = NOW();