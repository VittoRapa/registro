const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://registro:registro@localhost:5432/registro';
const BACKUPS_DIR = path.resolve(process.env.BACKUPS_DIR || './backups');

async function main() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `backup_${timestamp}.json.gz`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);
  const manifestFilePath = path.join(BACKUPS_DIR, `backup_${timestamp}.manifest.json`);

  console.log(`[BACKUP] Connessione a PostgreSQL (${DATABASE_URL.replace(/:[^:@]+@/, ':****@')})...`);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Get all public tables excluding internal prisma migration if preferred, but include everything for total restore
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`[BACKUP] Trovate ${tables.length} tabelle in schema 'public'.`);

    const dumpData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      database: 'registro',
      tableCount: tables.length,
      tables: {},
      summary: {},
    };

    let totalRows = 0;

    for (const table of tables) {
      // Fetch columns
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC;
      `, [table]);

      // Fetch rows
      const rowsRes = await client.query(`SELECT * FROM "${table}"`);
      const rowCount = rowsRes.rows.length;
      totalRows += rowCount;

      dumpData.tables[table] = {
        columns: colRes.rows,
        rowCount: rowCount,
        data: rowsRes.rows,
      };

      dumpData.summary[table] = rowCount;
      console.log(`  - Tabella '${table}': ${rowCount} record estratti.`);
    }

    // 2. Fetch sequence values if any
    const seqRes = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public';
    `);
    dumpData.sequences = {};
    for (const seq of seqRes.rows) {
      try {
        const valRes = await client.query(`SELECT last_value FROM "${seq.sequence_name}"`);
        dumpData.sequences[seq.sequence_name] = valRes.rows[0]?.last_value;
      } catch (_) {}
    }

    // 3. Compress with gzip and calculate SHA-256
    console.log(`[BACKUP] Compressione gzip in corso...`);
    const jsonString = JSON.stringify(dumpData);
    const compressed = zlib.gzipSync(Buffer.from(jsonString, 'utf-8'), { level: 9 });

    fs.writeFileSync(backupFilePath, compressed);

    const hash = crypto.createHash('sha256').update(compressed).digest('hex');
    const sizeKb = (compressed.length / 1024).toFixed(2);

    const manifest = {
      backupFile: backupFileName,
      sizeBytes: compressed.length,
      sizeFormatted: `${sizeKb} KB`,
      sha256: hash,
      createdAt: dumpData.createdAt,
      totalTables: tables.length,
      totalRows: totalRows,
      tablesSummary: dumpData.summary,
    };

    fs.writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 2));

    console.log(`\n========================================`);
    console.log(`✅ BACKUP COMPLETATO CON SUCCESSO`);
    console.log(`📁 File: ${backupFilePath}`);
    console.log(`📋 Manifest: ${manifestFilePath}`);
    console.log(`📦 Dimensione compressa: ${sizeKb} KB`);
    console.log(`🔒 SHA-256: ${hash}`);
    console.log(`📊 Totale record: ${totalRows} su ${tables.length} tabelle`);
    console.log(`========================================\n`);

    return backupFilePath;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Errore durante il backup:', err);
    process.exit(1);
  });
}

module.exports = { backup: main };
