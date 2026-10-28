-- D1 schema for the DNKa' sites (replaces the Supabase project).
-- Booleans are 0/1, timestamps ISO-8601 text, JSON as text; the Worker converts
-- them back to the same shapes the sites and the admin already expect.

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  placement TEXT NOT NULL DEFAULT 'hero',
  position INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  image_url_mobile TEXT,
  heading TEXT DEFAULT '', heading_en TEXT DEFAULT '', heading_uk TEXT DEFAULT '',
  description TEXT DEFAULT '', description_en TEXT DEFAULT '', description_uk TEXT DEFAULT '',
  button_text TEXT DEFAULT '', button_text_en TEXT DEFAULT '', button_text_uk TEXT DEFAULT '',
  button_link TEXT DEFAULT '', button_link_en TEXT DEFAULT '', button_link_uk TEXT DEFAULT '',
  button_text_color TEXT DEFAULT '#000000',
  button_bg_color TEXT DEFAULT '#ffffff',
  active INTEGER DEFAULT 1, active_en INTEGER DEFAULT 1, active_uk INTEGER DEFAULT 1,
  starts_at TEXT, ends_at TEXT,
  starts_at_en TEXT, ends_at_en TEXT,
  starts_at_uk TEXT, ends_at_uk TEXT,
  image_position_mobile INTEGER DEFAULT 50,
  image_position_mobile_x INTEGER DEFAULT 50,
  image_zoom_mobile INTEGER DEFAULT 100,
  button_position_mobile INTEGER,
  button_x_desktop INTEGER,
  button_y_desktop INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  name TEXT, country TEXT, country_code TEXT,
  city TEXT, city_pl TEXT,
  category TEXT, category_pl TEXT,
  description TEXT, description_pl TEXT,
  instagram TEXT, photo TEXT,
  sort INTEGER DEFAULT 100,
  active INTEGER DEFAULT 1,
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT, country TEXT, city TEXT, website TEXT, insta TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS partner_applications (
  id TEXT PRIMARY KEY,
  form_type TEXT, lang TEXT DEFAULT 'pl',
  company TEXT, location TEXT, phone TEXT, email TEXT, website TEXT,
  contact_person TEXT, comment TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT
);
