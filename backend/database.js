// backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let db;

/**
 * Initializes the database connection and creates tables if they don't exist.
 * It also ensures new columns are added for existing databases.
 */
function initDb() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
            } else {
                console.log('Connected to the SQLite database.');

                // Use a series of db.serialize() or nested db.run() calls
                // to ensure tables are created in order and columns are added.
                db.serialize(() => {
                    // Create clients table (existing)
                    db.run(`CREATE TABLE IF NOT EXISTS clients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT,
                        company TEXT,
                        notes TEXT
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating clients table:', err.message);
                            reject(err);
                        }
                        console.log('Clients table ensured.');
                    });

                    // Create users table (existing)
                    db.run(`CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating users table:', err.message);
                            reject(err);
                        }
                        console.log('Users table ensured.');
                    });

                    // Create services table (existing)
                    db.run(`CREATE TABLE IF NOT EXISTS services (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT,
                        price REAL NOT NULL,
                        unit TEXT NOT NULL -- e.g., 'fixed', 'per hour', 'per project'
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating services table:', err.message);
                            reject(err);
                        }
                        console.log('Services table ensured.');
                    });

                    // Create quotes table (existing)
                    db.run(`CREATE TABLE IF NOT EXISTS quotes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER NOT NULL,
                        quote_date TEXT NOT NULL,
                        status TEXT NOT NULL, -- e.g., 'Draft', 'Sent', 'Accepted', 'Rejected'
                        total_amount REAL NOT NULL,
                        notes TEXT,
                        quote_items TEXT NOT NULL, -- JSON string of items/services included
                        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating quotes table:', err.message);
                            reject(err);
                        }
                        console.log('Quotes table ensured.');
                    });

                    // Create projects table (existing)
                    db.run(`CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER, -- Can be NULL if project is internal/not client-specific
                        project_name TEXT NOT NULL,
                        description TEXT,
                        start_date TEXT NOT NULL,
                        end_date TEXT,
                        status TEXT NOT NULL, -- e.g., 'Planning', 'In Progress', 'On Hold', 'Completed'
                        notes TEXT,
                        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating projects table:', err.message);
                            reject(err);
                        }
                        console.log('Projects table ensured.');
                    });

                    // Create user_settings table (existing, but adding new column if it doesn't exist)
                    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
                        user_id INTEGER PRIMARY KEY,
                        phonetic_name TEXT,
                        email_for_notifications TEXT,
                        currency_symbol TEXT DEFAULT 'R',
                        date_format TEXT DEFAULT 'YYYY-MM-DD',
                        dark_mode_enabled INTEGER DEFAULT 0, -- 0 for false, 1 for true
                        desktop_notifications_enabled INTEGER DEFAULT 0,
                        sound_effects_enabled INTEGER DEFAULT 1,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating user_settings table:', err.message);
                            reject(err);
                        }
                        console.log('User settings table ensured.');

                        // NEW: Add phone_number_for_notifications column if it doesn't exist
                        db.run(`ALTER TABLE user_settings ADD COLUMN phone_number_for_notifications TEXT`, (alterErr) => {
                            if (alterErr && !alterErr.message.includes('duplicate column name')) {
                                console.error('Error adding phone_number_for_notifications column:', alterErr.message);
                                reject(alterErr);
                            } else {
                                console.log('phone_number_for_notifications column ensured in user_settings table.');
                            }
                        });
                    });

                    // NEW: Create invoices table
                    db.run(`CREATE TABLE IF NOT EXISTS invoices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER NOT NULL,
                        quote_id INTEGER, -- Optional: link to a quote
                        project_id INTEGER, -- Optional: link to a project
                        invoice_date TEXT NOT NULL,
                        due_date TEXT NOT NULL,
                        status TEXT NOT NULL, -- e.g., 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'
                        total_amount REAL NOT NULL,
                        notes TEXT,
                        invoice_items TEXT NOT NULL, -- JSON string of items/services included
                        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
                        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL,
                        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                    )`, (err) => {
                        if (err) {
                            console.error('Error creating invoices table:', err.message);
                            reject(err);
                        }
                        console.log('Invoices table ensured.');
                        resolve(db); // Resolve the promise once all tables/columns are ensured
                    });
                });
            }
        });
    });
}

/**
 * Get the database instance.
 * @returns {sqlite3.Database} The database instance.
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDb() first.');
    }
    return db;
}

module.exports = {
    initDb,
    getDb
};
