const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://registro:registro@localhost:5432/registro';
const BACKUPS_DIR = path.resolve(process.env.BACKUPS_DIR || './backups');

function findLatestBackup() {
  if (!fs.existsSync(BACKUPS_DIR)) return null;
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json.gz'))
    .sort()
    .reverse();
  return files.length > 0 ? path.join(BACKUPS_DIR, files[0]) : null;
}

async function restore(backupFilePath) {
  let targetPath = backupFilePath;
  if (!targetPath) {
    targetPath = findLatestBackup();
    if (!targetPath) {
      throw new Error(`Nessun file di backup trovato nella cartella ${BACKUPS_DIR}`);
    }
    console.log(`[RESTORE] Nessun file specificato: utilizzo l'ultimo backup disponibile: ${path.basename(targetPath)}`);
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`File di backup non trovato: ${targetPath}`);
  }

  console.log(`[RESTORE] Lettura e de-compressione di ${targetPath}...`);
  const compressedBuffer = fs.readFileSync(targetPath);

  // Check manifest if available
  const manifestPath = targetPath.replace('.json.gz', '.manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const actualHash = crypto.createHash('sha256').update(compressedBuffer).digest('hex');
      if (manifest.sha256 && manifest.sha256 !== actualHash) {
        throw new Error(`Integrità compromessa! Hash calcolato (${actualHash}) non corrisponde a manifest (${manifest.sha256})`);
      }
      console.log(`[RESTORE] ✅ Integrità SHA-256 verificata con successo (${actualHash.slice(0, 16)}...)`);
    } catch (e) {
      if (e.message.includes('Integrità compromessa')) throw e;
      console.warn(`[RESTORE] Avviso: Impossibile validare il manifest:`, e.message);
    }
  }

  const decompressedBuffer = zlib.gunzipSync(compressedBuffer);
  const dump = JSON.parse(decompressedBuffer.toString('utf-8'));

  console.log(`[RESTORE] Dump generato il: ${dump.createdAt}`);
  console.log(`[RESTORE] Connessione a PostgreSQL (${DATABASE_URL.replace(/:[^:@]+@/, ':****@')})...`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Temporarily disable foreign key constraints to allow clean truncate and batch insertion
    await client.query("SET session_replication_role = 'replica';");

    const tableNames = Object.keys(dump.tables);
    console.log(`[RESTORE] Ripristino di ${tableNames.length} tabelle...`);

    // Truncate tables first
    for (const table of tableNames) {
      try {
        await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (err) {
        console.warn(`  - Avviso truncate ${table}:`, err.message);
      }
    }

    let restoredRecords = 0;

    // Restore table records
    for (const table of tableNames) {
      const { columns, data } = dump.tables[table];
      if (!data || data.length === 0) continue;

      const colNames = columns.map(c => c.column_name);
      const colsClause = colNames.map(c => `"${c}"`).join(', ');

      for (const row of data) {
        const values = colNames.map(c => {
          const val = row[c];
          // Preserve proper types for PG JSON/JSONB
          if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO "${table}" (${colsClause}) VALUES (${placeholders});`;
        await client.query(query, values);
        restoredRecords++;
      }

      console.log(`  - Tabella '${table}': ${data.length} record ripristinati.`);
    }

    // Restore sequences
    if (dump.sequences) {
      for (const [seqName, lastVal] of Object.entries(dump.sequences)) {
        if (lastVal !== null && lastVal !== undefined) {
          try {
            await client.query(`SELECT setval('"${seqName}"', $1, true);`, [lastVal]);
          } catch (_) {}
        }
      }
    }

    // Re-enable triggers and FK constraints
    await client.query("SET session_replication_role = 'origin';");

    console.log(`\n========================================`);
    console.log(`✅ RESTORE COMPLETATO CON SUCCESSO`);
    console.log(`📁 Origine: ${targetPath}`);
    console.log(`📊 Record ripristinati: ${restoredRecords} in ${tableNames.length} tabelle`);
    console.log(`========================================\n`);
  } catch (err) {
    // Attempt to reset replication role in case of error
    try {
      await client.query("SET session_replication_role = 'origin';");
    } catch (_) {}
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const targetFile = process.argv[2];
  restore(targetFile).catch((err) => {
    console.error('❌ Errore durante il restore:', err);
    process.exit(1);
  });
}

module.exports = { restore };
