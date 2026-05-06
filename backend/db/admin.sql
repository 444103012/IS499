



CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

INSERT INTO admins (first_name, last_name, email, password_hash, status) VALUES
  ('Admin', 'One', 'admin1@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'Active'),
  ('Admin', 'Two', 'admin2@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'Active'),
  ('Admin', 'Three', 'admin3@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'Active'),
  ('Admin', 'Four', 'admin4@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'Active')
ON CONFLICT (email) DO NOTHING;