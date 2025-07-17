// backend/database.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db'); // Use __dirname to ensure correct path

let db; // Database instance

/**
 * Initializes the database connection and creates tables if they don't exist.
 * It also ensures new columns are added for existing databases.
 * @returns {Promise<sqlite3.Database>} A promise that resolves with the database instance.
 */
function initDb() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            db.serialize(() => {
                // Create clients table
                db.run(`
                    CREATE TABLE IF NOT EXISTS clients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT,
                        company TEXT,
                        notes TEXT
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating clients table:', err.message);
                        return reject(err);
                    }
                    console.log('Clients table ensured.');
                });

                // Create users table
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL DEFAULT 'user'
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err.message);
                        return reject(err);
                    }
                    console.log('Users table ensured.');

                    // Insert default admin user if not exists
                    db.get("SELECT COUNT(*) AS count FROM users WHERE username = 'admin'", (err, row) => {
                        if (err) {
                            console.error('Error checking admin user:', err.message);
                            return reject(err);
                        }
                        if (row.count === 0) {
                            // In a real app, 'password123' should be bcrypt hashed
                            db.run("INSERT INTO users (username, password_hash, role) VALUES ('admin', 'password123', 'admin')", (err) => {
                                if (err) {
                                    console.error('Error inserting admin user:', err.message);
                                    return reject(err);
                                }
                                console.log('Default admin user created.');
                            });
                        }
                    });
                });

                // Create services table
                db.run(`
                    CREATE TABLE IF NOT EXISTS services (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        description TEXT,
                        price REAL NOT NULL,
                        unit TEXT NOT NULL -- e.g., 'fixed', 'per hour', 'per month'
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating services table:', err.message);
                        return reject(err);
                    }
                    console.log('Services table ensured.');
                });

                // Create quotes table
                db.run(`
                    CREATE TABLE IF NOT EXISTS quotes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_id INTEGER NOT NULL,
                        quote_date TEXT NOT NULL,
                        status TEXT NOT NULL, -- e.g., 'Draft', 'Sent', 'Accepted', 'Rejected'
                        total_amount REAL NOT NULL,
                        notes TEXT,
                        quote_items TEXT NOT NULL, -- JSON string of items/services included
                        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating quotes table:', err.message);
                        return reject(err);
                    }
                    console.log('Quotes table ensured.');
                });

                // Create projects table
                db.run(`
                    CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_name TEXT NOT NULL,
                        client_id INTEGER NOT NULL,
                        description TEXT,
                        start_date TEXT NOT NULL,
                        end_date TEXT,
                        status TEXT NOT NULL, -- e.g., 'Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'
                        notes TEXT,
                        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating projects table:', err.message);
                        return reject(err);
                    }
                    console.log('Projects table ensured.');
                });

                // Create user_settings table (for notifications, etc.)
                db.run(`
                    CREATE TABLE IF NOT EXISTS user_settings (
                        user_id INTEGER PRIMARY KEY,
                        phonetic_name TEXT,
                        email_for_notifications TEXT,
                        currency_symbol TEXT DEFAULT 'R',
                        date_format TEXT DEFAULT 'YYYY-MM-DD',
                        desktop_notifications_enabled INTEGER DEFAULT 0,
                        sound_effects_enabled INTEGER DEFAULT 1,
                        phone_number_for_notifications TEXT,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating user_settings table:', err.message);
                        return reject(err);
                    }
                    console.log('User settings table ensured.');

                    // Add phone_number_for_notifications column if it doesn't exist
                    db.run("ALTER TABLE user_settings ADD COLUMN phone_number_for_notifications TEXT", (alterErr) => {
                        if (alterErr && !alterErr.message.includes('duplicate column name')) {
                            console.error('Error adding phone_number_for_notifications column:', alterErr.message);
                            return reject(alterErr);
                        } else {
                            console.log('phone_number_for_notifications column ensured in user_settings table.');
                        }
                    });
                });

                // Create invoices table
                db.run(`
                    CREATE TABLE IF NOT EXISTS invoices (
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
                        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
                        FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE SET NULL,
                        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating invoices table:', err.message);
                        return reject(err);
                    }
                    console.log('Invoices table ensured.');
                });

                // Create tasks table
                db.run(`
                    CREATE TABLE IF NOT EXISTS tasks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        category TEXT,
                        due_date TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'Pending', -- e.g., 'Pending', 'In Progress', 'Completed', 'Blocked'
                        priority TEXT NOT NULL DEFAULT 'Medium', -- e.g., 'Low', 'Medium', 'High'
                        progress INTEGER DEFAULT 0, -- Percentage 0-100
                        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating tasks table:', err.message);
                        return reject(err);
                    }
                    console.log('Tasks table ensured.');
                });

                // Create bugs table
                db.run(`
                    CREATE TABLE IF NOT EXISTS bugs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'Medium', -- e.g., 'Low', 'Medium', 'High', 'Critical'
                        status TEXT NOT NULL DEFAULT 'Open', -- e.g., 'Open', 'In Progress', 'Closed'
                        reported_date TEXT NOT NULL,
                        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating bugs table:', err.message);
                        return reject(err);
                    }
                    console.log('Bugs table ensured.');
                });

                // Resolve the promise once all table creations/alterations are attempted
                resolve(db);
            });
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

module.exports = { initDb, getDb };
