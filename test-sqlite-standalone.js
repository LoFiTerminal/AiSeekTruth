// Test if SQLite works
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function testSQLite() {
  try {
    console.log('Testing SQLite...\n');

    const testDbPath = path.join(process.env.HOME, '.config', 'aiseektruth', 'test.db');
    console.log('Test DB path:', testDbPath);

    // Create database
    const db = new Database(testDbPath);
    console.log('✅ Database created');

    // Create a test table
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
    console.log('✅ Table created');

    // Insert data
    const insert = db.prepare('INSERT INTO test_table (name) VALUES (?)');
    insert.run('Test User');
    console.log('✅ Data inserted');

    // Query data
    const select = db.prepare('SELECT * FROM test_table');
    const rows = select.all();
    console.log('✅ Data queried:', rows);

    // Clean up
    db.close();
    fs.unlinkSync(testDbPath);
    console.log('✅ Database cleaned up');

    console.log('\n🎉 All SQLite tests passed!');
    console.log('Database is working correctly.\n');

  } catch (error) {
    console.error('❌ SQLite test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testSQLite();
