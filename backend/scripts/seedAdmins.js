require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/db');

const SQL = {
  createTable: `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  createIndex: `CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`,
  insert: `
    INSERT INTO admins (name, email, password_hash, role) VALUES
      ('Admin One', 'admin1@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'admin'),
      ('Admin Two', 'admin2@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'admin'),
      ('Admin Three', 'admin3@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'admin'),
      ('Admin Four', 'admin4@storelaunch.com', '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye', 'admin')
    ON CONFLICT (email) DO NOTHING;
  `,
};

async function seed() {
  try {
    await pool.query(SQL.createTable);
    await pool.query(SQL.createIndex);
    await pool.query(SQL.insert);
    console.log('Admins table created and 4 admin accounts seeded. Password for all: Admin123!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
