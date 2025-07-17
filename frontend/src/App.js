// frontend/src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { FaHome, FaUsers, FaFileInvoiceDollar, FaProjectDiagram, FaCog, FaSignOutAlt, FaClipboardList, FaBug } from 'react-icons/fa'; // Added FaClipboardList, FaBug

function App() {
  // State for loading screen and authentication
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Start as false to show welcome page
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  // State for current page navigation
  const [currentPage, setCurrentPage] = useState('home');

  // State for dark mode (now dynamic)
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(true);

  // State for screen width to apply responsive styles (used for internal content wrapping)
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Ref for scrolling to forms on edit
  const formRef = useRef(null);

  // Hardcoded User Settings (Frontend display only - actual notification email is from backend DB)
  const userSettings = {
    phonetic_name: 'Renias',
    email_for_notifications: 'your.email@example.com (Hidden for public demo)', // Placeholder for display
    currency_symbol: 'R',
    date_format: 'YYYY-MM-DD',
    desktop_notifications_enabled: false,
    sound_effects_enabled: true,
    phone_number_for_notifications: '+XX XXXXXXXXXX (Hidden for public demo)' // Placeholder for display
  };

  // Professional Color Palette
  const primaryBgColor = isDarkModeEnabled ? '#2C3E50' : '#ECF0F1';
  const secondaryBgColor = isDarkModeEnabled ? '#34495E' : '#FFFFFF';
  const darkSecondaryBg = isDarkModeEnabled ? '#3D566E' : '#F9F9F9';
  const textColor = isDarkModeEnabled ? '#ECF0F1' : '#2C3E50';
  const mutedTextColor = isDarkModeEnabled ? '#BDC3C7' : '#7F8C8D';
  const accentColor = '#3498DB';
  const infoColor = '#2980B9';
  const warningColor = '#F39C12';
  const dangerColor = '#E74C3C';
  const successColor = '#2ECC71';
  const defaultButtonColor = isDarkModeEnabled ? '#7F8C8D' : '#BDC3C7';
  const lightTextColor = '#FFFFFF'; // Explicitly white for certain texts


  // State for client management
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [editingClient, setEditingClient] = useState(null);

  // State for service management
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: "", description: "", price: "", unit: 'fixed' });

  // State for quote management
  const [quotes, setQuotes] = useState([]);
  const [selectedClientForQuote, setSelectedClientForQuote] = useState("");
  const [currentQuoteItems, setCurrentQuoteItems] = useState([]);
  const [newQuoteNotes, setNewQuoteNotes] = useState("");
  const [newQuoteStatus, setNewQuoteStatus] = useState('Draft');
  const [editingQuote, setEditingQuote] = useState(null);
  const [viewingQuote, setViewingQuote] = useState(null);

  // State for project management
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({ project_name: "", client_id: "", description: "", start_date: "", end_date: "", status: "Planning", notes: "" });
  const [editingProject, setEditingProject] = useState(null);
  const [viewingProject, setViewingProject] = useState(null);

  // State for invoice management
  const [invoices, setInvoices] = useState([]);
  const [newInvoice, setNewInvoice] = useState({
    client_id: '',
    quote_id: '',
    project_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Draft',
    total_amount: 0,
    notes: '',
    invoice_items: []
  });
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [currentInvoiceItems, setCurrentInvoiceItems] = useState([]);

  // NEW: State for Task Overview data
  const [tasks, setTasks] = useState([]);
  const [bugs, setBugs] = useState([]);
  // const [users, setUsers] = useState([]); // Removed as per request

  // NEW: State for Task/Bug forms
  const [newTask, setNewTask] = useState({ project_id: '', name: '', category: '', due_date: '', status: 'Pending', priority: 'Medium', progress: 0 });
  const [editingTask, setEditingTask] = useState(null);
  const [newBug, setNewBug] = useState({ project_id: '', name: '', severity: 'Medium', status: 'Open', reported_date: new Date().toISOString().split('T')[0] });
  const [editingBug, setEditingBug] = useState(null);


  // Generic message state for API responses
  const [message, setMessage] = useState('');


  // Utility function to format date based on user settings
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const date = new Date(dateString);

    switch (userSettings.date_format) {
      case 'MM/DD/YYYY':
        return date.toLocaleDateString('en-US', options);
      case 'DD/MM/YYYY':
        return date.toLocaleDateString('en-GB', options);
      case 'YYYY-MM-DD':
      default:
        return date.toISOString().split('T')[0];
    }
  }, [userSettings.date_format]);


  // --- Fetch Functions (Memoized with useCallback for performance) ---

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/clients');
      const data = await response.json();
      if (response.ok) {
        setClients(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setMessage('Failed to fetch clients.');
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services');
      const data = await response.json();
      if (response.ok) {
        setServices(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setMessage('Failed to fetch services.');
    }
  }, []);

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/quotes');
      const data = await response.json();
      if (response.ok) {
        setQuotes(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setMessage('Failed to fetch quotes.');
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/projects');
      const data = await response.json();
      if (response.ok) {
        setProjects(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setMessage('Failed to fetch projects.');
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/invoices');
      const data = await response.json();
      if (response.ok) {
        setInvoices(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setMessage('Failed to fetch invoices.');
    }
  }, []);

  // NEW: Fetch Tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tasks');
      const data = await response.json();
      if (response.ok) {
        setTasks(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setMessage('Failed to fetch tasks.');
    }
  }, []);

  // NEW: Fetch Bugs
  const fetchBugs = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/bugs');
      const data = await response.json();
      if (response.ok) {
        setBugs(data);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching bugs:', error);
      setMessage('Failed to fetch bugs.');
    }
  }, []);

  // Removed fetchUsers as per request


  // --- useEffect for initial data load and screen resize ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch data when logged in or when currentPage changes to a relevant section
  useEffect(() => {
    if (isLoggedIn) {
      if (currentPage === 'clients') {
        fetchClients();
      } else if (currentPage === 'services') {
        fetchServices();
      } else if (currentPage === 'quotes') {
        fetchQuotes();
        fetchServices();
        fetchClients();
      } else if (currentPage === 'projects') {
        fetchProjects();
        fetchClients();
      } else if (currentPage === 'invoices') {
        fetchInvoices();
        fetchClients();
        fetchQuotes();
        fetchProjects();
        fetchServices();
      } else if (currentPage === 'taskOverview') { // NEW: Fetch data for Task Overview
        fetchProjects(); // For Total Projects dropdown and count
        fetchTasks();
        fetchBugs();
      }
    }
  }, [isLoggedIn, currentPage, fetchClients, fetchServices, fetchQuotes, fetchProjects, fetchInvoices, fetchTasks, fetchBugs]);


  // --- Authentication Handlers ---
  const handleStartDemo = () => {
    setIsLoggedIn(true);
    setLoggedInUserId('demo-user-id'); // Use a placeholder ID for demo
    setCurrentPage('home'); // Navigate to home page after starting demo
    setMessage('Welcome to the demo! All operations are enabled.');
  };

  const handleLogout = async () => {
    try {
      setIsLoggedIn(false);
      setLoggedInUserId(null);
      setCurrentPage('home'); // Go back to welcome page
      setMessage('Logged out from demo successfully.');
    } catch (error) {
      console.error('Logout error:', error);
      setMessage('Failed to logout.');
    }
  };

  // Helper function to scroll to form and show message
  const scrollToFormAndShowMessage = (msg) => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
  };


  // --- Client Handlers ---
  const handleClientFormChange = (e) => {
    setNewClient({ ...newClient, [e.target.name]: e.target.value });
    if (editingClient) {
      setEditingClient({ ...editingClient, [e.target.name]: e.target.value });
    }
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();

    let url = 'http://localhost:5000/api/clients';
    let method = 'POST';
    let clientData = newClient;

    if (editingClient) {
      url = `http://localhost:5000/api/clients/${editingClient.id}`;
      method = 'PUT';
      clientData = editingClient;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message); // Use helper function
        setNewClient({ name: "", email: "", phone: "", company: "", notes: "" });
        setEditingClient(null);
        fetchClients(); // Refresh client list
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Client operation error:', error);
      setMessage('Failed to perform client operation.');
    }
  };

  const handleEditClient = (client) => {
    setEditingClient({ ...client });
    scrollToFormAndShowMessage('Now editing client. Make your changes above and click "Update Client".');
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
    setMessage('');
  };

  const handleDeleteClient = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete client "${name}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/clients/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchClients();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete client error:', error);
        setMessage('Failed to delete client.');
      }
    }
  };

  // --- Service Handlers ---
  const handleServiceFormChange = (e) => {
    setNewService({ ...newService, [e.target.name]: e.target.value });
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message);
        setNewService({ name: "", description: "", price: "", unit: 'fixed' });
        fetchServices();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Add service error:', error);
      setMessage('Failed to add service.');
    }
  };

  const handleDeleteService = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete service "${name}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/services/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchServices();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete service error:', error);
        setMessage('Failed to delete service.');
      }
    }
  };

  // --- Quote Handlers ---
  const handleAddServiceToQuote = (serviceId) => {
    const serviceToAdd = services.find(s => s.id === serviceId);
    if (serviceToAdd) {
      const existingItemIndex = currentQuoteItems.findIndex(item => item.service_id === serviceId);

      if (existingItemIndex > -1) {
        const updatedItems = [...currentQuoteItems];
        updatedItems[existingItemIndex].quantity += 1;
        setCurrentQuoteItems(updatedItems);
      } else {
        setCurrentQuoteItems([...currentQuoteItems, { ...serviceToAdd, service_id: serviceToAdd.id, quantity: 1 }]);
      }
    }
  };

  const handleRemoveItemFromQuote = (indexToRemove) => {
    setCurrentQuoteItems(currentQuoteItems.filter((_, index) => index !== indexToRemove));
  };

  const calculateQuoteTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClientForQuote || currentQuoteItems.length === 0) {
      setMessage('Please select a client and add at least one service to the quote.');
      return;
    }

    let url = 'http://localhost:5000/api/quotes';
    let method = 'POST';
    let quoteData = {
      client_id: selectedClientForQuote,
      quote_date: new Date().toISOString().split('T')[0],
      status: newQuoteStatus,
      total_amount: calculateQuoteTotal(currentQuoteItems),
      notes: newQuoteNotes,
      quote_items: currentQuoteItems,
    };

    if (editingQuote) {
      url = `http://localhost:5000/api/quotes/${editingQuote.id}`;
      method = 'PUT';
      quoteData = {
        ...editingQuote,
        client_id: selectedClientForQuote,
        status: newQuoteStatus,
        notes: newQuoteNotes,
        total_amount: calculateQuoteTotal(currentQuoteItems),
        quote_items: currentQuoteItems,
      };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message);
        setSelectedClientForQuote("");
        setCurrentQuoteItems([]);
        setNewQuoteNotes("");
        setNewQuoteStatus('Draft');
        setEditingQuote(null);
        fetchQuotes();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Quote operation error:', error);
      setMessage('Failed to perform quote operation.');
    }
  };

  const handleEditQuote = (quote) => {
    setEditingQuote({ ...quote });
    setSelectedClientForQuote(quote.client_id);
    setCurrentQuoteItems(quote.quote_items || []);
    setNewQuoteNotes(quote.notes || "");
    setNewQuoteStatus(quote.status || 'Draft');
    setViewingQuote(null);
    scrollToFormAndShowMessage('Now editing quote. Make your changes above and click "Update Quote".');
  };

  const handleViewQuote = (quote) => {
    setViewingQuote(quote);
    setEditingQuote(null);
    setMessage('');
  };

  const handleCancelViewQuote = () => {
    setViewingQuote(null);
    setMessage('');
  };

  const handleDeleteQuote = async (id) => {
    if (window.confirm("Are you sure you want to delete this quote?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/quotes/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchQuotes();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete quote error:', error);
        setMessage('Failed to delete quote.');
      }
    }
  };


  // --- Project Handlers ---
  const handleProjectFormChange = (e) => {
    setNewProject({ ...newProject, [e.target.name]: e.target.value });
    if (editingProject) {
      setEditingProject({ ...editingProject, [e.target.name]: e.target.value });
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();

    let url = 'http://localhost:5000/api/projects';
    let method = 'POST';
    let projectData = newProject;

    if (editingProject) {
      url = `http://localhost:5000/api/projects/${editingProject.id}`;
      method = 'PUT';
      projectData = editingProject;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message);
        setNewProject({ project_name: "", client_id: "", description: "", start_date: "", end_date: "", status: "Planning", notes: "" });
        setEditingProject(null);
        fetchProjects();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Project operation error:', error);
      setMessage('Failed to perform project operation.');
    }
  };

  const handleEditProject = (project) => {
    setEditingProject({ ...project });
    setViewingProject(null);
    scrollToFormAndShowMessage('Now editing project. Make your changes above and click "Update Project".');
  };

  const handleViewProject = (project) => {
    setViewingProject(project);
    setEditingProject(null);
    setMessage('');
  };

  const handleCancelViewProject = () => {
    setViewingProject(null);
    setMessage('');
  };

  const handleDeleteProject = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete project "${name}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/projects/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchProjects();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete project error:', error);
        setMessage('Failed to delete project.');
      }
    }
  };

  // --- Invoice Handlers (NEW) ---
  const handleInvoiceFormChange = (e) => {
    setNewInvoice({ ...newInvoice, [e.target.name]: e.target.value });
    if (editingInvoice) {
      setEditingInvoice({ ...editingInvoice, [e.target.name]: e.target.value });
    }
  };

  const handleAddServiceToInvoice = (serviceId) => {
    const serviceToAdd = services.find(s => s.id === serviceId);
    if (serviceToAdd) {
      const existingItemIndex = currentInvoiceItems.findIndex(item => item.service_id === serviceId);

      if (existingItemIndex > -1) {
        const updatedItems = [...currentInvoiceItems];
        updatedItems[existingItemIndex].quantity += 1;
        setCurrentInvoiceItems(updatedItems);
      } else {
        setCurrentInvoiceItems([...currentInvoiceItems, { ...serviceToAdd, service_id: serviceToAdd.id, quantity: 1 }]);
      }
    }
  };

  const handleRemoveItemFromInvoice = (indexToRemove) => {
    setCurrentInvoiceItems(currentInvoiceItems.filter((_, index) => index !== indexToRemove));
  };

  const calculateInvoiceTotal = (items) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();

    if (!newInvoice.client_id || currentInvoiceItems.length === 0) {
      setMessage('Please select a client and add at least one service to the invoice.');
      return;
    }

    let url = 'http://localhost:5000/api/invoices';
    let method = 'POST';
    let invoiceData = {
      ...newInvoice,
      total_amount: calculateInvoiceTotal(currentInvoiceItems),
      invoice_items: currentInvoiceItems,
    };

    if (editingInvoice) {
      url = `http://localhost:5000/api/invoices/${editingInvoice.id}`;
      method = 'PUT';
      invoiceData = {
        ...editingInvoice,
        ...newInvoice,
        total_amount: calculateInvoiceTotal(currentInvoiceItems),
        invoice_items: currentInvoiceItems,
      };
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message);
        setNewInvoice({
          client_id: '', quote_id: '', project_id: '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'Draft', total_amount: 0, notes: '', invoice_items: []
        });
        setCurrentInvoiceItems([]);
        setEditingInvoice(null);
        fetchInvoices();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Invoice operation error:', error);
      setMessage('Failed to perform invoice operation.');
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice({ ...invoice });
    setNewInvoice({
      client_id: invoice.client_id,
      quote_id: invoice.quote_id || '',
      project_id: invoice.project_id || '',
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      status: invoice.status,
      total_amount: invoice.total_amount,
      notes: invoice.notes,
      invoice_items: invoice.invoice_items || []
    });
    setCurrentInvoiceItems(invoice.invoice_items || []);
    setViewingInvoice(null);
    scrollToFormAndShowMessage('Now editing invoice. Make your changes above and click "Update Invoice".');
  };

  const handleViewInvoice = (invoice) => {
    setViewingInvoice(invoice);
    setEditingInvoice(null);
    setMessage('');
  };

  const handleCancelViewInvoice = () => {
    setViewingInvoice(null);
    setMessage('');
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/invoices/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchInvoices();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete invoice error:', error);
        setMessage('Failed to delete invoice.');
      }
    }
  };

  // --- NEW: Task Handlers ---
  const handleTaskFormChange = (e) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
    if (editingTask) {
      setEditingTask({ ...editingTask, [e.target.name]: e.target.value });
    }
  };

  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();

    let url = 'http://localhost:5000/api/tasks';
    let method = 'POST';
    let taskData = newTask;

    if (editingTask) {
      url = `http://localhost:5000/api/tasks/${editingTask.id}`;
      method = 'PUT';
      taskData = editingTask;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message);
        setNewTask({ project_id: '', name: '', category: '', due_date: '', status: 'Pending', priority: 'Medium', progress: 0 });
        setEditingTask(null);
        fetchTasks();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Task operation error:', error);
      setMessage('Failed to perform task operation.');
    }
  };

  const handleEditTask = (task) => {
    setEditingTask({ ...task });
    setNewTask({
      project_id: task.project_id,
      name: task.name,
      category: task.category,
      due_date: task.due_date,
      status: task.status,
      priority: task.priority,
      progress: task.progress
    });
    scrollToFormAndShowMessage('Now editing task. Make your changes above and click "Update Task".');
  };

  const handleCancelEditTask = () => {
    setEditingTask(null);
    setNewTask({ project_id: '', name: '', category: '', due_date: '', status: 'Pending', priority: 'Medium', progress: 0 });
    setMessage('');
  };

  const handleDeleteTask = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete task "${name}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchTasks();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete task error:', error);
        setMessage('Failed to delete task.');
      }
    }
  };

  // --- NEW: Bug Handlers ---
  const handleBugFormChange = (e) => {
    setNewBug({ ...newBug, [e.target.name]: e.target.value });
    if (editingBug) {
      setEditingBug({ ...editingBug, [e.target.name]: e.target.value });
    }
  };

  const handleAddBugSubmit = async (e) => {
    e.preventDefault();

    let url = 'http://localhost:5000/api/bugs';
    let method = 'POST';
    let bugData = newBug;

    if (editingBug) {
      url = `http://localhost:5000/api/bugs/${editingBug.id}`;
      method = 'PUT';
      bugData = editingBug;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bugData),
      });
      const data = await response.json();
      if (response.ok) {
        scrollToFormAndShowMessage(data.message);
        setNewBug({ project_id: '', name: '', severity: 'Medium', status: 'Open', reported_date: new Date().toISOString().split('T')[0] });
        setEditingBug(null);
        fetchBugs();
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Bug operation error:', error);
      setMessage('Failed to perform bug operation.');
    }
  };

  const handleEditBug = (bug) => {
    setEditingBug({ ...bug });
    setNewBug({
      project_id: bug.project_id,
      name: bug.name,
      severity: bug.severity,
      status: bug.status,
      reported_date: bug.reported_date
    });
    scrollToFormAndShowMessage('Now editing bug. Make your changes above and click "Update Bug".');
  };

  const handleCancelEditBug = () => {
    setEditingBug(null);
    setNewBug({ project_id: '', name: '', severity: 'Medium', status: 'Open', reported_date: new Date().toISOString().split('T')[0] });
    setMessage('');
  };

  const handleDeleteBug = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete bug "${name}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/bugs/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          fetchBugs();
        } else {
          setMessage(data.message);
        }
      } catch (error) {
        console.error('Delete bug error:', error);
        setMessage('Failed to delete bug.');
      }
    }
  };


  // --- Settings Handlers (Hardcoded, no backend interaction for saving) ---
  const handleToggleDarkMode = () => {
    setIsDarkModeEnabled(prev => !prev);
    setMessage('Dark mode preference updated (local only).');
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setMessage("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
      setMessage("Desktop notification permission already granted.");
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (permission) {
        if (permission === "granted") {
          setMessage("Desktop notification permission granted!");
        }
      });
    }
  };

  const sendTestProjectReminder = async () => {
    if (!loggedInUserId) {
      setMessage("Please start the demo first to send a test reminder.");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/send-test-project-reminder/${loggedInUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Test reminder error:', error);
      setMessage('Failed to send test project reminder.');
    }
  };


  // --- Render Logic ---
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
        backgroundColor: primaryBgColor, color: textColor, fontSize: '2em'
      }}>
        Loading Application...
      </div>
    );
  }

  // Welcome Page (replaces login page entirely)
  if (!isLoggedIn) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh',
        backgroundColor: primaryBgColor, padding: '20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <img
          src="Syntech.png" // Use direct path for local image
          alt="Syntech Software Logo"
          style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
        />
        <h1 style={{ color: lightTextColor, marginBottom: '20px', textAlign: 'center', fontSize: '2.5em' }}>
          Welcome to Renias's Syntech Software Project Management Demo Application!!
        </h1>
        <p style={{ color: mutedTextColor, textAlign: 'center', fontSize: '1.2em', marginBottom: '30px' }}>
          I created this application for managing my companies clients, services, quotes, projects, and invoices.
        </p>

        <button onClick={handleStartDemo} style={{
          padding: '15px 30px', backgroundColor: accentColor, color: lightTextColor, border: 'none',
          borderRadius: '8px', cursor: 'pointer', fontSize: '1.5em', fontWeight: 'bold',
          transition: 'background-color 0.2s, transform 0.2s',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = infoColor}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = accentColor}
        >
          Start Demo
        </button>
      </div>
    );
  }

  // Main Application Layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: primaryBgColor, color: textColor, flexDirection: 'row' }}> {/* Changed to row direction for sidebar and content */}
      {/* Sidebar Navigation */}
      <nav style={{
        width: screenWidth < 768 ? '180px' : '220px', // Fixed width for sidebar
        backgroundColor: secondaryBgColor,
        padding: '20px',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0, // Prevent sidebar from shrinking
      }}>
        <div>
          <h2 style={{ color: lightTextColor, marginBottom: '30px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <img
              src="Syntech.png"
              alt="Syntech Logo"
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
            Syntech App
          </h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('home')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'home' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaHome /> Home
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('clients')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'clients' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaUsers /> Clients
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('services')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'services' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaFileInvoiceDollar /> Services
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('quotes')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'quotes' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaFileInvoiceDollar /> Quotes
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('projects')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'projects' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaProjectDiagram /> Projects
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('invoices')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'invoices' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaFileInvoiceDollar /> Invoices
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('taskOverview')} style={{ // New Task Overview button
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'taskOverview' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaClipboardList /> Task Overview
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button onClick={() => setCurrentPage('settings')} style={{
                background: 'none', border: 'none', color: textColor, fontSize: '1.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '5px',
                backgroundColor: currentPage === 'settings' ? darkSecondaryBg : 'transparent',
                transition: 'background-color 0.2s'
              }}>
                <FaCog /> Settings
              </button>
            </li>
          </ul>
        </div>
        <button onClick={handleLogout} style={{
          background: 'none', border: `2px solid ${dangerColor}`, color: dangerColor, fontSize: '1.1em', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', borderRadius: '6px',
          transition: 'background-color 0.2s, color 0.2s', marginTop: 'auto'
        }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = dangerColor; e.currentTarget.style.color = lightTextColor; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = dangerColor; }}
        >
          <FaSignOutAlt /> Logout
        </button>
      </nav>

      {/* Main Content Area and Footer Wrapper - This div now takes all remaining horizontal space */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <main style={{
          flexGrow: 1, // Main content takes all available vertical space in this column
          padding: screenWidth < 768 ? '15px' : '20px', // Adjust padding for smaller screens
          backgroundColor: primaryBgColor, // Background for the content area
          // Removed marginLeft here. The flex container handles the side-by-side layout.
        }}>
          {message && (
            <div style={{
              backgroundColor: infoColor, color: lightTextColor, padding: '10px', borderRadius: '5px', marginBottom: '20px',
              textAlign: 'center', fontWeight: 'bold'
            }}>
              {message}
            </div>
          )}

          {/* Home Page */}
          {currentPage === 'home' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>
                Welcome to my Syntech Software Project Management Application!!
              </h1>
              <p style={{ color: mutedTextColor, textAlign: 'center', fontSize: '1.1em', marginBottom: '40px' }}>
  This project is a comprehensive full-stack Project Management Application designed to streamline client, service, quote, project, invoice, task, and bug tracking. On the frontend, I leveraged React.js to build a dynamic, responsive, and intuitive user interface, demonstrating proficiency in component-based architecture, state management, and modern UI/UX principles. The robust backend is powered by Node.js with Express.js, providing a RESTful API for efficient data handling and business logic, with SQLite3 serving as the relational database for persistent storage. Key functionalities include secure user authentication (using `bcrypt` and `express-session`), comprehensive CRUD operations across all modules, and integration with `nodemailer` for email notifications and `node-cron` for scheduled reminders. While the core functionalities are robust, the Task Overview page, in particular, is currently presented as a demo with limited write functionality to showcase the interface rather than full data persistence in this portfolio version. This application showcases my ability to develop scalable and maintainable web solutions, manage data persistence, and integrate third-party services, all while addressing a practical business need.
</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px' }}>
                {/* Feature Section 1: Client Management */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: darkSecondaryBg, padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
                  <FaUsers size={100} color={accentColor} style={{ marginBottom: '15px' }} />
                  <h3 style={{ color: lightTextColor, marginBottom: '10px', textAlign: 'center' }}>Streamlined Client Management</h3> {/* White Heading */}
                  <p style={{ color: textColor, textAlign: 'center', flexGrow: 1 }}>
                    Keep track of all your client details, communication history, and project associations in one place.
                  </p>
                  <button onClick={() => setCurrentPage('clients')} style={{
                    marginTop: '20px', padding: '10px 20px', backgroundColor: accentColor, color: lightTextColor,
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s',
                    width: '100%', maxWidth: '200px'
                  }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = infoColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = accentColor}
                  >
                    Manage Clients
                  </button>
                </div>

                {/* Feature Section 2: Quote & Invoice Generation */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: darkSecondaryBg, padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
                  <FaFileInvoiceDollar size={100} color={accentColor} style={{ marginBottom: '15px' }} />
                  <h3 style={{ color: lightTextColor, marginBottom: '10px', textAlign: 'center' }}>Effortless Quote & Invoice Creation</h3> {/* White Heading */}
                  <p style={{ color: textColor, textAlign: 'center', flexGrow: 1 }}>
                    Generate professional quotes and convert them into invoices with just a few clicks.
                  </p>
                  <button onClick={() => setCurrentPage('quotes')} style={{
                    marginTop: '20px', padding: '10px 20px', backgroundColor: accentColor, color: lightTextColor,
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s',
                    width: '100%', maxWidth: '200px'
                  }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = infoColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = accentColor}
                  >
                    Create Quotes
                  </button>
                </div>

                {/* Feature Section 3: Project Tracking */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: darkSecondaryBg, padding: '25px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
                  <FaProjectDiagram size={100} color={accentColor} style={{ marginBottom: '15px' }} />
                  <h3 style={{ color: lightTextColor, marginBottom: '10px', textAlign: 'center' }}>Comprehensive Project Tracking</h3> {/* White Heading */}
                  <p style={{ color: textColor, textAlign: 'center', flexGrow: 1 }}>
                    Monitor project progress, due dates, and associated clients and services.
                  </p>
                  <button onClick={() => setCurrentPage('projects')} style={{
                    marginTop: '20px', padding: '10px 20px', backgroundColor: accentColor, color: lightTextColor,
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s',
                    width: '100%', maxWidth: '200px'
                  }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = infoColor}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = accentColor}
                  >
                    Track Projects
                  </button>
                </div>
              </div>

              {/* About Syntech Software */}
              <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: `1px solid ${isDarkModeEnabled ? '#4B6584' : '#E0E0E0'}` }}>
                <h2 style={{ color: lightTextColor, marginBottom: '20px', textAlign: 'center' }}>About Syntech Software</h2> {/* White Heading */}
                <p style={{ color: textColor, textAlign: 'center', lineHeight: '1.6' }}>
                  Syntech Software is dedicated to providing intuitive and powerful tools for small to medium-sized businesses. Our mission is to simplify your administrative tasks, allowing you to focus on what you do best: growing your business and serving your clients. We believe in clean design, robust functionality, and a user-friendly experience.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '30px' }}>
                  <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', maxWidth: '400px' }}>
                    <h4 style={{ color: lightTextColor, marginBottom: '5px' }}>Our Vision</h4> {/* White Heading */}
                    <p style={{ color: mutedTextColor, textAlign: 'center' }}>To empower businesses with technology that simplifies operations and fosters growth.</p>
                  </div>
                  <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', maxWidth: '400px' }}>
                    <h4 style={{ color: lightTextColor, marginBottom: '5px' }}>Our Values</h4> {/* White Heading */}
                    <p style={{ color: mutedTextColor, textAlign: 'center' }}>Innovation, User-Centric Design, Reliability, and Support.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clients Page */}
          {currentPage === 'clients' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Client Management</h1>

              {/* Add/Edit Client Form */}
              <div ref={formRef} style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
                <form onSubmit={handleClientSubmit} style={{ display: 'grid', gridTemplateColumns: screenWidth < 768 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  <input
                    type="text"
                    name="name"
                    placeholder="Client Name"
                    value={editingClient ? editingClient.name : newClient.name}
                    onChange={handleClientFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={editingClient ? editingClient.email : newClient.email}
                    onChange={handleClientFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone (Optional)"
                    value={editingClient ? editingClient.phone : newClient.phone}
                    onChange={handleClientFormChange}
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <input
                    type="text"
                    name="company"
                    placeholder="Company (Optional)"
                    value={editingClient ? editingClient.company : newClient.company}
                    onChange={handleClientFormChange}
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <textarea
                    name="notes"
                    placeholder="Notes (Optional)"
                    value={editingClient ? editingClient.notes : newClient.notes}
                    onChange={handleClientFormChange}
                    style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, minHeight: '80px' }}
                  ></textarea>
                  <div style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexDirection: screenWidth < 768 ? 'column' : 'row' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      {editingClient ? 'Update Client' : 'Add Client'}
                    </button>
                    {editingClient && (
                      <button type="button" onClick={handleCancelEdit} style={{ padding: '10px 18px', backgroundColor: defaultButtonColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Client List */}
              <h2 style={{ color: accentColor, marginBottom: '15px', textAlign: 'center' }}>All Clients</h2>
              {clients.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No clients added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '250px' : '300px'}, 1fr))`, gap: '20px' }}>
                  {clients.map(client => (
                    <div key={client.id} style={{ backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <h3 style={{ color: textColor, marginBottom: '5px' }}>{client.name}</h3>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Email: {client.email}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Phone: {client.phone}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Company: {client.company}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Notes: {client.notes}</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEditClient(client)} style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteClient(client.id, client.name)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services Page */}
          {currentPage === 'services' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Service Management</h1>

              {/* Add New Service Form */}
              <div ref={formRef} style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>Add New Service</h2>
                <form onSubmit={handleAddService} style={{ display: 'grid', gridTemplateColumns: screenWidth < 768 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  <input
                    type="text"
                    name="name"
                    placeholder="Service Name"
                    value={newService.name}
                    onChange={handleServiceFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <input
                    type="number"
                    name="price"
                    placeholder="Price"
                    value={newService.price}
                    onChange={handleServiceFormChange}
                    required
                    min="0"
                    step="0.01"
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <select
                    name="unit"
                    value={newService.unit}
                    onChange={handleServiceFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="per hour">Per Hour</option>
                    <option value="per day">Per Day</option>
                    <option value="per month">Per Month</option>
                    <option value="per unit">Per Unit</option>
                  </select>
                  <textarea
                    name="description"
                    placeholder="Description (Optional)"
                    value={newService.description}
                    onChange={handleServiceFormChange}
                    style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, minHeight: '80px' }}
                  ></textarea>
                  <div style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      Add Service
                    </button>
                  </div>
                </form>
              </div>

              {/* Service List */}
              <h2 style={{ color: accentColor, marginBottom: '15px', textAlign: 'center' }}>All Services</h2>
              {services.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No services added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '250px' : '300px'}, 1fr))`, gap: '20px' }}>
                  {services.map(service => (
                    <div key={service.id} style={{ backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <h3 style={{ color: textColor, marginBottom: '5px' }}>{service.name}</h3>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Description: {service.description}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Price: {userSettings.currency_symbol}{service.price.toFixed(2)} {service.unit}</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => handleDeleteService(service.id, service.name)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quotes Page */}
          {currentPage === 'quotes' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Quote Management</h1>

              {/* Add/Edit Quote Form */}
              <div ref={formRef} style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>{editingQuote ? 'Edit Quote' : 'Create New Quote'}</h2>
                <form onSubmit={handleQuoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <label style={{ color: textColor }}>
                    Client:
                    <select
                      value={selectedClientForQuote}
                      onChange={(e) => setSelectedClientForQuote(e.target.value)}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="">Select a Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name} ({client.company})</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ color: textColor }}>
                    Status:
                    <select
                      value={newQuoteStatus}
                      onChange={(e) => setNewQuoteStatus(e.target.value)}
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </label>

                  <textarea
                    placeholder="Notes (Optional)"
                    value={newQuoteNotes}
                    onChange={(e) => setNewQuoteNotes(e.target.value)}
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, minHeight: '80px', marginTop: '15px' }}
                  ></textarea>

                  <h3 style={{ color: accentColor, marginTop: '20px', marginBottom: '10px' }}>Quote Items</h3>
                  <div style={{ border: `1px solid ${mutedTextColor}`, borderRadius: '8px', padding: '15px', backgroundColor: primaryBgColor }}>
                    {currentQuoteItems.length === 0 ? (
                      <p style={{ color: mutedTextColor, textAlign: 'center' }}>No items added to this quote yet.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {currentQuoteItems.map((item, index) => (
                          <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px dashed ${mutedTextColor}` }}>
                            <span style={{ color: textColor }}>{item.name} x {item.quantity} ({userSettings.currency_symbol}{item.price.toFixed(2)} each)</span>
                            <button type="button" onClick={() => handleRemoveItemFromQuote(index)} style={{ padding: '5px 10px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8em' }}>
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Total Amount Calculator Display */}
                    <p style={{ color: textColor, fontWeight: 'bold', marginTop: '15px', textAlign: 'right', fontSize: '1.4em', padding: '10px', backgroundColor: darkSecondaryBg, borderRadius: '5px' }}>
                      Total Amount: {userSettings.currency_symbol}{calculateQuoteTotal(currentQuoteItems).toFixed(2)}
                    </p>
                  </div>

                  <h3 style={{ color: accentColor, marginTop: '20px', marginBottom: '10px' }}>Add Services to Quote</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '150px' : '200px'}, 1fr))`, gap: '10px' }}>
                    {services.map(service => (
                      <div key={service.id} style={{ backgroundColor: primaryBgColor, padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <p style={{ color: textColor, fontWeight: 'bold' }}>{service.name}</p>
                        <p style={{ color: mutedTextColor, fontSize: '0.8em' }}>{userSettings.currency_symbol}{service.price.toFixed(2)} {service.unit}</p>
                        <button type="button" onClick={() => handleAddServiceToQuote(service.id)} style={{
                          marginTop: '10px', padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor,
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8em', transition: 'background-color 0.2s'
                        }}>
                          Add to Quote
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexDirection: screenWidth < 768 ? 'column' : 'row' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      {editingQuote ? 'Update Quote' : 'Generate Quote'}
                    </button>
                    {editingQuote && (
                      <button type="button" onClick={() => { setEditingQuote(null); setSelectedClientForQuote(""); setCurrentQuoteItems([]); setNewQuoteNotes(""); setNewQuoteStatus('Draft'); }} style={{ padding: '10px 18px', backgroundColor: defaultButtonColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Quote List */}
              <h2 style={{ color: accentColor, marginBottom: '15px', textAlign: 'center' }}>All Quotes</h2>
              {quotes.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No quotes generated yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '280px' : '320px'}, 1fr))`, gap: '20px' }}>
                  {quotes.map(quote => (
                    <div key={quote.id} style={{ backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <h3 style={{ color: textColor, marginBottom: '5px' }}>Quote for {quote.client_name}</h3>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Company: {quote.client_company}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Date: {formatDate(quote.quote_date)}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Status: {quote.status}</p>
                      <p style={{ color: textColor, fontWeight: 'bold', marginTop: '5px' }}>Total: {userSettings.currency_symbol}{quote.total_amount.toFixed(2)}</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleViewQuote(quote)} style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          View Details
                        </button>
                        <button onClick={() => handleEditQuote(quote)} style={{ padding: '8px 15px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteQuote(quote.id)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View Quote Modal/Section */}
              {viewingQuote && (
                <div style={{
                  position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                  <div style={{ backgroundColor: secondaryBgColor, padding: '30px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                    <h2 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Quote Details</h2>
                    <p style={{ color: textColor }}><strong>Client:</strong> {viewingQuote.client_name} ({viewingQuote.client_company})</p>
                    <p style={{ color: textColor }}><strong>Date:</strong> {formatDate(viewingQuote.quote_date)}</p>
                    <p style={{ color: textColor }}><strong>Status:</strong> {viewingQuote.status}</p>
                    <p style={{ color: textColor }}><strong>Notes:</strong> {viewingQuote.notes || 'N/A'}</p>

                    <h3 style={{ color: accentColor, marginTop: '20px', marginBottom: '10px' }}>Items:</h3>
                    <ul style={{ listStyle: 'none', padding: 0, border: `1px solid ${mutedTextColor}`, borderRadius: '5px', backgroundColor: primaryBgColor }}>
                      {viewingQuote.quote_items && viewingQuote.quote_items.map((item, index) => (
                        <li key={index} style={{ padding: '10px', borderBottom: index < viewingQuote.quote_items.length - 1 ? `1px dashed ${mutedTextColor}` : 'none', display: 'flex', justifyContent: 'space-between', color: textColor }}>
                          <span>{item.name} (x{item.quantity})</span>
                          <span>{userSettings.currency_symbol}{(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <p style={{ color: textColor, fontWeight: 'bold', marginTop: '15px', textAlign: 'right', fontSize: '1.2em' }}>
                      Grand Total: {userSettings.currency_symbol}{viewingQuote.total_amount.toFixed(2)}
                    </p>

                    <button onClick={handleCancelViewQuote} style={{
                      marginTop: '30px', padding: '10px 20px', backgroundColor: defaultButtonColor, color: lightTextColor,
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s',
                      width: '100%'
                    }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Projects Page */}
          {currentPage === 'projects' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Project Management</h1>

              {/* Add/Edit Project Form */}
              <div ref={formRef} style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>{editingProject ? 'Edit Project' : 'Add New Project'}</h2>
                <form onSubmit={handleProjectSubmit} style={{ display: 'grid', gridTemplateColumns: screenWidth < 768 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  <input
                    type="text"
                    name="project_name"
                    placeholder="Project Name"
                    value={editingProject ? editingProject.project_name : newProject.project_name}
                    onChange={handleProjectFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <select
                    name="client_id"
                    value={editingProject ? editingProject.client_id : newProject.client_id}
                    onChange={handleProjectFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  >
                    <option value="">Select Client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name} ({client.company})</option>
                    ))}
                  </select>
                  <textarea
                    name="description"
                    placeholder="Description (Optional)"
                    value={editingProject ? editingProject.description : newProject.description}
                    onChange={handleProjectFormChange}
                    style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, minHeight: '80px' }}
                  ></textarea>
                  <label style={{ color: textColor }}>
                    Start Date:
                    <input
                      type="date"
                      name="start_date"
                      value={editingProject ? editingProject.start_date : newProject.start_date}
                      onChange={handleProjectFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    />
                  </label>
                  <label style={{ color: textColor }}>
                    End Date:
                    <input
                      type="date"
                      name="end_date"
                      value={editingProject ? editingProject.end_date : newProject.end_date}
                      onChange={handleProjectFormChange}
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    />
                  </label>
                  <label style={{ color: textColor }}>
                    Status:
                    <select
                      name="status"
                      value={editingProject ? editingProject.status : newProject.status}
                      onChange={handleProjectFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    >
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>
                  <textarea
                    name="notes"
                    placeholder="Internal Notes (Optional)"
                    value={editingProject ? editingProject.notes : newProject.notes}
                    onChange={handleProjectFormChange}
                    style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, minHeight: '80px' }}
                  ></textarea>
                  <div style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexDirection: screenWidth < 768 ? 'column' : 'row' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      {editingProject ? 'Update Project' : 'Add Project'}
                    </button>
                    {editingProject && (
                      <button type="button" onClick={() => { setEditingProject(null); setNewProject({ project_name: "", client_id: "", description: "", start_date: "", end_date: "", status: "Planning", notes: "" }); }} style={{ padding: '10px 18px', backgroundColor: defaultButtonColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Project List */}
              <h2 style={{ color: accentColor, marginBottom: '15px', textAlign: 'center' }}>All Projects</h2>
              {projects.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No projects added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '280px' : '320px'}, 1fr))`, gap: '20px' }}>
                  {projects.map(project => (
                    <div key={project.id} style={{ backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <h3 style={{ color: textColor, marginBottom: '5px' }}>{project.project_name}</h3>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Client: {project.client_name} ({project.client_company})</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Status: {project.status}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Start: {formatDate(project.start_date)}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>End: {formatDate(project.end_date)}</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleViewProject(project)} style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          View Details
                        </button>
                        <button onClick={() => handleEditProject(project)} style={{ padding: '8px 15px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteProject(project.id, project.project_name)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View Project Modal/Section */}
              {viewingProject && (
                <div style={{
                  position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                  <div style={{ backgroundColor: secondaryBgColor, padding: '30px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                    <h2 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Project Details</h2>
                    <p style={{ color: textColor }}><strong>Project Name:</strong> {viewingProject.project_name}</p>
                    <p style={{ color: textColor }}><strong>Client:</strong> {viewingProject.client_name} ({viewingProject.client_company})</p>
                    <p style={{ color: textColor }}><strong>Description:</strong> {viewingProject.description || 'N/A'}</p>
                    <p style={{ color: textColor }}><strong>Start Date:</strong> {formatDate(viewingProject.start_date)}</p>
                    <p style={{ color: textColor }}><strong>End Date:</strong> {formatDate(viewingProject.end_date)}</p>
                    <p style={{ color: textColor }}><strong>Status:</strong> {viewingProject.status}</p>
                    <p style={{ color: textColor }}><strong>Notes:</strong> {viewingProject.notes || 'N/A'}</p>

                    <button onClick={handleCancelViewProject} style={{
                      marginTop: '30px', padding: '10px 20px', backgroundColor: defaultButtonColor, color: lightTextColor,
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s',
                      width: '100%'
                    }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invoices Page (NEW) */}
          {currentPage === 'invoices' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Invoice Management</h1>

              {/* Add/Edit Invoice Form */}
              <div ref={formRef} style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
                <form onSubmit={handleInvoiceSubmit} style={{ display: 'grid', gridTemplateColumns: screenWidth < 768 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  {/* Client Select */}
                  <label style={{ color: textColor, gridColumn: screenWidth < 768 ? 'auto' : '1 / -1' }}>
                    Client:
                    <select
                      name="client_id"
                      value={newInvoice.client_id}
                      onChange={handleInvoiceFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="">Select a Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name} ({client.company})</option>
                      ))}
                    </select>
                  </label>

                  {/* Quote Select (Optional) */}
                  <label style={{ color: textColor }}>
                    Link to Quote (Optional):
                    <select
                      name="quote_id"
                      value={newInvoice.quote_id}
                      onChange={handleInvoiceFormChange}
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="">None</option>
                      {quotes.map(quote => (
                        <option key={quote.id} value={quote.id}>Quote for {quote.client_name} ({formatDate(quote.quote_date)})</option>
                      ))}
                    </select>
                  </label>

                  {/* Project Select (Optional) */}
                  <label style={{ color: textColor }}>
                    Link to Project (Optional):
                    <select
                      name="project_id"
                      value={newInvoice.project_id}
                      onChange={handleInvoiceFormChange}
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="">None</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.project_name} ({project.client_name})</option>
                      ))}
                    </select>
                  </label>

                  {/* Dates and Status */}
                  <label style={{ color: textColor }}>
                    Invoice Date:
                    <input
                      type="date"
                      name="invoice_date"
                      value={newInvoice.invoice_date}
                      onChange={handleInvoiceFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    />
                  </label>
                  <label style={{ color: textColor }}>
                    Due Date:
                    <input
                      type="date"
                      name="due_date"
                      value={newInvoice.due_date}
                      onChange={handleInvoiceFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    />
                  </label>
                  <label style={{ color: textColor }}>
                    Status:
                    <select
                      name="status"
                      value={newInvoice.status}
                      onChange={handleInvoiceFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>

                  {/* Notes */}
                  <textarea
                    name="notes"
                    placeholder="Notes (Optional)"
                    value={newInvoice.notes}
                    onChange={handleInvoiceFormChange}
                    style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, minHeight: '80px' }}
                  ></textarea>

                  <h3 style={{ color: accentColor, marginTop: '20px', marginBottom: '10px', gridColumn: screenWidth < 768 ? 'auto' : '1 / -1' }}>Invoice Items</h3>
                  <div style={{ border: `1px solid ${mutedTextColor}`, borderRadius: '8px', padding: '15px', backgroundColor: primaryBgColor, gridColumn: screenWidth < 768 ? 'auto' : '1 / -1' }}>
                    {currentInvoiceItems.length === 0 ? (
                      <p style={{ color: mutedTextColor, textAlign: 'center' }}>No items added to this invoice yet.</p>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {currentInvoiceItems.map((item, index) => (
                          <li key={index} style={{ padding: '10px', borderBottom: index < currentInvoiceItems.length - 1 ? `1px dashed ${mutedTextColor}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: textColor }}>
                            <span>{item.name} (x{item.quantity})</span>
                            <span>{userSettings.currency_symbol}{(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p style={{ color: textColor, fontWeight: 'bold', marginTop: '15px', textAlign: 'right' }}>
                      Total: {userSettings.currency_symbol}{calculateInvoiceTotal(currentInvoiceItems).toFixed(2)}
                    </p>
                  </div>

                  <h3 style={{ color: accentColor, marginTop: '20px', marginBottom: '10px', gridColumn: screenWidth < 768 ? 'auto' : '1 / -1' }}>Add Services to Invoice</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '150px' : '200px'}, 1fr))`, gap: '10px', gridColumn: screenWidth < 768 ? 'auto' : '1 / -1' }}>
                    {services.map(service => (
                      <div key={service.id} style={{ backgroundColor: primaryBgColor, padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <p style={{ color: textColor, fontWeight: 'bold' }}>{service.name}</p>
                        <p style={{ color: mutedTextColor, fontSize: '0.8em' }}>{userSettings.currency_symbol}{service.price.toFixed(2)} {service.unit}</p>
                        <button type="button" onClick={() => handleAddServiceToInvoice(service.id)} style={{
                          marginTop: '10px', padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor,
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8em', transition: 'background-color 0.2s'
                        }}>
                          Add to Invoice
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', flexDirection: screenWidth < 768 ? 'column' : 'row' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                    </button>
                    {editingInvoice && (
                      <button type="button" onClick={() => {
                        setEditingInvoice(null);
                        setNewInvoice({
                          client_id: '', quote_id: '', project_id: '',
                          invoice_date: new Date().toISOString().split('T')[0],
                          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          status: 'Draft', total_amount: 0, notes: '', invoice_items: []
                        });
                        setCurrentInvoiceItems([]);
                      }} style={{ padding: '10px 18px', backgroundColor: defaultButtonColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Invoice List */}
              <h2 style={{ color: accentColor, marginBottom: '15px', textAlign: 'center' }}>All Invoices</h2>
              {invoices.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No invoices created yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${screenWidth < 768 ? '280px' : '320px'}, 1fr))`, gap: '20px' }}>
                  {invoices.map(invoice => (
                    <div key={invoice.id} style={{ backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <h3 style={{ color: textColor, marginBottom: '5px' }}>Invoice for {invoice.client_name}</h3>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Company: {invoice.client_company}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Invoice Date: {formatDate(invoice.invoice_date)}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Due Date: {formatDate(invoice.due_date)}</p>
                      <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Status: {invoice.status}</p>
                      <p style={{ color: textColor, fontWeight: 'bold', marginTop: '5px' }}>Total: {userSettings.currency_symbol}{invoice.total_amount.toFixed(2)}</p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleViewInvoice(invoice)} style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          View Details
                        </button>
                        <button onClick={() => handleEditInvoice(invoice)} style={{ padding: '8px 15px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteInvoice(invoice.id)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* View Invoice Modal/Section */}
              {viewingInvoice && (
                <div style={{
                  position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                  <div style={{ backgroundColor: secondaryBgColor, padding: '30px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                    <h2 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Invoice Details</h2>
                    <p style={{ color: textColor }}><strong>Client:</strong> {viewingInvoice.client_name} ({viewingInvoice.client_company})</p>
                    {viewingInvoice.quote_id && <p style={{ color: textColor }}><strong>Linked Quote:</strong> Quote #{viewingInvoice.quote_id}</p>}
                    {viewingInvoice.project_id && <p style={{ color: textColor }}><strong>Linked Project:</strong> {viewingInvoice.project_name}</p>}
                    <p style={{ color: textColor }}><strong>Invoice Date:</strong> {formatDate(viewingInvoice.invoice_date)}</p>
                    <p style={{ color: textColor }}><strong>Due Date:</strong> {formatDate(viewingInvoice.due_date)}</p>
                    <p style={{ color: textColor }}><strong>Status:</strong> {viewingInvoice.status}</p>
                    <p style={{ color: textColor }}><strong>Notes:</strong> {viewingInvoice.notes || 'N/A'}</p>

                    <h3 style={{ color: accentColor, marginTop: '20px', marginBottom: '10px' }}>Items:</h3>
                    <ul style={{ listStyle: 'none', padding: 0, border: `1px solid ${mutedTextColor}`, borderRadius: '5px', backgroundColor: primaryBgColor }}>
                      {viewingInvoice.invoice_items && viewingInvoice.invoice_items.map((item, index) => (
                        <li key={index} style={{ padding: '10px', borderBottom: index < viewingInvoice.invoice_items.length - 1 ? `1px dashed ${mutedTextColor}` : 'none', display: 'flex', justifyContent: 'space-between', color: textColor }}>
                          <span>{item.name} (x{item.quantity})</span>
                          <span>{userSettings.currency_symbol}{(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <p style={{ color: textColor, fontWeight: 'bold', marginTop: '15px', textAlign: 'right', fontSize: '1.2em' }}>
                      Grand Total: {userSettings.currency_symbol}{viewingInvoice.total_amount.toFixed(2)}
                    </p>

                    <button onClick={handleCancelViewInvoice} style={{
                      marginTop: '30px', padding: '10px 20px', backgroundColor: defaultButtonColor, color: lightTextColor,
                      border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s',
                      width: '100%'
                    }}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Overview Page (NEW) */}
          {currentPage === 'taskOverview' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>Task & Bug Overview</h1>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${screenWidth < 768 ? '150px' : '200px'}, 1fr))`, gap: '20px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: darkSecondaryBg, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <FaProjectDiagram size={40} color={infoColor} style={{ marginBottom: '10px' }} />
                  <h3 style={{ color: textColor, fontSize: '1.1em' }}>Total Project</h3>
                  <p style={{ color: accentColor, fontSize: '1.8em', fontWeight: 'bold' }}>{projects.length}</p>
                </div>
                <div style={{ backgroundColor: darkSecondaryBg, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <FaClipboardList size={40} color={successColor} style={{ marginBottom: '10px' }} />
                  <h3 style={{ color: textColor, fontSize: '1.1em' }}>Total Task</h3>
                  <p style={{ color: accentColor, fontSize: '1.8em', fontWeight: 'bold' }}>{tasks.length}</p>
                </div>
                <div style={{ backgroundColor: darkSecondaryBg, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <FaBug size={40} color={dangerColor} style={{ marginBottom: '10px' }} />
                  <h3 style={{ color: textColor, fontSize: '1.1em' }}>Total Bug</h3>
                  <p style={{ color: accentColor, fontSize: '1.8em', fontWeight: 'bold' }}>{bugs.length}</p>
                </div>
              </div>

              {/* Add/Edit Task Form */}
              <div ref={formRef} style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
                <form onSubmit={handleAddTaskSubmit} style={{ display: 'grid', gridTemplateColumns: screenWidth < 768 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  <label style={{ color: textColor }}>
                    Project:
                    <select
                      name="project_id"
                      value={editingTask ? editingTask.project_id : newTask.project_id}
                      onChange={handleTaskFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="">Select Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.project_name}</option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Task Name"
                    value={editingTask ? editingTask.name : newTask.name}
                    onChange={handleTaskFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <input
                    type="text"
                    name="category"
                    placeholder="Category (e.g., Design, Backend)"
                    value={editingTask ? editingTask.category : newTask.category}
                    onChange={handleTaskFormChange}
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <label style={{ color: textColor }}>
                    Due Date:
                    <input
                      type="date"
                      name="due_date"
                      value={editingTask ? editingTask.due_date : newTask.due_date}
                      onChange={handleTaskFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    />
                  </label>
                  <label style={{ color: textColor }}>
                    Status:
                    <select
                      name="status"
                      value={editingTask ? editingTask.status : newTask.status}
                      onChange={handleTaskFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </label>
                  <label style={{ color: textColor }}>
                    Priority:
                    <select
                      name="priority"
                      value={editingTask ? editingTask.priority : newTask.priority}
                      onChange={handleTaskFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                  <label style={{ color: textColor, gridColumn: screenWidth < 768 ? 'auto' : '1 / -1' }}>
                    Progress: {editingTask ? editingTask.progress : newTask.progress}%
                    <input
                      type="range"
                      name="progress"
                      min="0"
                      max="100"
                      value={editingTask ? editingTask.progress : newTask.progress}
                      onChange={handleTaskFormChange}
                      style={{ width: 'calc(100% - 20px)', marginLeft: '10px' }}
                    />
                  </label>
                  <div style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexDirection: screenWidth < 768 ? 'column' : 'row' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      {editingTask ? 'Update Task' : 'Add Task'}
                    </button>
                    {editingTask && (
                      <button type="button" onClick={handleCancelEditTask} style={{ padding: '10px 18px', backgroundColor: defaultButtonColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Add/Edit Bug Form */}
              <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: darkSecondaryBg, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ color: accentColor, marginBottom: '15px' }}>{editingBug ? 'Edit Bug' : 'Report New Bug'}</h2>
                <form onSubmit={handleAddBugSubmit} style={{ display: 'grid', gridTemplateColumns: screenWidth < 768 ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  <label style={{ color: textColor }}>
                    Project:
                    <select
                      name="project_id"
                      value={editingBug ? editingBug.project_id : newBug.project_id}
                      onChange={handleBugFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor, width: 'calc(100% - 20px)' }}
                    >
                      <option value="">Select Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.project_name}</option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Bug Description"
                    value={editingBug ? editingBug.name : newBug.name}
                    onChange={handleBugFormChange}
                    required
                    style={{ padding: '10px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                  />
                  <label style={{ color: textColor }}>
                    Severity:
                    <select
                      name="severity"
                      value={editingBug ? editingBug.severity : newBug.severity}
                      onChange={handleBugFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </label>
                  <label style={{ color: textColor }}>
                    Status:
                    <select
                      name="status"
                      value={editingBug ? editingBug.status : newBug.status}
                      onChange={handleBugFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </label>
                  <label style={{ color: textColor }}>
                    Reported Date:
                    <input
                      type="date"
                      name="reported_date"
                      value={editingBug ? editingBug.reported_date : newBug.reported_date}
                      onChange={handleBugFormChange}
                      required
                      style={{ marginLeft: '10px', padding: '8px', borderRadius: '5px', border: `1px solid ${mutedTextColor}`, backgroundColor: primaryBgColor, color: textColor }}
                    />
                  </label>
                  <div style={{ gridColumn: screenWidth < 768 ? 'auto' : '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexDirection: screenWidth < 768 ? 'column' : 'row' }}>
                    <button type="submit" style={{ padding: '10px 18px', backgroundColor: accentColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                      {editingBug ? 'Update Bug' : 'Report Bug'}
                    </button>
                    {editingBug && (
                      <button type="button" onClick={handleCancelEditBug} style={{ padding: '10px 18px', backgroundColor: defaultButtonColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Tasks List */}
              <h2 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>All Tasks</h2>
              {tasks.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No tasks available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {tasks.map(task => (
                    <div key={task.id} style={{
                      backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      display: 'flex', flexDirection: screenWidth < 768 ? 'column' : 'row', alignItems: screenWidth < 768 ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '10px'
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <span style={{ backgroundColor: infoColor, color: lightTextColor, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px', display: 'inline-block' }}>{task.category}</span>
                        <h3 style={{ color: textColor, fontSize: '1.2em', margin: '5px 0' }}>{task.name} <span style={{ color: mutedTextColor, fontSize: '0.9em' }}>({task.project_name})</span></h3>
                        <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Due: {formatDate(task.due_date)}</p>
                        <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Status: {task.status}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: screenWidth < 768 ? '10px' : '0' }}>
                        <span style={{ backgroundColor: (task.priority === 'High' ? dangerColor : (task.priority === 'Medium' ? warningColor : successColor)),
                          color: lightTextColor, padding: '4px 10px', borderRadius: '15px', fontSize: '0.8em', fontWeight: 'bold'
                        }}>
                          {task.priority}
                        </span>
                        {/* Circular Progress Bar */}
                        <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                          <svg width="50" height="50" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke={mutedTextColor}
                              strokeWidth="10"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke={accentColor}
                              strokeWidth="10"
                              strokeDasharray={2 * Math.PI * 45}
                              strokeDashoffset={2 * Math.PI * 45 * (1 - task.progress / 100)}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                            />
                            <text
                              x="50"
                              y="50"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="25"
                              fontWeight="bold"
                              fill={textColor}
                            >
                              {task.progress}%
                            </text>
                          </svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: screenWidth < 768 ? 'column' : 'row', gap: '5px' }}>
                          <button onClick={() => handleEditTask(task)} style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDeleteTask(task.id, task.name)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bugs List */}
              <h2 style={{ color: accentColor, marginBottom: '20px', marginTop: '30px', textAlign: 'center' }}>All Bugs</h2>
              {bugs.length === 0 ? (
                <p style={{ color: mutedTextColor, textAlign: 'center' }}>No bugs reported yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {bugs.map(bug => (
                    <div key={bug.id} style={{
                      backgroundColor: darkSecondaryBg, padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      display: 'flex', flexDirection: screenWidth < 768 ? 'column' : 'row', alignItems: screenWidth < 768 ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '10px'
                    }}>
                      <div style={{ flexGrow: 1 }}>
                        <span style={{ backgroundColor: dangerColor, color: lightTextColor, padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '5px', display: 'inline-block' }}>BUG</span>
                        <h3 style={{ color: textColor, fontSize: '1.2em', margin: '5px 0' }}>{bug.name} <span style={{ color: mutedTextColor, fontSize: '0.9em' }}>({bug.project_name})</span></h3>
                        <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Reported: {formatDate(bug.reported_date)}</p>
                        <p style={{ color: mutedTextColor, fontSize: '0.9em' }}>Status: {bug.status}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: screenWidth < 768 ? '10px' : '0' }}>
                        <span style={{ backgroundColor: (bug.severity === 'Critical' ? '#8B0000' : (bug.severity === 'High' ? dangerColor : (bug.severity === 'Medium' ? warningColor : successColor))),
                          color: lightTextColor, padding: '4px 10px', borderRadius: '15px', fontSize: '0.8em', fontWeight: 'bold'
                        }}>
                          {bug.severity}
                        </span>
                        <div style={{ display: 'flex', flexDirection: screenWidth < 768 ? 'column' : 'row', gap: '5px' }}>
                          <button onClick={() => handleEditBug(bug)} style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                            Edit
                          </button>
                          <button onClick={() => handleDeleteBug(bug.id, bug.name)} style={{ padding: '8px 15px', backgroundColor: dangerColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', transition: 'background-color 0.2s' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Page */}
          {currentPage === 'settings' && (
            <div style={{ padding: '20px', backgroundColor: secondaryBgColor, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <h1 style={{ color: accentColor, marginBottom: '20px', textAlign: 'center' }}>User Settings</h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Dark Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: darkSecondaryBg, borderRadius: '8px' }}>
                  <label style={{ color: textColor, fontSize: '1.1em', fontWeight: 'bold' }}>Dark Mode:</label>
                  <input
                    type="checkbox"
                    checked={isDarkModeEnabled}
                    onChange={handleToggleDarkMode}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>

                {/* Hardcoded Settings Display */}
                <div style={{ padding: '15px', backgroundColor: darkSecondaryBg, borderRadius: '8px' }}>
                  <h3 style={{ color: accentColor, marginBottom: '10px' }}>Personalization Settings (Hardcoded)</h3>
                  <p style={{ color: textColor, marginBottom: '5px' }}><strong>Phonetic Name:</strong> {userSettings.phonetic_name}</p>
                  <p style={{ color: textColor, marginBottom: '5px' }}><strong>Notification Email:</strong> {userSettings.email_for_notifications}</p>
                  <p style={{ color: textColor, marginBottom: '5px' }}><strong>Currency Symbol:</strong> {userSettings.currency_symbol}</p>
                  <p style={{ color: textColor, marginBottom: '5px' }}><strong>Date Format:</strong> {userSettings.date_format}</p>
                  <p style={{ color: textColor, marginBottom: '5px' }}><strong>Sound Effects:</strong> {userSettings.sound_effects_enabled ? 'Enabled' : 'Disabled'}</p>
                  <p style={{ color: textColor, marginBottom: '5px' }}><strong>Phone Number:</strong> {userSettings.phone_number_for_notifications}</p>
                </div>

                {/* Desktop Notifications */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: darkSecondaryBg, borderRadius: '8px' }}>
                  <label style={{ color: textColor, fontSize: '1.1em', fontWeight: 'bold' }}>Desktop Notifications:</label>
                  <input
                    type="checkbox"
                    checked={userSettings.desktop_notifications_enabled}
                    disabled // Disabled as this is hardcoded
                    style={{ width: '20px', height: '20px', cursor: 'not-allowed', opacity: 0.7 }}
                  />
                </div>
                {!userSettings.desktop_notifications_enabled && (
                  <button onClick={requestNotificationPermission}
                    style={{ padding: '8px 15px', backgroundColor: infoColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em', marginTop: '10px', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2980B9'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = infoColor}
                  >
                    Request Desktop Notification Permission
                  </button>
                )}

                {/* Test Project Reminder Button */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${isDarkModeEnabled ? '#4B6584' : '#E0E0E0'}` }}>
                  <button onClick={sendTestProjectReminder}
                    style={{ padding: '10px 18px', backgroundColor: successColor, color: lightTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', transition: 'background-color 0.2s', width: '100%' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#27AE60'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = successColor}
                  >
                    Send Test Project Due Date Reminder
                  </button>
                  <p style={{ fontSize: '0.8em', color: mutedTextColor, marginTop: '5px', textAlign: 'center' }}>
                    Sends a test email reminder for a project due in 5 days to your notification email.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          width: '100%',
          padding: '15px 20px',
          backgroundColor: secondaryBgColor,
          color: mutedTextColor,
          textAlign: 'center',
          fontSize: '0.9em',
          boxShadow: '0 -2px 5px rgba(0,0,0,0.1)',
          flexShrink: 0, // Ensures footer stays at the bottom and doesn't shrink
        }}>
          © 2024 Syntech Software. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default App;