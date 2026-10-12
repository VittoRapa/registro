const fs = require('fs');
const path = require('path');
const EmbeddedPostgres = require('embedded-postgres').default;

const dbDir = path.resolve('./.postgres-data');

const pg = new EmbeddedPostgres({
  port: 5432,
  user: 'registro',
  password: 'registro',
  databaseDir: dbDir,
  persistent: true,
});

async function main() {
  console.log('🚀 Avvio embedded PostgreSQL 18 server su porta 5432...');
  if (!fs.existsSync(path.join(dbDir, 'PG_VERSION'))) {
    console.log('Inizializzazione cluster database...');
    await pg.initialise();
  }
  await pg.start();
  console.log('✅ PostgreSQL in ascolto su localhost:5432');

  try {
    await pg.createDatabase('registro');
    console.log('✅ Database "registro" pronto');
  } catch (err) {
    if (!err.message?.includes('already exists')) {
      console.log('Database status:', err.message);
    }
  }

  const shutdown = async () => {
    console.log('\n🛑 Arresto PostgreSQL in corso...');
    try {
      await pg.stop();
      console.log('✅ PostgreSQL arrestato');
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep event loop alive
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('❌ Errore avvio PostgreSQL:', err);
  process.exit(1);
});
