# backend/app.py

from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app, supports_credentials=True) # Enable CORS for all origins, allow credentials
app.secret_key = os.urandom(24) # Secret key for session management

# In-memory "database" for demonstration purposes
# In a real application, you would use a proper database (e.g., PostgreSQL, MySQL, MongoDB)
# and an ORM (e.g., SQLAlchemy, Peewee, PonyORM) for data management.
db = {
    "users": [
        {"id": 1, "username": "admin", "password": "password123", "role": "admin"},
        {"id": 2, "username": "demo", "password": "demo", "role": "demo"} # Added demo user
    ],
    "clients": [
        {"id": 1, "name": "Alice Smith", "email": "alice@example.com", "phone": "123-456-7890", "company": "ABC Corp", "notes": "Active client, high potential."},
        {"id": 2, "name": "Bob Johnson", "email": "bob@example.com", "phone": "098-765-4321", "company": "XYZ Ltd", "notes": "New lead, follow up next week."},
        {"id": 3, "name": "Charlie Brown", "email": "charlie@example.com", "phone": "555-123-4567", "company": "Peanuts Inc.", "notes": "On hold, awaiting project details."},
    ],
    "services": [
        {"id": 1, "name": "Website Design", "description": "Full responsive website design", "price": 1500.00, "unit": "fixed"},
        {"id": 2, "name": "Content Writing (per page)", "description": "SEO optimized content writing", "price": 50.00, "unit": "per page"},
        {"id": 3, "name": "Monthly SEO Package", "description": "Ongoing SEO optimization and reporting", "price": 300.00, "unit": "per month"},
        {"id": 4, "name": "Consultation", "description": "Hourly consultation session", "price": 100.00, "unit": "per hour"},
    ],
    "quotes": [
        {
            "id": 1,
            "client_id": 1,
            "client_name": "Alice Smith",
            "client_company": "ABC Corp",
            "quote_date": "2023-01-15",
            "status": "Accepted",
            "total_amount": 1600.00,
            "notes": "Initial quote for website redesign and 2 content pages.",
            "quote_items": [
                {"service_id": 1, "name": "Website Design", "price": 1500.00, "unit": "fixed", "quantity": 1},
                {"service_id": 2, "name": "Content Writing (per page)", "price": 50.00, "unit": "per page", "quantity": 2}
            ]
        },
        {
            "id": 2,
            "client_id": 2,
            "client_name": "Bob Johnson",
            "client_company": "XYZ Ltd",
            "quote_date": "2023-02-01",
            "status": "Draft",
            "total_amount": 300.00,
            "notes": "Draft for monthly SEO service.",
            "quote_items": [
                {"service_id": 3, "name": "Monthly SEO Package", "price": 300.00, "unit": "per month", "quantity": 1}
            ]
        }
    ],
    "projects": [
        {
            "id": 1,
            "project_name": "ABC Corp Website Redesign",
            "client_id": 1,
            "client_name": "Alice Smith",
            "client_company": "ABC Corp",
            "description": "Complete overhaul of ABC Corp's existing website, including new design, content integration, and SEO.",
            "start_date": "2023-03-01",
            "end_date": "2023-05-15",
            "status": "In Progress",
            "notes": "Phase 1 completed. Awaiting client feedback for Phase 2. Due date for next milestone: 2023-04-20."
        },
        {
            "id": 2,
            "project_name": "XYZ Ltd SEO Campaign",
            "client_id": 2,
            "client_name": "Bob Johnson",
            "client_company": "XYZ Ltd",
            "description": "Launch and manage a 6-month SEO campaign to improve organic search rankings for key terms.",
            "start_date": "2023-03-10",
            "end_date": "2023-09-10",
            "status": "Planning",
            "notes": "Initial keyword research complete. Awaiting content plan approval."
        }
    ],
    "invoices": [
        {
            "id": 1,
            "client_id": 1,
            "client_name": "Alice Smith",
            "client_company": "ABC Corp",
            "quote_id": 1,
            "project_id": 1,
            "invoice_date": "2023-05-20",
            "due_date": "2023-06-20",
            "status": "Paid",
            "total_amount": 1600.00,
            "notes": "Final invoice for website redesign project.",
            "invoice_items": [
                {"service_id": 1, "name": "Website Design", "price": 1500.00, "unit": "fixed", "quantity": 1},
                {"service_id": 2, "name": "Content Writing (per page)", "price": 50.00, "unit": "per page", "quantity": 2}
            ]
        },
        {
            "id": 2,
            "client_id": 2,
            "client_name": "Bob Johnson",
            "client_company": "XYZ Ltd",
            "quote_id": 2,
            "project_id": 2,
            "invoice_date": "2023-03-15",
            "due_date": "2023-04-15",
            "status": "Sent",
            "total_amount": 300.00,
            "notes": "Invoice for first month of SEO services.",
            "invoice_items": [
                {"service_id": 3, "name": "Monthly SEO Package", "price": 300.00, "unit": "per month", "quantity": 1}
            ]
        }
    ],
    # NEW: Tasks and Bugs collections
    "tasks": [
        {"id": 1, "project_id": 1, "name": "Design Homepage Mockup", "category": "Design", "due_date": "2023-03-10", "status": "Completed", "priority": "High", "progress": 100},
        {"id": 2, "project_id": 1, "name": "Develop User Authentication", "category": "Backend", "due_date": "2023-03-25", "status": "In Progress", "priority": "High", "progress": 70},
        {"id": 3, "project_id": 2, "name": "Keyword Research for SEO", "category": "SEO", "due_date": "2023-03-15", "status": "Completed", "priority": "Medium", "progress": 100},
        {"id": 4, "project_id": 2, "name": "Content Plan Creation", "category": "Content", "due_date": "2023-03-30", "status": "Planning", "priority": "Medium", "progress": 20},
        {"id": 5, "project_id": 1, "name": "Implement Payment Gateway", "category": "Backend", "due_date": "2023-04-10", "status": "Pending", "priority": "High", "progress": 0},
    ],
    "bugs": [
        {"id": 1, "project_id": 1, "name": "Login button not responsive", "severity": "High", "status": "Open", "reported_date": "2023-03-20"},
        {"id": 2, "project_id": 2, "name": "SEO report export error", "severity": "Medium", "status": "Closed", "reported_date": "2023-03-22"},
    ]
}

# Helper to find next ID for a collection
def get_next_id(collection_name):
    return max([item['id'] for item in db[collection_name]], default=0) + 1

#--- Authentication Endpoints
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = next((u for u in db["users"] if u["username"] == username and u["password"] == password), None)

    if user:
        session['logged_in'] = True
        session['user_id'] = user['id']
        session['role'] = user['role'] # Store user role in session
        session['is_demo'] = (user['role'] == 'demo') # Set is_demo flag
        return jsonify({"message": "Login successful", "user": {"id": user['id'], "username": user['username'], "role": user['role']}}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401

@app.route('/api/demo_login', methods=['POST'])
def demo_login():
    # Simulate a demo user login
    demo_user = next((u for u in db["users"] if u["role"] == "demo"), None)
    if not demo_user:
        # Create a demo user if it doesn't exist (should ideally be seeded)
        new_id = get_next_id("users")
        demo_user = {"id": new_id, "username": "demo", "password": "demo", "role": "demo"}
        db["users"].append(demo_user)

    session['logged_in'] = True
    session['user_id'] = demo_user['id']
    session['role'] = demo_user['role']
    session['is_demo'] = True # Explicitly set demo mode
    return jsonify({"message": "Logged in as demo user", "user": {"id": demo_user['id'], "username": demo_user['username'], "role": demo_user['role']}}), 200

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('logged_in', None)
    session.pop('user_id', None)
    session.pop('role', None)
    session.pop('is_demo', None) # Clear demo flag on logout
    return jsonify({"message": "Logged out successfully"}), 200

# Helper to check if user is logged in
def is_logged_in():
    return session.get('logged_in')

# Helper to check if user is a demo user
def is_demo_user():
    return session.get('is_demo', False)

# NEW: User Endpoints (for total user count - kept for potential future use, but not directly used in frontend summary now)
@app.route('/api/users', methods=['GET'])
def get_users():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401
    return jsonify(db["users"]), 200

#--- Client Endpoints ---
@app.route('/api/clients', methods=['GET', 'POST'])
def clients():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        new_client = {
            "id": get_next_id("clients"),
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "company": data.get("company"),
            "notes": data.get("notes")
        }
        db["clients"].append(new_client)
        return jsonify({"message": "Client added successfully", "client": new_client}), 201
    else: # GET
        return jsonify(db["clients"]), 200

@app.route('/api/clients/<int:client_id>', methods=['GET', 'PUT', 'DELETE'])
def client_detail(client_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    client = next((c for c in db["clients"] if c["id"] == client_id), None)
    if not client:
        return jsonify({"message": "Client not found"}), 404

    if request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        client.update({
            "name": data.get("name", client["name"]),
            "email": data.get("email", client["email"]),
            "phone": data.get("phone", client["phone"]),
            "company": data.get("company", client["company"]),
            "notes": data.get("notes", client["notes"])
        })
        return jsonify({"message": "Client updated successfully", "client": client}), 200
    elif request.method == 'DELETE':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        db["clients"] = [c for c in db["clients"] if c["id"] != client_id]
        # Also remove any quotes, projects, invoices associated with this client
        db["quotes"] = [q for q in db["quotes"] if q["client_id"] != client_id]
        db["projects"] = [p for p in db["projects"] if p["client_id"] != client_id]
        db["invoices"] = [i for i in db["invoices"] if i["client_id"] != client_id]
        # Also remove tasks and bugs associated with projects of this client (indirectly)
        # For simplicity in this in-memory DB, direct deletion of client-related tasks/bugs is complex
        # A real DB would handle cascading deletes.
        return jsonify({"message": "Client deleted successfully"}), 200
    else: # GET
        return jsonify(client), 200

# --- Service Endpoints ---
@app.route('/api/services', methods=['GET', 'POST'])
def services():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        new_service = {
            "id": get_next_id("services"),
            "name": data.get("name"),
            "description": data.get("description"),
            "price": float(data.get("price")),
            "unit": data.get("unit")
        }
        db["services"].append(new_service)
        return jsonify({"message": "Service added successfully", "service": new_service}), 201
    else: # GET
        return jsonify(db["services"]), 200

@app.route('/api/services/<int:service_id>', methods=['DELETE'])
def service_detail(service_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401
    if is_demo_user():
        return jsonify({"message": "Write operations are disabled in demo mode."}), 403

    service = next((s for s in db["services"] if s["id"] == service_id), None)
    if not service:
        return jsonify({"message": "Service not found"}), 404

    db["services"] = [s for s in db["services"] if s["id"] != service_id]
    return jsonify({"message": "Service deleted successfully"}), 200

#--- Quote Endpoints ---
@app.route('/api/quotes', methods=['GET', 'POST'])
def quotes():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        client = next((c for c in db["clients"] if c["id"] == data.get("client_id")), None)
        if not client:
            return jsonify({"message": "Client not found"}), 400

        new_quote = {
            "id": get_next_id("quotes"),
            "client_id": data.get("client_id"),
            "client_name": client["name"],
            "client_company": client.get("company"),
            "quote_date": data.get("quote_date"),
            "status": data.get("status"),
            "total_amount": float(data.get("total_amount")),
            "notes": data.get("notes"),
            "quote_items": data.get("quote_items", []) # Ensure items are included
        }
        db["quotes"].append(new_quote)
        return jsonify({"message": "Quote created successfully", "quote": new_quote}), 201
    else: # GET
        # For GET, enrich quotes with client company if available
        enriched_quotes = []
        for quote in db["quotes"]:
            client = next((c for c in db["clients"] if c["id"] == quote["client_id"]), None)
            if client:
                enriched_quotes.append({**quote, "client_company": client.get("company")})
            else:
                enriched_quotes.append(quote) # Append as is if client not found
        return jsonify(enriched_quotes), 200

@app.route('/api/quotes/<int:quote_id>', methods=['GET', 'PUT', 'DELETE'])
def quote_detail(quote_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    quote = next((q for q in db["quotes"] if q["id"] == quote_id), None)
    if not quote:
        return jsonify({"message": "Quote not found"}), 404

    if request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        client = next((c for c in db["clients"] if c["id"] == data.get("client_id")), None)
        if not client:
            return jsonify({"message": "Client not found"}), 400

        quote.update({
            "client_id": data.get("client_id", quote["client_id"]),
            "client_name": client["name"],
            "client_company": client.get("company"),
            "quote_date": data.get("quote_date", quote["quote_date"]),
            "status": data.get("status", quote["status"]),
            "total_amount": float(data.get("total_amount", quote["total_amount"])),
            "notes": data.get("notes", quote["notes"]),
            "quote_items": data.get("quote_items", quote["quote_items"])
        })
        return jsonify({"message": "Quote updated successfully", "quote": quote}), 200
    elif request.method == 'DELETE':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        db["quotes"] = [q for q in db["quotes"] if q["id"] != quote_id]
        return jsonify({"message": "Quote deleted successfully"}), 200
    else: # GET
        # Enrich quote with client company if available
        client = next((c for c in db["clients"] if c["id"] == quote["client_id"]), None)
        if client:
            quote["client_company"] = client.get("company")
        return jsonify(quote), 200

# --- Project Endpoints ---
@app.route('/api/projects', methods=['GET', 'POST'])
def projects():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        client = next((c for c in db["clients"] if c["id"] == data.get("client_id")), None)
        new_project = {
            "id": get_next_id("projects"),
            "project_name": data.get("project_name"),
            "client_id": data.get("client_id"),
            "client_name": client["name"] if client else None,
            "client_company": client.get("company") if client else None,
            "description": data.get("description"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
            "status": data.get("status"),
            "notes": data.get("notes")
        }
        db["projects"].append(new_project)
        return jsonify({"message": "Project added successfully", "project": new_project}), 201
    else: # GET
        # Enrich projects with client name/company
        enriched_projects = []
        for project in db["projects"]:
            client = next((c for c in db["clients"] if c["id"] == project["client_id"]), None)
            if client:
                enriched_projects.append({**project, "client_name": client["name"], "client_company": client.get("company")})
            else:
                enriched_projects.append(project) # Append as is if client not found
        return jsonify(enriched_projects), 200

@app.route('/api/projects/<int:project_id>', methods=['GET', 'PUT', 'DELETE'])
def project_detail(project_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    project = next((p for p in db["projects"] if p["id"] == project_id), None)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    if request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        client = next((c for c in db["clients"] if c["id"] == data.get("client_id")), None)

        project.update({
            "project_name": data.get("project_name", project["project_name"]),
            "client_id": data.get("client_id", project["client_id"]),
            "client_name": client["name"] if client else project.get("client_name"),
            "client_company": client.get("company") if client else project.get("client_company"),
            "description": data.get("description", project["description"]),
            "start_date": data.get("start_date", project["start_date"]),
            "end_date": data.get("end_date", project["end_date"]),
            "status": data.get("status", project["status"]),
            "notes": data.get("notes", project["notes"])
        })
        return jsonify({"message": "Project updated successfully", "project": project}), 200
    elif request.method == 'DELETE':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        db["projects"] = [p for p in db["projects"] if p["id"] != project_id]
        # Also remove associated tasks and bugs
        db["tasks"] = [t for t in db["tasks"] if t["project_id"] != project_id]
        db["bugs"] = [b for b in db["bugs"] if b["project_id"] != project_id]
        return jsonify({"message": "Project deleted successfully"}), 200
    else: # GET
        # Enrich project with client name/company
        client = next((c for c in db["clients"] if c["id"] == project["client_id"]), None)
        if client:
            project["client_name"] = client["name"]
            project["client_company"] = client.get("company")
        return jsonify(project), 200

# --- Invoice Endpoints ---
@app.route('/api/invoices', methods=['GET', 'POST'])
def invoices():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()

        client = next((c for c in db["clients"] if c["id"] == data.get("client_id")), None)
        if not client:
            return jsonify({"message": "Client not found"}), 400
        
        quote = next((q for q in db["quotes"] if q["id"] == data.get("quote_id")), None)
        project = next((p for p in db["projects"] if p["id"] == data.get("project_id")), None)

        new_invoice = {
            "id": get_next_id("invoices"),
            "client_id": data.get("client_id"),
            "client_name": client["name"],
            "client_company": client.get("company"),
            "quote_id": data.get("quote_id"),
            "project_id": data.get("project_id"),
            "project_name": project["project_name"] if project else None,
            "invoice_date": data.get("invoice_date"),
            "due_date": data.get("due_date"),
            "status": data.get("status"),
            "total_amount": float(data.get("total_amount")),
            "notes": data.get("notes"),
            "invoice_items": data.get("invoice_items", [])
        }
        db["invoices"].append(new_invoice)
        return jsonify({"message": "Invoice created successfully", "invoice": new_invoice}), 201
    else: # GET
        # Enrich invoices with client, quote, and project details
        enriched_invoices = []
        for invoice in db["invoices"]:
            client = next((c for c in db["clients"] if c["id"] == invoice["client_id"]), None)
            quote = next((q for q in db["quotes"] if q["id"] == invoice.get("quote_id")), None)
            project = next((p for p in db["projects"] if p["id"] == invoice.get("project_id")), None)

            enriched_invoice = {**invoice}
            if client:
                enriched_invoice["client_name"] = client["name"]
                enriched_invoice["client_company"] = client.get("company")
            if quote:
                enriched_invoice["quote_id"] = quote["id"] # Ensure quote_id is present if linked
            if project:
                enriched_invoice["project_name"] = project["project_name"]
            enriched_invoices.append(enriched_invoice)
        return jsonify(enriched_invoices), 200

@app.route('/api/invoices/<int:invoice_id>', methods=['GET', 'PUT', 'DELETE'])
def invoice_detail(invoice_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    invoice = next((i for i in db["invoices"] if i["id"] == invoice_id), None)
    if not invoice:
        return jsonify({"message": "Invoice not found"}), 404

    if request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()

        client = next((c for c in db["clients"] if c["id"] == data.get("client_id")), None)
        if not client:
            return jsonify({"message": "Client not found"}), 400
        
        quote = next((q for q in db["quotes"] if q["id"] == data.get("quote_id")), None)
        project = next((p for p in db["projects"] if p["id"] == data.get("project_id")), None)

        invoice.update({
            "client_id": data.get("client_id", invoice["client_id"]),
            "client_name": client["name"],
            "client_company": client.get("company"),
            "quote_id": data.get("quote_id", invoice["quote_id"]),
            "project_id": data.get("project_id", invoice["project_id"]),
            "project_name": project["project_name"] if project else invoice.get("project_name"),
            "invoice_date": data.get("invoice_date", invoice["invoice_date"]),
            "due_date": data.get("due_date", invoice["due_date"]),
            "status": data.get("status", invoice["status"]),
            "total_amount": float(data.get("total_amount", invoice["total_amount"])),
            "notes": data.get("notes", invoice["notes"]),
            "invoice_items": data.get("invoice_items", invoice["invoice_items"])
        })
        return jsonify({"message": "Invoice updated successfully", "invoice": invoice}), 200
    elif request.method == 'DELETE':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        db["invoices"] = [i for i in db["invoices"] if i["id"] != invoice_id]
        return jsonify({"message": "Invoice deleted successfully"}), 200
    else: # GET
        client = next((c for c in db["clients"] if c["id"] == invoice["client_id"]), None)
        if client:
            invoice["client_name"] = client["name"]
            invoice["client_company"] = client.get("company")
        quote = next((q for q in db["quotes"] if q["id"] == invoice.get("quote_id")), None)
        if quote:
            invoice["quote_id"] = quote["id"]
        project = next((p for p in db["projects"] if p["id"] == invoice.get("project_id")), None)
        if project:
            invoice["project_name"] = project["project_name"]
        return jsonify(invoice), 200

# NEW: Task Endpoints
@app.route('/api/tasks', methods=['GET', 'POST'])
def tasks():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        project = next((p for p in db["projects"] if p["id"] == data.get("project_id")), None)
        if not project:
            return jsonify({"message": "Project not found for task"}), 400

        new_task = {
            "id": get_next_id("tasks"),
            "project_id": data.get("project_id"),
            "project_name": project["project_name"],
            "client_name": project.get("client_name"), # Inherit from project
            "name": data.get("name"),
            "category": data.get("category"),
            "due_date": data.get("due_date"),
            "status": data.get("status"),
            "priority": data.get("priority"),
            "progress": data.get("progress", 0)
        }
        db["tasks"].append(new_task)
        return jsonify({"message": "Task added successfully", "task": new_task}), 201
    else: # GET
        # Enrich tasks with project and client names
        enriched_tasks = []
        for task in db["tasks"]:
            project = next((p for p in db["projects"] if p["id"] == task["project_id"]), None)
            if project:
                enriched_tasks.append({**task, "project_name": project["project_name"], "client_name": project.get("client_name")})
            else:
                enriched_tasks.append(task) # Append as is if project not found
        return jsonify(enriched_tasks), 200

@app.route('/api/tasks/<int:task_id>', methods=['GET', 'PUT', 'DELETE'])
def task_detail(task_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    task = next((t for t in db["tasks"] if t["id"] == task_id), None)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    if request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        project = next((p for p in db["projects"] if p["id"] == data.get("project_id")), None)
        if not project:
            return jsonify({"message": "Project not found for task"}), 400

        task.update({
            "project_id": data.get("project_id", task["project_id"]),
            "project_name": project["project_name"],
            "client_name": project.get("client_name"),
            "name": data.get("name", task["name"]),
            "category": data.get("category", task["category"]),
            "due_date": data.get("due_date", task["due_date"]),
            "status": data.get("status", task["status"]),
            "priority": data.get("priority", task["priority"]),
            "progress": data.get("progress", task["progress"])
        })
        return jsonify({"message": "Task updated successfully", "task": task}), 200
    elif request.method == 'DELETE':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        db["tasks"] = [t for t in db["tasks"] if t["id"] != task_id]
        return jsonify({"message": "Task deleted successfully"}), 200
    else: # GET
        project = next((p for p in db["projects"] if p["id"] == task["project_id"]), None)
        if project:
            task["project_name"] = project["project_name"]
            task["client_name"] = project.get("client_name")
        return jsonify(task), 200

# NEW: Bug Endpoints
@app.route('/api/bugs', methods=['GET', 'POST'])
def bugs():
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if request.method == 'POST':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        project = next((p for p in db["projects"] if p["id"] == data.get("project_id")), None)
        if not project:
            return jsonify({"message": "Project not found for bug"}), 400

        new_bug = {
            "id": get_next_id("bugs"),
            "project_id": data.get("project_id"),
            "project_name": project["project_name"],
            "client_name": project.get("client_name"), # Inherit from project
            "name": data.get("name"),
            "severity": data.get("severity"),
            "status": data.get("status"),
            "reported_date": data.get("reported_date")
        }
        db["bugs"].append(new_bug)
        return jsonify({"message": "Bug added successfully", "bug": new_bug}), 201
    else: # GET
        # Enrich bugs with project and client names
        enriched_bugs = []
        for bug in db["bugs"]:
            project = next((p for p in db["projects"] if p["id"] == bug["project_id"]), None)
            if project:
                enriched_bugs.append({**bug, "project_name": project["project_name"], "client_name": project.get("client_name")})
            else:
                enriched_bugs.append(bug) # Append as is if project not found
        return jsonify(enriched_bugs), 200

@app.route('/api/bugs/<int:bug_id>', methods=['GET', 'PUT', 'DELETE'])
def bug_detail(bug_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    bug = next((b for b in db["bugs"] if b["id"] == bug_id), None)
    if not bug:
        return jsonify({"message": "Bug not found"}), 404

    if request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        data = request.get_json()
        project = next((p for p in db["projects"] if p["id"] == data.get("project_id")), None)
        if not project:
            return jsonify({"message": "Project not found for bug"}), 400

        bug.update({
            "project_id": data.get("project_id", bug["project_id"]),
            "project_name": project["project_name"],
            "client_name": project.get("client_name"),
            "name": data.get("name", bug["name"]),
            "severity": data.get("severity", bug["severity"]),
            "status": data.get("status", bug["status"]),
            "reported_date": data.get("reported_date", bug["reported_date"])
        })
        return jsonify({"message": "Bug updated successfully", "bug": bug}), 200
    elif request.method == 'DELETE':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        db["bugs"] = [b for b in db["bugs"] if b["id"] != bug_id]
        return jsonify({"message": "Bug deleted successfully"}), 200
    else: # GET
        project = next((p for p in db["projects"] if p["id"] == bug["project_id"]), None)
        if project:
            bug["project_name"] = project["project_name"]
            bug["client_name"] = project.get("client_name")
        return jsonify(bug), 200

# --- Settings Endpoint (Hardcoded as per user request, no DB interaction needed) ---
# This endpoint is kept for completeness but its values are hardcoded in the frontend
# and not meant to be fetched from backend in this simplified version.
@app.route('/api/user_settings/<int:user_id>', methods=['GET', 'PUT'])
def user_settings(user_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    # In this simplified version, settings are hardcoded in the frontend.
    # If they were stored in DB, you'd fetch/update them here.
    # For now, just return a mock response or indicate hardcoded nature.
    if request.method == 'GET':
        # Return a mock settings object. Frontend uses its own hardcoded values.
        mock_settings = {
            "phonetic_name": "Renias",
            "email_for_notifications": "renias0101@gmail.com",
            "currency_symbol": "R",
            "date_format": "YYYY-MM-DD",
            "dark_mode_enabled": True, # This will be overridden by frontend state
            "desktop_notifications_enabled": False,
            "sound_effects_enabled": True,
            "phone_number_for_notifications": "+27721234567"
        }
        return jsonify(mock_settings), 200
    elif request.method == 'PUT':
        if is_demo_user():
            return jsonify({"message": "Write operations are disabled in demo mode."}), 403
        # In a real app, you'd update settings in your DB here.
        # For this demo, we'll just acknowledge the request.
        return jsonify({"message": "Settings updated successfully (backend mock)"}), 200

# --- Email Sending Endpoint ---
# This endpoint is for sending test project reminders.
# It uses dummy SMTP credentials. REPLACE WITH REAL CREDENTIALS FOR PRODUCTION.
@app.route('/api/send-test-project-reminder/<int:user_id>', methods=['POST'])
def send_test_project_reminder(user_id):
    if not is_logged_in():
        return jsonify({"message": "Unauthorized"}), 401

    if is_demo_user():
        return jsonify({"message": "Email sending is disabled in demo mode."}), 403

    # In a real app, fetch user's notification email from DB based on user_id
    # For this demo, we'll use the hardcoded email from userSettings (as if it came from DB)
    recipient_email = "renias0101@gmail.com" # This should ideally come from user settings in a real app

    if not recipient_email:
        return jsonify({"message": "Notification email not configured for this user."}), 400

    # Dummy SMTP Configuration - REPLACE WITH YOUR ACTUAL SMTP DETAILS
    # For Gmail, you might need to enable "Less secure app access" or use App Passwords
    # For other providers, consult their SMTP settings.
    smtp_server = "smtp.gmail.com"
    smtp_port = 587 # or 465 for SSL
    smtp_username = "your_email@gmail.com" # REPLACE WITH YOUR GMAIL ADDRESS
    smtp_password = "your_app_password" # REPLACE WITH YOUR GMAIL APP PASSWORD OR EMAIL PASSWORD

    # Check if dummy credentials are still present
    if smtp_username == "your_email@gmail.com" or smtp_password == "your_app_password":
        print(f"--- SIMULATING EMAIL SENDING ---")
        print(f"TO: {recipient_email}")
        print(f"SUBJECT: Test Project Due Date Reminder from Syntech Software")
        print(f"BODY: This is a simulated email. In a production environment with proper SMTP credentials, this email would be sent.")
        print(f"----------------------------------")
        return jsonify({"message": f"Test project reminder email simulated successfully to {recipient_email}. (SMTP not configured)"}), 200

    # If real credentials are provided, attempt to send the email
    sender_email = smtp_username
    subject = "Test Project Due Date Reminder from Syntech Software"
    body = f"""
Dear User,

This is a test reminder from your Syntech Software Project Management App.

A project is due in 5 days.

Project Name: Test Project Reminder
Due Date: {datetime.now().date() + timedelta(days=5)}

This email confirms that your notification settings are working correctly.

Best regards,
The Syntech Software Team
"""

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls() # Secure the connection
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        return jsonify({"message": f"Test project reminder email sent to {recipient_email}!"}), 200
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"message": f"Failed to send test reminder email. Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True) # Run in debug mode for development
