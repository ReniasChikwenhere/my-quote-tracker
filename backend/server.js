/ backend/server.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { initDb, getDb } = require('./database');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file
const session = require('express-session'); // NEW: Import express-session

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration - for production, you might remove 'origin' if serving from same domain,
// or set it to your specific frontend domain.
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'YOUR_PRODUCTION_FRONTEND_URL' : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// NEW: Session Middleware
// IMPORTANT: For production, ensure 'secret' is a long, random string stored in an environment variable.
// 'secure: true' should be used if your production site uses HTTPS.
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_strong_random_secret_key_for_production_only_change_me', // !!! CHANGE THIS IN PRODUCTION !!!
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // Set secure to true for HTTPS in production, add maxAge
}));


// Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your_app_password'
    }
});

// Initialize the database before starting the server
initDb().then(() => {
    const db = getDb();

    // --- User Authentication Routes ---
    app.post('/api/create-user', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }
        try {
            db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
                if (err) {
                    console.error('Error checking user existence:', err.message);
                    return res.status(500).json({ message: 'Database error.' });
                }
                if (row) {
                    return res.status(409).json({ message: 'User already exists.' });
                }
                const saltRounds = 10;
                const password_hash = await bcrypt.hash(password, saltRounds);
                db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [username, password_hash], function(insertErr) {
                    if (insertErr) {
                        console.error('Error inserting user:', insertErr.message);
                        return res.status(500).json({ message: 'Failed to create user.' });
                    }
                    const newUserId = this.lastID;
                    console.log(`User created with ID: ${newUserId}`);
                    db.run(`INSERT INTO user_settings (user_id, phonetic_name, email_for_notifications,
                            currency_symbol, date_format, dark_mode_enabled, desktop_notifications_enabled,
                            sound_effects_enabled, phone_number_for_notifications)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [newUserId, 'Renias', `${username}@example.com`, 'R', 'YYYY-MM-DD', 0, 0, 1, ""],
                        function(settingsErr) {
                            if (settingsErr) {
                                console.error('Error inserting default user settings:', settingsErr.message);
                            } else {
                                console.log(`Default settings created for user ID: ${newUserId}`);
                            }
                            req.session.userId = newUserId; // Set session for the newly created user
                            res.status(201).json({ message: 'User created successfully!', id: newUserId });
                        }
                    );
                });
            });
        } catch (hashError) {
            console.error('Error hashing password:', hashError);
            res.status(500).json({ message: 'Internal server error during password hashing.' });
        }
    });

    app.post('/api/login', (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }
        db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
            if (err) {
                console.error('Error fetching user:', err.message);
                return res.status(500).json({ message: 'Database error.' });
            }
            if (!user) {
                return res.status(401).json({ message: 'Invalid username or password.' });
            }
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                req.session.userId = user.id;
                res.status(200).json({ message: 'Login successful!', user: { id: user.id, username: user.username } });
            } else {
                res.status(401).json({ message: 'Invalid username or password.' });
            }
        });
    });

    app.post('/api/demo_login', (req, res) => {
        db.get("SELECT * FROM users WHERE id = 1", [], async (err, user) => {
            if (err) {
                console.error('Error checking demo user existence:', err.message);
                return res.status(500).json({ message: 'Database error.' });
            }
            if (!user) {
                db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", ['demo', await bcrypt.hash('demo', 10)], function(insertErr) {
                    if (insertErr) {
                        console.error('Error inserting demo user:', insertErr.message);
                        return res.status(500).json({ message: 'Failed to create demo user.' });
                    }
                    const demoUserId = this.lastID;
                    db.run(`INSERT INTO user_settings (user_id, phonetic_name, email_for_notifications,
                            currency_symbol, date_format, dark_mode_enabled, desktop_notifications_enabled,
                            sound_effects_enabled, phone_number_for_notifications)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [demoUserId, 'Demo User', 'demo@example.com', 'R', 'YYYY-MM-DD', 1, 0, 1, ""],
                        function(settingsErr) {
                            if (settingsErr) {
                                console.error('Error inserting default demo user settings:', settingsErr.message);
                            }
                            req.session.userId = demoUserId;
                            res.status(200).json({ message: 'Logged in as Demo User', user: { id: demoUserId, username: 'demo' } });
                        }
                    );
                });
            } else {
                req.session.userId = user.id;
                res.status(200).json({ message: 'Logged in as Demo User', user: { id: user.id, username: user.username } });
            }
        });
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err.message);
                return res.status(500).json({ message: 'Failed to log out.' });
            }
            res.status(200).json({ message: 'Logged out successfully!' });
        });
    });

    app.get('/api/check_auth', (req, res) => {
        if (req.session && req.session.userId) {
            db.get("SELECT id, username FROM users WHERE id = ?", [req.session.userId], (err, user) => {
                if (err) {
                    console.error('Error checking auth user:', err.message);
                    return res.status(500).json({ message: 'Database error during auth check.' });
                }
                if (user) {
                    return res.status(200).json({ isLoggedIn: true, user: { id: user.id, username: user.username } });
                } else {
                    req.session.destroy(() => {});
                    return res.status(200).json({ isLoggedIn: false });
                }
            });
        } else {
            res.status(200).json({ isLoggedIn: false });
        }
    });

    function isAuthenticated(req, res, next) {
        if (req.session && req.session.userId) {
            next();
        } else {
            res.status(401).json({ message: 'Unauthorized: Please log in.' });
        }
    }

    // --- Client API Routes ---
    app.post('/api/clients', isAuthenticated, (req, res) => {
        const { name, email, phone, company, notes } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and Email are required.' });
        }
        const stmt = db.prepare("INSERT INTO clients (name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?)");
        stmt.run(name, email, phone, company, notes, function(err) {
            if (err) {
                console.error('Error adding client:', err.message);
                return res.status(500).json({ message: 'Failed to add client.', error: err.message });
            }
            res.status(201).json({ message: 'Client added successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/clients', isAuthenticated, (req, res) => {
        db.all("SELECT * FROM clients", [], (err, rows) => {
            if (err) {
                console.error('Error fetching clients:', err.message);
                return res.status(500).json({ message: 'Failed to fetch clients.', error: err.message });
            }
            res.status(200).json(rows);
        });
    });

    app.put('/api/clients/:id', isAuthenticated, (req, res) => {
        const clientId = parseInt(req.params.id);
        const { name, email, phone, company, notes } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and Email are required.' });
        }
        const stmt = db.prepare("UPDATE clients SET name = ?, email = ?, phone = ?, company = ?, notes = ? WHERE id = ?");
        stmt.run(name, email, phone, company, notes, clientId, function(err) {
            if (err) {
                console.error('Error updating client:', err.message);
                return res.status(500).json({ message: 'Failed to update client.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Client not found or no changes made.' });
            }
            res.status(200).json({ message: 'Client updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/clients/:id', isAuthenticated, (req, res) => {
        const clientId = parseInt(req.params.id);
        db.run("DELETE FROM clients WHERE id = ?", clientId, function(err) {
            if (err) {
                console.error('Error deleting client:', err.message);
                return res.status(500).json({ message: 'Failed to delete client.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Client not found.' });
            }
            res.status(200).json({ message: 'Client deleted successfully!' });
        });
    });

    // --- Services API Routes ---
    app.post('/api/services', isAuthenticated, (req, res) => {
        const { name, description, price, unit } = req.body;
        if (!name || !price || !unit) {
            return res.status(400).json({ message: 'Name, Price, and Unit are required for a service.' });
        }
        const stmt = db.prepare("INSERT INTO services (name, description, price, unit) VALUES (?, ?, ?, ?)");
        stmt.run(name, description, price, unit, function(err) {
            if (err) {
                console.error('Error adding service:', err.message);
                if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: services.name')) {
                    return res.status(409).json({ message: 'Service with this name already exists.' });
                }
                return res.status(500).json({ message: 'Failed to add service.', error: err.message });
            }
            res.status(201).json({ message: 'Service added successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/services', isAuthenticated, (req, res) => {
        db.all("SELECT * FROM services", [], (err, rows) => {
            if (err) {
                console.error('Error fetching services:', err.message);
                return res.status(500).json({ message: 'Failed to fetch services.', error: err.message });
            }
            res.status(200).json(rows);
        });
    });

    app.put('/api/services/:id', isAuthenticated, (req, res) => {
        const serviceId = parseInt(req.params.id);
        const { name, description, price, unit } = req.body;
        if (!name || !price || !unit) {
            return res.status(400).json({ message: 'Name, Price, and Unit are required for a service update.' });
        }
        const stmt = db.prepare("UPDATE services SET name = ?, description = ?, price = ?, unit = ? WHERE id = ?");
        stmt.run(name, description, price, unit, serviceId, function(err) {
            if (err) {
                console.error('Error updating service:', err.message);
                if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: services.name')) {
                    return res.status(409).json({ message: 'Service with this name already exists.' });
                }
                return res.status(500).json({ message: 'Failed to update service.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Service not found or no changes made.' });
            }
            res.status(200).json({ message: 'Service updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/services/:id', isAuthenticated, (req, res) => {
        const serviceId = parseInt(req.params.id);
        db.run("DELETE FROM services WHERE id = ?", serviceId, function(err) {
            if (err) {
                console.error('Error deleting service:', err.message);
                return res.status(500).json({ message: 'Failed to delete service.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Service not found.' });
            }
            res.status(200).json({ message: 'Service deleted successfully!' });
        });
    });

    // --- Quotes API Routes ---
    app.post('/api/quotes', isAuthenticated, (req, res) => {
        const { client_id, quote_date, status, total_amount, notes, quote_items } = req.body;
        if (!client_id || !quote_date || !status || total_amount === undefined || !quote_items) {
            return res.status(400).json({ message: 'Missing required quote fields.' });
        }
        let itemsJson;
        try {
            itemsJson = JSON.stringify(quote_items);
        } catch (e) {
            return res.status(400).json({ message: 'quote_items must be a valid JSON array/object.' });
        }
        const stmt = db.prepare("INSERT INTO quotes (client_id, quote_date, status, total_amount, notes, quote_items) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run(client_id, quote_date, status, total_amount, notes, itemsJson, function(err) {
            if (err) {
                console.error('Error adding quote:', err.message);
                return res.status(500).json({ message: 'Failed to add quote.', error: err.message });
            }
            res.status(201).json({ message: 'Quote added successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/quotes', isAuthenticated, (req, res) => {
        const query = `
            SELECT
                q.id,
                q.client_id,
                c.name AS client_name,
                c.company AS client_company,
                q.quote_date,
                q.status,
                q.total_amount,
                q.notes,
                q.quote_items
            FROM quotes q
            LEFT JOIN clients c ON q.client_id = c.id
            ORDER BY q.quote_date DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching quotes:', err.message);
                return res.status(500).json({ message: 'Failed to fetch quotes.', error: err.message });
            }
            const quotesWithParsedItems = rows.map(row => ({
                ...row,
                quote_items: JSON.parse(row.quote_items)
            }));
            res.status(200).json(quotesWithParsedItems);
        });
    });

    app.put('/api/quotes/:id', isAuthenticated, (req, res) => {
        const quoteId = parseInt(req.params.id);
        const { client_id, quote_date, status, total_amount, notes, quote_items } = req.body;
        if (!client_id || !quote_date || !status || total_amount === undefined || !quote_items) {
            return res.status(400).json({ message: 'Missing required quote fields for update.' });
        }
        let itemsJson;
        try {
            itemsJson = JSON.stringify(quote_items);
        } catch (e) {
            return res.status(400).json({ message: 'quote_items must be a valid JSON array/object.' });
        }
        const stmt = db.prepare("UPDATE quotes SET client_id = ?, quote_date = ?, status = ?, total_amount = ?, notes = ?, quote_items = ? WHERE id = ?");
        stmt.run(client_id, quote_date, status, total_amount, notes, itemsJson, quoteId, function(err) {
            if (err) {
                console.error('Error updating quote:', err.message);
                return res.status(500).json({ message: 'Failed to update quote.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Quote not found or no changes made.' });
            }
            res.status(200).json({ message: 'Quote updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/quotes/:id', isAuthenticated, (req, res) => {
        const quoteId = parseInt(req.params.id);
        db.run("DELETE FROM quotes WHERE id = ?", quoteId, function(err) {
            if (err) {
                console.error('Error deleting quote:', err.message);
                return res.status(500).json({ message: 'Failed to delete quote.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Quote not found.' });
            }
            res.status(200).json({ message: 'Quote deleted successfully!' });
        });
    });

    // --- Projects API Routes ---
    app.post('/api/projects', isAuthenticated, (req, res) => {
        const { client_id, project_name, description, start_date, end_date, status, notes } = req.body;
        if (!project_name || !start_date || !status) {
            return res.status(400).json({ message: 'Project Name, Start Date, and Status are required.' });
        }
        const stmt = db.prepare("INSERT INTO projects (client_id, project_name, description, start_date, end_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");
        stmt.run(client_id, project_name, description, start_date, end_date, status, notes, function(err) {
            if (err) {
                console.error('Error adding project:', err.message);
                return res.status(500).json({ message: 'Failed to add project.', error: err.message });
            }
            res.status(201).json({ message: 'Project added successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/projects', isAuthenticated, (req, res) => {
        const query = `
            SELECT
                p.id,
                p.client_id,
                c.name AS client_name,
                c.company AS client_company,
                p.project_name,
                p.description,
                p.start_date,
                p.end_date,
                p.status,
                p.notes
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY p.start_date DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching projects:', err.message);
                return res.status(500).json({ message: 'Failed to fetch projects.', error: err.message });
            }
            res.status(200).json(rows);
        });
    });

    app.put('/api/projects/:id', isAuthenticated, (req, res) => {
        const projectId = parseInt(req.params.id);
        const { client_id, project_name, description, start_date, end_date, status, notes } = req.body;
        if (!project_name || !start_date || !status) {
            return res.status(400).json({ message: 'Project Name, Start Date, and Status are required for update.' });
        }
        const stmt = db.prepare("UPDATE projects SET client_id = ?, project_name = ?, description = ?, start_date = ?, end_date = ?, status = ?, notes = ? WHERE id = ?");
        stmt.run(client_id, project_name, description, start_date, end_date, status, notes, projectId, function(err) {
            if (err) {
                console.error('Error updating project:', err.message);
                return res.status(500).json({ message: 'Failed to update project.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Project not found or no changes made.' });
            }
            res.status(200).json({ message: 'Project updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/projects/:id', isAuthenticated, (req, res) => {
        const projectId = parseInt(req.params.id);
        db.run("DELETE FROM projects WHERE id = ?", projectId, function(err) {
            if (err) {
                console.error('Error deleting project:', err.message);
                return res.status(500).json({ message: 'Failed to delete project.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Project not found.' });
            }
            res.status(200).json({ message: 'Project deleted successfully!' });
        });
    });

    // --- User Settings API Routes ---
    app.get('/api/settings/:userId', isAuthenticated, (req, res) => {
        const userId = parseInt(req.params.userId);
        db.get("SELECT * FROM user_settings WHERE user_id = ?", [userId], (err, row) => {
            if (err) {
                console.error('Error fetching user settings:', err.message);
                return res.status(500).json({ message: 'Failed to fetch settings.', error: err.message });
            }
            if (!row) {
                return res.status(404).json({ message: 'Settings not found for this user.' });
            }
            res.status(200).json(row);
        });
    });

    app.put('/api/settings/:userId', isAuthenticated, (req, res) => {
        const userId = parseInt(req.params.userId);
        const { phonetic_name, email_for_notifications, currency_symbol, date_format,
            dark_mode_enabled, desktop_notifications_enabled, sound_effects_enabled,
            phone_number_for_notifications } = req.body;

        if (phonetic_name === undefined || email_for_notifications === undefined ||
            currency_symbol === undefined || date_format === undefined || dark_mode_enabled === undefined ||
            desktop_notifications_enabled === undefined || sound_effects_enabled === undefined ||
            phone_number_for_notifications === undefined) {
            return res.status(400).json({ message: 'Missing one or more required setting fields.' });
        }

        const stmt = db.prepare(`UPDATE user_settings SET
            phonetic_name = ?,
            email_for_notifications = ?,
            currency_symbol = ?,
            date_format = ?,
            dark_mode_enabled = ?,
            desktop_notifications_enabled = ?,
            sound_effects_enabled = ?,
            phone_number_for_notifications = ?
            WHERE user_id = ?`);
        stmt.run(
            phonetic_name,
            email_for_notifications,
            currency_symbol,
            date_format,
            dark_mode_enabled ? 1 : 0,
            desktop_notifications_enabled ? 1 : 0,
            sound_effects_enabled ? 1 : 0,
            phone_number_for_notifications,
            userId,
            function(err) {
                if (err) {
                    console.error('Error updating user settings:', err.message);
                    return res.status(500).json({ message: 'Failed to update settings.', error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'User settings not found or no changes made.' });
                }
                res.status(200).json({ message: 'Settings updated successfully!' });
            }
        );
        stmt.finalize();
    });

    app.post('/api/send-test-project-reminder/:userId', isAuthenticated, async (req, res) => {
        const userId = parseInt(req.params.userId);
        try {
            db.get("SELECT email_for_notifications, phonetic_name FROM user_settings WHERE user_id = ?", [userId], async (err, settings) => {
                if (err) {
                    console.error('Error fetching user settings for test reminder:', err.message);
                    return res.status(500).json({ message: 'Failed to retrieve user settings.' });
                }
                if (!settings || !settings.email_for_notifications) {
                    return res.status(400).json({ message: 'Notification email not set in settings.' });
                }

                const testProject = {
                    project_name: "Test Project Reminder",
                    end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    client_name: "Syntech Software Internal"
                };

                const mailOptions = {
                    from: process.env.EMAIL_USER || 'your_email@gmail.com',
                    to: settings.email_for_notifications,
                    subject: `[Syntech Software] Reminder: Project Due Soon!`,
                    html: `
                        <p>Hello ${settings.phonetic_name || 'User'},</p>
                        <p>This is a test reminder from your Syntech Software application.</p>
                        <p>Project <strong>"${testProject.project_name}"</strong> for client
                        <strong>${testProject.client_name}</strong> is due on
                        <strong>${testProject.end_date}</strong> (in 5 days).</p>
                        <p>Please review its status.</p>
                        <p>Best regards,<br>Your Syntech Software App</p>
                    `
                };

                if (transporter.options.auth.user === "your_email@gmail.com" || transporter.options.auth.pass === "your_app_password") {
                    console.log(`--- SIMULATING EMAIL SENDING ---`);
                    console.log(`TO: ${settings.email_for_notifications}`);
                    console.log(`SUBJECT: ${mailOptions.subject}`);
                    console.log(`BODY: (HTML content as above)`);
                    console.log(`----------------------------------`);
                    return res.status(200).json({ message: `Test project reminder email simulated successfully to ${settings.email_for_notifications}. (SMTP not configured)` });
                }

                try {
                    await transporter.sendMail(mailOptions);
                    res.status(200).json({ message: `Test reminder sent to ${settings.email_for_notifications}!` });
                } catch (emailError) {
                    console.error('Error sending actual email:', emailError);
                    res.status(500).json({ message: 'Failed to send test reminder email. Check backend logs for Nodemailer errors (e.g., invalid credentials).' });
                }
            });
        } catch (error) {
            console.error('Error in send-test-project-reminder route:', error);
            res.status(500).json({ message: 'An unexpected error occurred while processing the reminder request.' });
        }
    });

    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily project reminder check...');
        const today = new Date();
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(today.getDate() + 5);
        const targetDate = fiveDaysFromNow.toISOString().split('T')[0];

        db.all(`
            SELECT p.project_name, p.end_date, c.name AS client_name, us.email_for_notifications,
                   us.phonetic_name, us.desktop_notifications_enabled
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            JOIN users u ON u.id = (SELECT user_id FROM user_settings WHERE user_id = 1)
            LEFT JOIN user_settings us ON u.id = us.user_id
            WHERE p.end_date = ? AND p.status != 'Completed' AND p.status != 'Cancelled'
        `, [targetDate], async (err, projectsToRemind) => {
            if (err) {
                console.error('Error fetching projects for reminder:', err.message);
                return;
            }

            if (projectsToRemind.length > 0) {
                console.log(`Found ${projectsToRemind.length} projects due in 5 days.`);
                for (const project of projectsToRemind) {
                    if (project.email_for_notifications) {
                        const mailOptions = {
                            from: process.env.EMAIL_USER || 'your_email@gmail.com',
                            to: project.email_for_notifications,
                            subject: `[Syntech Software] Project Due Soon: ${project.project_name}`,
                            html: `
                                <p>Hello ${project.phonetic_name || 'User'},</p>
                                <p>Just a friendly reminder from your Syntech Software application:</p>
                                <p>Project <strong>"${project.project_name}"</strong> for client
                                <strong>${project.client_name || 'Internal'}</strong> is due on
                                <strong>${project.end_date}</strong>.</p>
                                <p>This is 5 days from now. Please review its status and ensure everything is on track!</p>
                                <p>Best regards,<br>Your Syntech Software App</p>
                            `
                        };
                        if (transporter.options.auth.user === "your_email@gmail.com" || transporter.options.auth.pass === "your_app_password") {
                            console.log(`--- SIMULATING CRON EMAIL SENDING ---`);
                            console.log(`TO: ${project.email_for_notifications}`);
                            console.log(`SUBJECT: ${mailOptions.subject}`);
                            console.log(`BODY: (HTML content as above)`);
                            console.log(`----------------------------------`);
                        } else {
                            try {
                                await transporter.sendMail(mailOptions);
                                console.log(`Reminder email sent for project "${project.project_name}" to ${project.email_for_notifications}`);
                            } catch (emailError) {
                                console.error(`Failed to send reminder email for project "${project.project_name}":`, emailError);
                            }
                        }
                    } else {
                        console.log(`No notification email set for user for project "${project.project_name}".`);
                    }
                }
            } else {
                console.log('No projects found due in 5 days.');
            }
        });
    }, {
        scheduled: true,
        timezone: "Africa/Johannesburg"
    });

    // --- Invoices API Routes ---
    app.post('/api/invoices', isAuthenticated, (req, res) => {
        const { client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, invoice_items } = req.body;
        if (!client_id || !invoice_date || !due_date || !status || total_amount === undefined || !invoice_items) {
            return res.status(400).json({ message: 'Missing required invoice fields (client_id, invoice_date, due_date, status, total_amount, invoice_items).' });
        }
        let itemsJson;
        try {
            itemsJson = JSON.stringify(invoice_items);
        } catch (e) {
            return res.status(400).json({ message: 'invoice_items must be a valid JSON array/object.' });
        }
        const stmt = db.prepare("INSERT INTO invoices (client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, invoice_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, itemsJson, function(err) {
            if (err) {
                console.error('Error adding invoice:', err.message);
                return res.status(500).json({ message: 'Failed to add invoice.', error: err.message });
            }
            res.status(201).json({ message: 'Invoice added successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/invoices', isAuthenticated, (req, res) => {
        const query = `
            SELECT
                i.id,
                i.client_id,
                c.name AS client_name,
                c.company AS client_company,
                i.quote_id,
                i.project_id,
                p.project_name,
                q.quote_date,
                i.invoice_date,
                i.due_date,
                i.status,
                i.total_amount,
                i.notes,
                i.invoice_items
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN quotes q ON i.quote_id = q.id
            LEFT JOIN projects p ON i.project_id = p.id
            ORDER BY i.invoice_date DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching invoices:', err.message);
                return res.status(500).json({ message: 'Failed to fetch invoices.', error: err.message });
            }
            const invoicesWithParsedItems = rows.map(row => ({
                ...row,
                invoice_items: JSON.parse(row.invoice_items)
            }));
            res.status(200).json(invoicesWithParsedItems);
        });
    });

    app.put('/api/invoices/:id', isAuthenticated, (req, res) => {
        const invoiceId = parseInt(req.params.id);
        const { client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, invoice_items } = req.body;
        if (!client_id || !invoice_date || !due_date || !status || total_amount === undefined || !invoice_items) {
            return res.status(400).json({ message: 'Missing required invoice fields for update.' });
        }
        let itemsJson;
        try {
            itemsJson = JSON.stringify(invoice_items);
        } catch (e) {
            return res.status(400).json({ message: 'invoice_items must be a valid JSON array/object.' });
        }
        const stmt = db.prepare("UPDATE invoices SET client_id = ?, quote_id = ?, project_id = ?, invoice_date = ?, due_date = ?, status = ?, total_amount = ?, notes = ?, invoice_items = ? WHERE id = ?");
        stmt.run(client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, itemsJson, invoiceId, function(err) {
            if (err) {
                console.error('Error updating invoice:', err.message);
                return res.status(500).json({ message: 'Failed to update invoice.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Invoice not found or no changes made.' });
            }
            res.status(200).json({ message: 'Invoice updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/invoices/:id', isAuthenticated, (req, res) => {
        const invoiceId = parseInt(req.params.id);
        db.run("DELETE FROM invoices WHERE id = ?", invoiceId, function(err) {
            if (err) {
                console.error('Error deleting invoice:', err.message);
                return res.status(500).json({ message: 'Failed to delete invoice.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Invoice not found.' });
            }
            res.status(200).json({ message: 'Invoice deleted successfully!' });
        });
    });

    // --- NEW: Task API Routes ---
    app.post('/api/tasks', isAuthenticated, (req, res) => {
        const { project_id, name, category, due_date, status, priority, progress } = req.body;
        if (!project_id || !name || !due_date || !status || !priority) {
            return res.status(400).json({ message: 'Project ID, Name, Due Date, Status, and Priority are required for a task.' });
        }
        const stmt = db.prepare("INSERT INTO tasks (project_id, name, category, due_date, status, priority, progress) VALUES (?, ?, ?, ?, ?, ?, ?)");
        stmt.run(project_id, name, category, due_date, status, priority, progress, function(err) {
            if (err) {
                console.error('Error adding task:', err.message);
                return res.status(500).json({ message: 'Failed to add task.', error: err.message });
            }
            res.status(201).json({ message: 'Task added successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/tasks', isAuthenticated, (req, res) => {
        const query = `
            SELECT
                t.id,
                t.project_id,
                p.project_name,
                c.name AS client_name,
                t.name,
                t.category,
                t.due_date,
                t.status,
                t.priority,
                t.progress
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY t.due_date ASC
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching tasks:', err.message);
                return res.status(500).json({ message: 'Failed to fetch tasks.', error: err.message });
            }
            res.status(200).json(rows);
        });
    });

    app.put('/api/tasks/:id', isAuthenticated, (req, res) => {
        const taskId = parseInt(req.params.id);
        const { project_id, name, category, due_date, status, priority, progress } = req.body;
        if (!project_id || !name || !due_date || !status || !priority) {
            return res.status(400).json({ message: 'Project ID, Name, Due Date, Status, and Priority are required for a task update.' });
        }
        const stmt = db.prepare("UPDATE tasks SET project_id = ?, name = ?, category = ?, due_date = ?, status = ?, priority = ?, progress = ? WHERE id = ?");
        stmt.run(project_id, name, category, due_date, status, priority, progress, taskId, function(err) {
            if (err) {
                console.error('Error updating task:', err.message);
                return res.status(500).json({ message: 'Failed to update task.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Task not found or no changes made.' });
            }
            res.status(200).json({ message: 'Task updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/tasks/:id', isAuthenticated, (req, res) => {
        const taskId = parseInt(req.params.id);
        db.run("DELETE FROM tasks WHERE id = ?", taskId, function(err) {
            if (err) {
                console.error('Error deleting task:', err.message);
                return res.status(500).json({ message: 'Failed to delete task.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Task not found.' });
            }
            res.status(200).json({ message: 'Task deleted successfully!' });
        });
    });

    // --- NEW: Bug API Routes ---
    app.post('/api/bugs', isAuthenticated, (req, res) => {
        const { project_id, name, severity, status, reported_date } = req.body;
        if (!project_id || !name || !severity || !status || !reported_date) {
            return res.status(400).json({ message: 'Project ID, Name, Severity, Status, and Reported Date are required for a bug.' });
        }
        const stmt = db.prepare("INSERT INTO bugs (project_id, name, severity, status, reported_date) VALUES (?, ?, ?, ?, ?)");
        stmt.run(project_id, name, severity, status, reported_date, function(err) {
            if (err) {
                console.error('Error adding bug:', err.message);
                return res.status(500).json({ message: 'Failed to add bug.', error: err.message });
            }
            res.status(201).json({ message: 'Bug reported successfully!', id: this.lastID });
        });
        stmt.finalize();
    });

    app.get('/api/bugs', isAuthenticated, (req, res) => {
        const query = `
            SELECT
                b.id,
                b.project_id,
                p.project_name,
                c.name AS client_name,
                b.name,
                b.severity,
                b.status,
                b.reported_date
            FROM bugs b
            LEFT JOIN projects p ON b.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY b.reported_date DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Error fetching bugs:', err.message);
                return res.status(500).json({ message: 'Failed to fetch bugs.', error: err.message });
            }
            res.status(200).json(rows);
        });
    });

    app.put('/api/bugs/:id', isAuthenticated, (req, res) => {
        const bugId = parseInt(req.params.id);
        const { project_id, name, severity, status, reported_date } = req.body;
        if (!project_id || !name || !severity || !status || !reported_date) {
            return res.status(400).json({ message: 'Project ID, Name, Severity, Status, and Reported Date are required for a bug update.' });
        }
        const stmt = db.prepare("UPDATE bugs SET project_id = ?, name = ?, severity = ?, status = ?, reported_date = ? WHERE id = ?");
        stmt.run(project_id, name, severity, status, reported_date, bugId, function(err) {
            if (err) {
                console.error('Error updating bug:', err.message);
                return res.status(500).json({ message: 'Failed to update bug.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Bug not found or no changes made.' });
            }
            res.status(200).json({ message: 'Bug updated successfully!' });
        });
        stmt.finalize();
    });

    app.delete('/api/bugs/:id', isAuthenticated, (req, res) => {
        const bugId = parseInt(req.params.id);
        db.run("DELETE FROM bugs WHERE id = ?", bugId, function(err) {
            if (err) {
                console.error('Error deleting bug:', err.message);
                return res.status(500).json({ message: 'Failed to delete bug.', error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Bug not found.' });
            }
            res.status(200).json({ message: 'Bug deleted successfully!' });
        });
    });

    // --- Serve React Frontend (Production Build) ---
    // Serve static files from the React build directory
    // This assumes your backend (server.js) is in 'backend/' and your React build is in 'frontend/build/'
    app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

    // For any other GET request, serve the React app's index.html
    // This allows React Router to handle client-side routing
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
    });

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

}).catch(err => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
});
