// backend/server.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { initDb, getDb } = require('./database');
const nodemailer = require('nodemailer'); // NEW: Import Nodemailer
const cron = require('node-cron'); // NEW: Import node-cron
const path = require('path'); // NEW: Import path for date calculations
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from your React frontend (for local dev)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Ensure all needed methods are allowed
    allowedHeaders: ['Content-Type', 'Authorization'], // Add Authorization header for future use
    credentials: true // Allow cookies/session to be sent
}));
app.use(express.json());

// Nodemailer Transporter Setup
// IMPORTANT: For production, use environment variables for EMAIL_USER and EMAIL_PASS
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like 'outlook', or provide host/port for custom SMTP
    auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com', // Replace with your actual email or .env variable
        pass: process.env.EMAIL_PASS || 'your_app_password' // Replace with your actual app password or .env variable
    }
});

// Initialize database and start server
initDb().then(db => {
    console.log('Database initialized successfully.');

    // --- API Endpoints ---

    // Login (Simplified for demo)
    app.post('/api/login', async (req, res) => {
        const { username, password } = req.body;
        db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Database error during login.' });
            }
            if (!user) {
                return res.status(400).json({ message: 'Invalid username or password.' });
            }

            // In a real app, you would hash the password and compare:
            // const isMatch = await bcrypt.compare(password, user.password_hash);
            // For demo, we'll use a simple direct comparison (replace with bcrypt in production)
            if (password === user.password_hash) { // Using password_hash field for direct comparison in demo
                // In a real app, you'd generate a JWT or use sessions properly
                return res.status(200).json({ message: 'Login successful!', userId: user.id, username: user.username, role: user.role });
            } else {
                return res.status(400).json({ message: 'Invalid username or password.' });
            }
        });
    });

    // Clients API
    app.get('/api/clients', (req, res) => {
        db.all("SELECT * FROM clients", [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.json(rows);
        });
    });

    app.post('/api/clients', (req, res) => {
        const { name, email, phone, company, notes } = req.body;
        db.run("INSERT INTO clients (name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?)",
            [name, email, phone, company, notes],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Client added successfully!', id: this.lastID });
            });
    });

    app.put('/api/clients/:id', (req, res) => {
        const { name, email, phone, company, notes } = req.body;
        const clientId = req.params.id;
        db.run("UPDATE clients SET name = ?, email = ?, phone = ?, company = ?, notes = ? WHERE id = ?",
            [name, email, phone, company, notes, clientId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Client not found or no changes made.' });
                }
                res.status(200).json({ message: 'Client updated successfully!' });
            });
    });

    app.delete('/api/clients/:id', (req, res) => {
        const clientId = req.params.id;
        db.run("DELETE FROM clients WHERE id = ?", clientId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Client not found.' });
            }
            res.status(200).json({ message: 'Client deleted successfully!' });
        });
    });

    // Services API
    app.get('/api/services', (req, res) => {
        db.all("SELECT * FROM services", [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.json(rows);
        });
    });

    app.post('/api/services', (req, res) => {
        const { name, description, price, unit } = req.body;
        db.run("INSERT INTO services (name, description, price, unit) VALUES (?, ?, ?, ?)",
            [name, description, price, unit],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Service added successfully!', id: this.lastID });
            });
    });

    app.delete('/api/services/:id', (req, res) => {
        const serviceId = req.params.id;
        db.run("DELETE FROM services WHERE id = ?", serviceId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Service not found.' });
            }
            res.status(200).json({ message: 'Service deleted successfully!' });
        });
    });

    // Quotes API
    app.get('/api/quotes', (req, res) => {
        const query = `
            SELECT q.*, c.name AS client_name, c.company AS client_company
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            // Parse quote_items JSON string back to object
            const quotesWithParsedItems = rows.map(row => ({
                ...row,
                quote_items: JSON.parse(row.quote_items || '[]')
            }));
            res.json(quotesWithParsedItems);
        });
    });

    app.post('/api/quotes', (req, res) => {
        const { client_id, quote_date, status, total_amount, notes, quote_items } = req.body;
        // Stringify quote_items array to store as JSON string
        const quoteItemsString = JSON.stringify(quote_items);
        db.run("INSERT INTO quotes (client_id, quote_date, status, total_amount, notes, quote_items) VALUES (?, ?, ?, ?, ?, ?)",
            [client_id, quote_date, status, total_amount, notes, quoteItemsString],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Quote generated successfully!', id: this.lastID });
            });
    });

    app.put('/api/quotes/:id', (req, res) => {
        const { client_id, quote_date, status, total_amount, notes, quote_items } = req.body;
        const quoteId = req.params.id;
        const quoteItemsString = JSON.stringify(quote_items); // Stringify for update

        db.run("UPDATE quotes SET client_id = ?, quote_date = ?, status = ?, total_amount = ?, notes = ?, quote_items = ? WHERE id = ?",
            [client_id, quote_date, status, total_amount, notes, quoteItemsString, quoteId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Quote not found or no changes made.' });
                }
                res.status(200).json({ message: 'Quote updated successfully!' });
            });
    });

    app.delete('/api/quotes/:id', (req, res) => {
        const quoteId = req.params.id;
        db.run("DELETE FROM quotes WHERE id = ?", quoteId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Quote not found.' });
            }
            res.status(200).json({ message: 'Quote deleted successfully!' });
        });
    });

    // Projects API
    app.get('/api/projects', (req, res) => {
        const query = `
            SELECT p.*, c.name AS client_name, c.company AS client_company
            FROM projects p
            JOIN clients c ON p.client_id = c.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.json(rows);
        });
    });

    app.post('/api/projects', (req, res) => {
        const { project_name, client_id, description, start_date, end_date, status, notes } = req.body;
        db.run("INSERT INTO projects (project_name, client_id, description, start_date, end_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [project_name, client_id, description, start_date, end_date, status, notes],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Project added successfully!', id: this.lastID });
            });
    });

    app.put('/api/projects/:id', (req, res) => {
        const { project_name, client_id, description, start_date, end_date, status, notes } = req.body;
        const projectId = req.params.id;
        db.run("UPDATE projects SET project_name = ?, client_id = ?, description = ?, start_date = ?, end_date = ?, status = ?, notes = ? WHERE id = ?",
            [project_name, client_id, description, start_date, end_date, status, notes, projectId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Project not found or no changes made.' });
                }
                res.status(200).json({ message: 'Project updated successfully!' });
            });
    });

    app.delete('/api/projects/:id', (req, res) => {
        const projectId = req.params.id;
        db.run("DELETE FROM projects WHERE id = ?", projectId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Project not found.' });
            }
            res.status(200).json({ message: 'Project deleted successfully!' });
        });
    });

    // Invoices API (NEW)
    app.get('/api/invoices', (req, res) => {
        const query = `
            SELECT i.*, c.name AS client_name, c.company AS client_company,
                   q.quote_date AS quote_date, p.project_name AS project_name
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            LEFT JOIN quotes q ON i.quote_id = q.id
            LEFT JOIN projects p ON i.project_id = p.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            // Parse invoice_items JSON string back to object
            const invoicesWithParsedItems = rows.map(row => ({
                ...row,
                invoice_items: JSON.parse(row.invoice_items || '[]')
            }));
            res.json(invoicesWithParsedItems);
        });
    });

    app.post('/api/invoices', (req, res) => {
        const { client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, invoice_items } = req.body;
        const invoiceItemsString = JSON.stringify(invoice_items); // Stringify for storage

        db.run("INSERT INTO invoices (client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, invoice_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [client_id, quote_id || null, project_id || null, invoice_date, due_date, status, total_amount, notes, invoiceItemsString],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Invoice created successfully!', id: this.lastID });
            });
    });

    app.put('/api/invoices/:id', (req, res) => {
        const { client_id, quote_id, project_id, invoice_date, due_date, status, total_amount, notes, invoice_items } = req.body;
        const invoiceId = req.params.id;
        const invoiceItemsString = JSON.stringify(invoice_items); // Stringify for update

        db.run("UPDATE invoices SET client_id = ?, quote_id = ?, project_id = ?, invoice_date = ?, due_date = ?, status = ?, total_amount = ?, notes = ?, invoice_items = ? WHERE id = ?",
            [client_id, quote_id || null, project_id || null, invoice_date, due_date, status, total_amount, notes, invoiceItemsString, invoiceId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Invoice not found or no changes made.' });
                }
                res.status(200).json({ message: 'Invoice updated successfully!' });
            });
    });

    app.delete('/api/invoices/:id', (req, res) => {
        const invoiceId = req.params.id;
        db.run("DELETE FROM invoices WHERE id = ?", invoiceId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Invoice not found.' });
            }
            res.status(200).json({ message: 'Invoice deleted successfully!' });
        });
    });

    // Tasks API (NEW)
    app.get('/api/tasks', (req, res) => {
        const query = `
            SELECT t.*, p.project_name
            FROM tasks t
            LEFT JOIN projects p ON t.project_id = p.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.json(rows);
        });
    });

    app.post('/api/tasks', (req, res) => {
        const { project_id, name, category, due_date, status, priority, progress } = req.body;
        db.run("INSERT INTO tasks (project_id, name, category, due_date, status, priority, progress) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [project_id, name, category, due_date, status, priority, progress],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Task added successfully!', id: this.lastID });
            });
    });

    app.put('/api/tasks/:id', (req, res) => {
        const { project_id, name, category, due_date, status, priority, progress } = req.body;
        const taskId = req.params.id;
        db.run("UPDATE tasks SET project_id = ?, name = ?, category = ?, due_date = ?, status = ?, priority = ?, progress = ? WHERE id = ?",
            [project_id, name, category, due_date, status, priority, progress, taskId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Task not found or no changes made.' });
                }
                res.status(200).json({ message: 'Task updated successfully!' });
            });
    });

    app.delete('/api/tasks/:id', (req, res) => {
        const taskId = req.params.id;
        db.run("DELETE FROM tasks WHERE id = ?", taskId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Task not found.' });
            }
            res.status(200).json({ message: 'Task deleted successfully!' });
        });
    });

    // Bugs API (NEW)
    app.get('/api/bugs', (req, res) => {
        const query = `
            SELECT b.*, p.project_name
            FROM bugs b
            LEFT JOIN projects p ON b.project_id = p.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            res.json(rows);
        });
    });

    app.post('/api/bugs', (req, res) => {
        const { project_id, name, severity, status, reported_date } = req.body;
        db.run("INSERT INTO bugs (project_id, name, severity, status, reported_date) VALUES (?, ?, ?, ?, ?)",
            [project_id, name, severity, status, reported_date],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                res.status(201).json({ message: 'Bug reported successfully!', id: this.lastID });
            });
    });

    app.put('/api/bugs/:id', (req, res) => {
        const { project_id, name, severity, status, reported_date } = req.body;
        const bugId = req.params.id;
        db.run("UPDATE bugs SET project_id = ?, name = ?, severity = ?, status = ?, reported_date = ? WHERE id = ?",
            [project_id, name, severity, status, reported_date, bugId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: 'Bug not found or no changes made.' });
                }
                res.status(200).json({ message: 'Bug updated successfully!' });
            });
    });

    app.delete('/api/bugs/:id', (req, res) => {
        const bugId = req.params.id;
        db.run("DELETE FROM bugs WHERE id = ?", bugId, function(err) {
            if (err) {
                return res.status(500).json({ message: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Bug not found.' });
            }
            res.status(200).json({ message: 'Bug deleted successfully!' });
        });
    });

    // User Settings API (for email notifications)
    // IMPORTANT: In a real app, this would be tied to authenticated user settings
    // For demo, we'll use a placeholder user ID for sending test emails.
    app.post('/api/send-test-project-reminder/:userId', async (req, res) => {
        const { userId } = req.params; // Placeholder userId, not actually used to fetch settings from DB in this demo
        const recipientEmail = process.env.EMAIL_USER; // Use the configured email as recipient for test

        if (!recipientEmail || recipientEmail === 'your_email@gmail.com') {
            return res.status(400).json({ message: 'Please configure EMAIL_USER in your Render environment variables or .env file for test reminders to work.' });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: 'Test Project Due Date Reminder (Syntech App)',
            html: `
                <p>Hello Renias,</p>
                <p>This is a test reminder from your Syntech Project Management App.</p>
                <p>A project is due in approximately 5 days. Please review your projects in the app.</p>
                <p>This email was sent to: ${recipientEmail}</p>
                <p>Thank you!</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'Test project reminder email sent successfully!' });
        } catch (error) {
            console.error('Error sending test email:', error);
            res.status(500).json({ message: `Failed to send test email: ${error.message}` });
        }
    });

    // Cron job for daily project reminders
    cron.schedule('0 9 * * *', async () => { // Runs daily at 9:00 AM (server time)
        console.log('Running daily project reminder check...');
        const today = new Date();
        const fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(today.getDate() + 5);
        const targetDate = fiveDaysFromNow.toISOString().split('T')[0];

        // Fetch projects due in 5 days for the demo user (user_id = 1)
        // In a real app, this would iterate through all users' projects or use a more sophisticated reminder system.
        db.all(`
            SELECT p.project_name, p.end_date, c.name AS client_name, us.email_for_notifications,
                   us.phonetic_name, us.desktop_notifications_enabled
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            JOIN users u ON u.id = (SELECT user_id FROM user_settings WHERE user_id = 1) -- Hardcoded for demo
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
                    if (project.email_for_notifications && project.email_for_notifications !== 'your_email@gmail.com') {
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
                        try {
                            await transporter.sendMail(mailOptions);
                            console.log(`Reminder email sent for project "${project.project_name}" to ${project.email_for_notifications}`);
                        } catch (emailError) {
                            console.error(`Failed to send reminder email for project "${project.project_name}":`, emailError);
                        }
                    } else {
                        console.log(`No valid notification email set for user for project "${project.project_name}". Skipping email.`);
                    }
                }
            } else {
                console.log('No projects found due in 5 days.');
            }
        });
    }, {
        scheduled: true,
        timezone: "Africa/Johannesburg" // Set your desired timezone
    });

    // Serve static frontend files in production
    if (process.env.NODE_ENV === 'production') {
        app.use(express.static(path.join(__dirname, '../frontend/build')));

        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
        });
    }

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

}).catch(err => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1); // Exit process if DB fails to init
});
