const HASH = '$2b$10$70AkFea2zetcuDGfyIJ8yeq3qQbUYR2xLaPKywHoQc6wXZDiBoxye';

const ADMIN_SEED_SQL = {
  createTable: `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `,
  createIndex: `CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`,
  insertFull: `
    INSERT INTO admins (first_name, last_name, email, password_hash, status) VALUES
      ('Admin', 'One', 'admin1@storelaunch.com', $1, 'Active'),
      ('Admin', 'Two', 'admin2@storelaunch.com', $1, 'Active'),
      ('Admin', 'Three', 'admin3@storelaunch.com', $1, 'Active'),
      ('Admin', 'Four', 'admin4@storelaunch.com', $1, 'Active')
    ON CONFLICT (email) DO NOTHING;
  `,
  insertMinimal: `
    INSERT INTO admins (email, password_hash) VALUES
      ('admin1@storelaunch.com', $1),
      ('admin2@storelaunch.com', $1),
      ('admin3@storelaunch.com', $1),
      ('admin4@storelaunch.com', $1)
    ON CONFLICT (email) DO NOTHING;
  `,
};

async function ensureAdminsTableAndSeed(pool) {
  if (!pool) return;
  try {
    await pool.query(ADMIN_SEED_SQL.createTable);
    await pool.query(ADMIN_SEED_SQL.createIndex);
  } catch (e) {
   
  }
  try {
    await pool.query(ADMIN_SEED_SQL.insertFull, [HASH]);
    console.log('Admin auth: table and default accounts ready (password: Admin123!)');
  } catch (err) {
    if (err.code === '42703' || err.message?.includes('first_name') || err.message?.includes('last_name') || err.message?.includes('status')) {
      try {
        await pool.query(ADMIN_SEED_SQL.insertMinimal, [HASH]);
        console.log('Admin auth: default accounts ready (password: Admin123!)');
      } catch (e2) {
        console.error('Admin seed failed:', e2.message);
      }
    } else {
      console.error('Admin seed failed:', err.message);
    }
  }
}

module.exports = { ensureAdminsTableAndSeed };
