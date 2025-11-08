// ========= API Configuration =========
const API_BASE = 'api/';

// ========= Gmail API Integration =========
class GmailService {
    constructor() {
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.isAuthenticated = false;
        this.initGmailAPI();
    }

    async initGmailAPI() {
        try {
            console.log('🔄 Initializing Gmail API...');
            console.log('Current URL:', window.location.href);
            console.log('Origin:', window.location.origin);
            
            await this.loadGAPI();
            await this.loadGIS();
            this.maybeEnableSendButton();
        } catch (error) {
            console.error('❌ Gmail API initialization failed:', error);
            this.updateEmailStatus('Gmail API initialization failed: ' + error.message, 'error');
        }
    }

    async loadGAPI() {
        return new Promise((resolve, reject) => {
            if (typeof gapi === 'undefined') {
                reject(new Error('Google API client not loaded. Check if https://apis.google.com/js/api.js is loaded.'));
                return;
            }
            
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: '',
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
                    });
                    this.gapiInited = true;
                    console.log('✅ GAPI client initialized');
                    resolve();
                } catch (error) {
                    console.error('❌ Error initializing GAPI client:', error);
                    reject(error);
                }
            });
        });
    }

    async loadGIS() {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject(new Error('Google Identity Services not loaded. Check if https://accounts.google.com/gsi/client is loaded.'));
                return;
            }
            
            try {
                // Use the current origin as redirect URI
                const currentOrigin = window.location.origin;
                console.log('🔧 Using origin for OAuth:', currentOrigin);
                
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GMAIL_CONFIG.web.client_id,
                    scope: 'https://www.googleapis.com/auth/gmail.send',
                    prompt: 'consent',
                    callback: (response) => {
                        if (response.error) {
                            console.error('❌ OAuth2 error:', response.error);
                            this.updateEmailStatus('Authentication failed: ' + response.error, 'error');
                            
                            // Show specific error for redirect URI mismatch
                            if (response.error.includes('redirect_uri')) {
                                showNotification('Redirect URI mismatch. Please check Google Cloud Console configuration.', 'error');
                            }
                        } else {
                            console.log('✅ OAuth2 authentication successful');
                            this.isAuthenticated = true;
                            this.updateEmailStatus('Successfully authenticated with Gmail API', 'success');
                            showNotification('Gmail authentication successful!', 'success');
                        }
                    },
                });
                this.gisInited = true;
                console.log('✅ GIS client initialized');
                resolve();
            } catch (error) {
                console.error('❌ Error initializing GIS client:', error);
                reject(error);
            }
        });
    }

    // ... rest of the GmailService class remains the same ...

    async loadGIS() {
        return new Promise((resolve, reject) => {
            if (typeof google === 'undefined') {
                reject(new Error('Google Identity Services not loaded. Check if https://accounts.google.com/gsi/client is loaded.'));
                return;
            }
            
            try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GMAIL_CONFIG.web.client_id,
                    scope: 'https://www.googleapis.com/auth/gmail.send',
                    callback: (response) => {
                        if (response.error) {
                            console.error('❌ OAuth2 error:', response.error);
                            this.updateEmailStatus('Authentication failed: ' + response.error, 'error');
                        } else {
                            console.log('✅ OAuth2 authentication successful');
                            this.isAuthenticated = true;
                            this.updateEmailStatus('Successfully authenticated with Gmail API', 'success');
                        }
                    },
                });
                this.gisInited = true;
                console.log('✅ GIS client initialized');
                resolve();
            } catch (error) {
                console.error('❌ Error initializing GIS client:', error);
                reject(error);
            }
        });
    }

    maybeEnableSendButton() {
        if (this.gapiInited && this.gisInited) {
            console.log('✅ Gmail API fully initialized');
            this.updateEmailStatus('Gmail API ready - Click "Authenticate" to continue', 'info');
        }
    }

    updateEmailStatus(message, type = 'info') {
        const statusElement = document.getElementById('emailConfigStatus');
        if (statusElement) {
            statusElement.innerHTML = message;
            statusElement.style.color = type === 'error' ? '#e53e3e' : 
                                      type === 'success' ? '#38a169' : 
                                      type === 'warning' ? '#dd6b20' : '#4a5568';
            statusElement.style.fontWeight = '500';
        }
        console.log(`📧 Email Status [${type}]:`, message);
    }

    // Get authentication token
    async getToken() {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Token client not initialized'));
                return;
            }

            // If we already have a valid token, use it
            const existingToken = gapi.client.getToken();
            if (existingToken) {
                console.log('✅ Using existing token');
                resolve(existingToken);
                return;
            }

            // Request new token
            this.tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                    return;
                }
                console.log('✅ New token acquired');
                this.isAuthenticated = true;
                resolve(gapi.client.getToken());
            };

            console.log('🔄 Requesting OAuth2 token...');
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    // Send email function
    async sendEmail(to, subject, message) {
        try {
            console.log('📧 Attempting to send email to:', to);
            
            // Ensure we have a valid token
            await this.getToken();

            const emailLines = [
                'Content-Type: text/plain; charset="UTF-8"',
                'MIME-Version: 1.0',
                'Content-Transfer-Encoding: 7bit',
                'From: "JHCSC BioAttend System" <noreply@jhcerilles.edu.ph>',
                `To: ${to}`,
                `Subject: ${subject}`,
                '',
                message
            ];

            const email = emailLines.join('\r\n');
            
            // Base64 encode the email (URL-safe)
            const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            console.log('🔄 Sending email via Gmail API...');
            
            const request = gapi.client.gmail.users.messages.send({
                'userId': 'me',
                'resource': {
                    'raw': base64EncodedEmail
                }
            });

            const response = await request;
            console.log('✅ Email sent successfully:', response);
            return response;

        } catch (error) {
            console.error('❌ Error sending email:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to send email';
            if (error.error === 'access_denied') {
                errorMessage = 'Access denied. Please grant Gmail permissions.';
            } else if (error.error === 'invalid_grant') {
                errorMessage = 'Authentication expired. Please re-authenticate.';
            } else if (error.error_description) {
                errorMessage = error.error_description;
            }
            
            throw new Error(errorMessage);
        }
    }

    // Check if service is ready
    isReady() {
        return this.gapiInited && this.gisInited && this.isAuthenticated;
    }

    // Manual authentication trigger
    async authenticate() {
        try {
            console.log('🔄 Starting manual authentication...');
            await this.getToken();
            return true;
        } catch (error) {
            console.error('❌ Manual authentication failed:', error);
            this.updateEmailStatus('Authentication failed: ' + error.message, 'error');
            return false;
        }
    }
}

// Initialize Gmail service globally
let gmailService = null;

// ========= Enhanced Email Functions =========
async function initializeGmailService() {
    try {
        if (!gmailService) {
            console.log('🔄 Creating new Gmail service instance...');
            gmailService = new GmailService();
            
            // Wait for initialization
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (!gmailService.isReady()) {
                console.log('⚠️ Gmail service not ready, manual authentication required');
                showNotification('Gmail service needs authentication. Click "Authenticate Gmail" in settings.', 'warning');
            }
        }
        return gmailService;
    } catch (error) {
        console.error('❌ Failed to initialize Gmail service:', error);
        showNotification('Failed to initialize email service', 'error');
        return null;
    }
}

async function sendAttendanceNotification(studentEmail, studentName, eventName, attendanceTime, action = 'IN') {
    try {
        const service = await initializeGmailService();
        if (!service) {
            console.warn('❌ Gmail service not available');
            return false;
        }

        // Ensure authentication
        if (!service.isAuthenticated) {
            console.log('🔄 Service not authenticated, attempting authentication...');
            const authenticated = await service.authenticate();
            if (!authenticated) {
                showNotification('Please authenticate Gmail to send notifications', 'warning');
                return false;
            }
        }

        const actionText = action === 'IN' ? 'Time In' : 'Time Out';
        const subject = `Attendance ${actionText} Confirmation - ${eventName}`;
        const message = `
Dear ${studentName},

Your ${actionText.toLowerCase()} has been successfully recorded:

Event: ${eventName}
${actionText} Time: ${attendanceTime}
Date: ${new Date().toLocaleDateString()}

This is an automated confirmation from the J.H Cerilles State College
Biometric Attendance System.

Thank you for your participation.

Best regards,
J.H Cerilles State College
Biometric Attendance System
        `.trim();

        await service.sendEmail(studentEmail, subject, message);
        showNotification(`✅ Attendance confirmation sent to ${studentEmail}`, 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to send attendance notification:', error);
        showNotification(`❌ Failed to send email: ${error.message}`, 'error');
        return false;
    }
}

// Enhanced bulk notification function with better error handling
async function sendBulkAttendanceNotifications(eventId, action = 'IN') {
    try {
        console.log(`🔄 Starting bulk ${action} notifications for event:`, eventId);
        
        const service = await initializeGmailService();
        if (!service) {
            console.warn('❌ Gmail service not available for attendance notifications');
            showNotification('Email service not available - attendance session started anyway', 'warning');
            return false;
        }

        // Get event details
        const events = window.eventsCache || [];
        const event = events.find(e => e.id === eventId);
        
        if (!event) {
            console.warn('❌ Event not found:', eventId);
            showNotification('Event not found', 'error');
            return false;
        }

        // Get all students
        const students = window.studentsCache || [];
        
        if (students.length === 0) {
            console.warn('❌ No students found to notify');
            showNotification('No students found to notify', 'warning');
            return false;
        }

        console.log(`📧 Preparing to send notifications to ${students.length} students`);

        const actionText = action === 'IN' ? 'Time In' : 'Time Out';
        const currentTime = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const subject = `🚨 ATTENDANCE ${actionText.toUpperCase()} STARTED - ${event.name}`;
        const message = `
Dear Student,

ATTENTION: ${actionText} recording for the following event has NOW STARTED:

📋 **Event Details:**
- Event: ${event.name}
- Date: ${currentDate}
- ${actionText} Session: STARTED
- Current Time: ${currentTime}
- Venue: ${event.venue}
- Attendance Type: ${action === 'IN' ? 'Time In' : 'Time Out'}

🔍 **Action Required:**
Please proceed to the ${event.venue} immediately to record your ${actionText.toLowerCase()} using the biometric system.

⏰ **Important:**
- ${actionText} session is now active
- Make sure to record your attendance promptly
- Late entries may not be accepted

This is an automated notification from the J.H Cerilles State College 
Biometric Attendance System.

Best regards,  
J.H Cerilles State College  
Biometric Attendance System  
        `.trim();

        let sentCount = 0;
        let errorCount = 0;
        let failedEmails = [];
        
        // Show progress notification
        showNotification(`Sending ${actionText} notifications to ${students.length} students...`, 'info');
        
        // Send emails to all students with better error handling
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            
            try {
                if (student.email && student.email.includes('@')) {
                    console.log(`📧 Sending to ${student.email} (${i + 1}/${students.length})`);
                    await service.sendEmail(student.email, subject, message);
                    sentCount++;
                    
                    // Update progress every 10 emails
                    if (sentCount % 10 === 0) {
                        showNotification(`Sent ${sentCount}/${students.length} notifications...`, 'info');
                    }
                    
                    // Add small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    console.warn(`⚠️ Invalid email for student ${student.name}: ${student.email}`);
                    errorCount++;
                    failedEmails.push(student.email);
                }
            } catch (error) {
                console.error(`❌ Failed to send to ${student.email}:`, error);
                errorCount++;
                failedEmails.push(student.email);
                
                // If it's an authentication error, break early
                if (error.message.includes('authentication') || error.message.includes('access_denied')) {
                    showNotification('Authentication failed. Please re-authenticate Gmail.', 'error');
                    break;
                }
            }
        }

        console.log(`✅ Sent ${actionText} notifications: ${sentCount} successful, ${errorCount} failed`);
        
        // Show final results
        if (sentCount > 0 && errorCount === 0) {
            showNotification(`✅ ${actionText} started! Notifications sent to ${sentCount} students`, 'success');
        } else if (sentCount > 0) {
            showNotification(`⚠️ ${sentCount} notifications sent, ${errorCount} failed`, 'warning');
            console.log('Failed emails:', failedEmails);
        } else {
            showNotification(`❌ All notifications failed. Check Gmail authentication.`, 'error');
        }
        
        return sentCount > 0;
        
    } catch (error) {
        console.error(`❌ Error sending ${action} notifications:`, error);
        showNotification(`❌ Error sending notifications: ${error.message}`, 'error');
        return false;
    }
}

// Enhanced test function
async function testGmailIntegration() {
    try {
        showNotification('Testing Gmail configuration...', 'info');
        
        const service = await initializeGmailService();
        if (!service) {
            showNotification('❌ Gmail service not initialized', 'error');
            return;
        }

        // Get test email address
        const testEmail = $('#testEmailAddress').value.trim();
        if (!testEmail) {
            showNotification('Please enter a test email address', 'error');
            return;
        }

        // Test authentication first
        service.updateEmailStatus('Testing authentication...', 'info');
        const authenticated = await service.authenticate();
        
        if (!authenticated) {
            service.updateEmailStatus('Authentication failed. Please check Gmail configuration.', 'error');
            showNotification('❌ Authentication failed', 'error');
            return;
        }

        // Send test email
        service.updateEmailStatus('Sending test email...', 'info');
        
        await service.sendEmail(
            testEmail,
            'Test Email from BioAttend System',
            `This is a test email to verify Gmail API integration is working correctly.

Sent: ${new Date().toLocaleString()}
System: JHCSC BioAttend System

If you received this email, the Gmail integration is working properly.

Best regards,
BioAttend System`
        );

        service.updateEmailStatus('✅ Test email sent successfully!', 'success');
        showNotification('✅ Test email sent successfully!', 'success');
        
    } catch (error) {
        console.error('❌ Gmail test failed:', error);
        const statusElement = document.getElementById('emailConfigStatus');
        if (statusElement) {
            statusElement.innerHTML = `❌ Test failed: ${error.message}`;
        }
        showNotification(`❌ Test email failed: ${error.message}`, 'error');
    }
}

// Enhanced email configuration UI
function addEmailConfigurationUI() {
    const settingsCard = $('.card', $('#settings'));
    if (settingsCard && !$('#emailConfigSection')) {
        const emailSection = document.createElement('div');
        emailSection.id = 'emailConfigSection';
        emailSection.innerHTML = `
            <div class="card" style="margin-top: 20px;">
                <div class="header">
                    <h3>Email Configuration</h3>
                </div>
                <div class="form-group">
                    <label>Gmail API Status</label>
                    <div id="emailConfigStatus" style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px;">
                        Initializing...
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn primary" onclick="showModal('emailTestModal')">
                            <i class="fas fa-cog"></i> Configure Email
                        </button>
                        <button class="btn secondary" onclick="manualAuthenticateGmail()">
                            <i class="fas fa-key"></i> Authenticate Gmail
                        </button>
                    </div>
                </div>
            </div>
        `;
        settingsCard.parentNode.insertBefore(emailSection, settingsCard.nextSibling);
    }
}

// Manual authentication function
async function manualAuthenticateGmail() {
    try {
        showNotification('Starting Gmail authentication...', 'info');
        const service = await initializeGmailService();
        if (!service) {
            showNotification('❌ Gmail service not available', 'error');
            return;
        }
        
        const authenticated = await service.authenticate();
        if (authenticated) {
            showNotification('✅ Gmail authentication successful!', 'success');
        } else {
            showNotification('❌ Gmail authentication failed', 'error');
        }
    } catch (error) {
        console.error('❌ Manual authentication failed:', error);
        showNotification(`❌ Authentication failed: ${error.message}`, 'error');
    }
}

// Show email test modal
function showEmailTestModal() {
    const service = window.gmailService;
    if (service) {
        service.updateEmailStatus('Ready for testing...', 'info');
    }
    showModal('emailTestModal');
}

// Send test email from modal
async function sendTestEmail() {
    await testGmailIntegration();
}

// ========= Utilities =========
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmtDate = (dStr) => {
  if (!dStr) return 'N/A';
  return new Date(dStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const fmtTime = (tStr) => {
  if (!tStr) return 'N/A';
  const [h, m] = tStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

const fmtDateTime = (dateStr, timeStr) => {
  return `${fmtDate(dateStr)} ${fmtTime(timeStr)}`;
};

// ========= API Helper Functions =========
async function apiCall(endpoint, data = {}) {
  try {
    const formData = new FormData();
    for (const key in data) {
      formData.append(key, data[key]);
    }
    
    const response = await fetch(API_BASE + endpoint, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.redirect) {
      showAuth();
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

async function apiGet(endpoint, params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    console.log('API GET request:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return { success: false, message: `HTTP Error: ${response.status}` };
    }
    
    const result = await response.json();
    
    if (result.redirect) {
      showAuth();
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

// ========= Notification System =========
function showNotification(message, type = 'success') {
  const notification = $('#notification');
  const icon = $('i', notification);
  const text = $('#notificationText');
  
  notification.className = `notification ${type}`;
  icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  text.textContent = message;
  
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// ========= Modal Functions =========
function showModal(id) {
  $(`#${id}`).classList.remove('hidden');
}

function closeModal(id) {
  $(`#${id}`).classList.add('hidden');
}

// ========= Auth Screens =========
function showAuth() {
  $('#authWrapper').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

async function showApp() {
  const result = await apiCall('auth.php', { action: 'checkSession' });
  
  if (!result.success) {
    showAuth();
    return;
  }
  
  const session = result.data;
  $('#authWrapper').classList.add('hidden');
  $('#app').classList.remove('hidden');

  // Update user information with proper error handling
  updateUserDisplay(session);
  refreshAll();
}

// ========= User Display Functions =========
function updateUserDisplay(session) {
  try {
    // Update sidebar user info
    const adminNameMini = $('#adminNameMini');
    const adminEmailMini = $('#adminEmailMini');
    const avatarInitials = $('#avatarInitials');
    
    // Update topbar user info
    const adminNameTop = $('#adminNameTop');
    const adminRoleTop = $('#adminRoleTop');
    const avatarInitialsTop = $('#avatarInitialsTop');
    
    if (session) {
      // Get initials from name
      const initials = getInitials(session.name);
      
      // Update sidebar
      if (adminNameMini) adminNameMini.textContent = session.name || 'Admin';
      if (adminEmailMini) adminEmailMini.textContent = session.email || 'admin@jhcerilles.edu.ph';
      if (avatarInitials) avatarInitials.textContent = initials;
      
      // Update topbar
      if (adminNameTop) adminNameTop.textContent = session.name || 'Admin';
      if (adminRoleTop) adminRoleTop.textContent = 'Super Admin';
      if (avatarInitialsTop) avatarInitialsTop.textContent = initials;
      
      console.log('User display updated:', {
        name: session.name,
        email: session.email,
        initials: initials
      });
    } else {
      // Fallback to default values
      if (adminNameMini) adminNameMini.textContent = 'Administrator';
      if (adminEmailMini) adminEmailMini.textContent = 'admin@jhcerilles.edu.ph';
      if (avatarInitials) avatarInitials.textContent = 'AD';
      if (adminNameTop) adminNameTop.textContent = 'Administrator';
      if (adminRoleTop) adminRoleTop.textContent = 'Super Admin';
      if (avatarInitialsTop) avatarInitialsTop.textContent = 'AD';
    }
  } catch (error) {
    console.error('Error updating user display:', error);
    // Set fallback values
    $('#adminNameMini').textContent = 'Administrator';
    $('#adminEmailMini').textContent = 'admin@jhcerilles.edu.ph';
    $('#avatarInitials').textContent = 'AD';
    $('#adminNameTop').textContent = 'Administrator';
    $('#adminRoleTop').textContent = 'Super Admin';
    $('#avatarInitialsTop').textContent = 'AD';
  }
}

function getInitials(name) {
  if (!name) return 'AD';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// ========= Admin Register/Login =========
async function registerAdmin(e) {
  e.preventDefault();
  const name = $('#regName').value.trim();
  const email = $('#regEmail').value.trim().toLowerCase();
  const password = $('#regPassword').value;

  const result = await apiCall('auth.php', {
    action: 'register',
    name,
    email,
    password
  });

  if (result.success) {
    showNotification(result.message);
    // Store admin data and update display
    localStorage.setItem('admin', JSON.stringify({ name, email }));
    updateUserDisplay({ name, email });
    showApp();
  } else {
    showNotification(result.message, 'error');
  }
}

async function loginAdmin(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim().toLowerCase();
  const password = $('#loginPassword').value;

  const result = await apiCall('auth.php', {
    action: 'login',
    email,
    password
  });

  if (result.success) {
    showNotification(result.message);
    // Store admin data and update display
    localStorage.setItem('admin', JSON.stringify({ 
      name: result.data.name, 
      email: result.data.email 
    }));
    updateUserDisplay(result.data);
    showApp();
  } else {
    showNotification(result.message, 'error');
  }
}

async function logout() {
  const result = await apiCall('auth.php', { action: 'logout' });
  showNotification(result.message);
  // Clear stored admin data
  localStorage.removeItem('admin');
  showAuth();
}

// ========= Navigation =========
function goSection(id) {
  $$('.section').forEach((s) => s.classList.remove('active'));
  $$('.nav-item').forEach((n) => n.classList.remove('active'));
  $(`.section#${id}`).classList.add('active');
  $(`.nav-item[data-section="${id}"]`)?.classList.add('active');
  $('#sectionTitle').textContent = id[0].toUpperCase() + id.slice(1);

  if (id === 'reports') refreshReports();
  if (id === 'dashboard') drawChart();
}

// ========= Dashboard Functions =========
async function updateDashboardStats() {
  const result = await apiGet('attendance.php', { action: 'getStats' });
  
  if (result.success) {
    const stats = result.data;
    $('#totalStudents').textContent = stats.totalStudents;
    $('#upcomingEvents').textContent = stats.upcomingEvents;
    $('#todayAttendance').textContent = stats.todayAttendance;
    return stats.chartData;
  }
  return [];
}

async function drawChart() {
  const chartData = await updateDashboardStats();
  const ctx = $('#attendanceChart').getContext('2d');
  
  const labels = chartData.map(d => fmtDate(d.date));
  const data = chartData.map(d => d.count);
  
  if (window.attendanceChartInstance) {
    window.attendanceChartInstance.destroy();
  }
  
  window.attendanceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Attendance',
        data: data,
        borderColor: '#1a2a6c',
        backgroundColor: 'rgba(26, 42, 108, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

// ========= Attendance Type Display Handler =========
function updateAttendanceTypeDisplay() {
  const attendanceType = $('#eventAttendanceType').value;
  const eventStart = $('#eventStart').value;
  const eventEnd = $('#eventEnd').value;
  
  let timeDisplay = $('#attendanceTimeDisplay');
  if (!timeDisplay) {
    timeDisplay = document.createElement('div');
    timeDisplay.id = 'attendanceTimeDisplay';
    timeDisplay.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background-color: #f0f4ff;
      border-left: 4px solid #1a2a6c;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      color: #1a2a6c;
    `;
    const attendanceTypeSelect = $('#eventAttendanceType');
    attendanceTypeSelect.parentElement.appendChild(timeDisplay);
  }
  
  if (attendanceType === 'in_only') {
    timeDisplay.innerHTML = `<i class="fas fa-clock"></i> <strong>Event Start Time:</strong> ${eventStart ? fmtTime(eventStart) : 'N/A'}`;
  } else {
    timeDisplay.innerHTML = `<i class="fas fa-clock"></i> <strong>Event Time:</strong> ${eventStart ? fmtTime(eventStart) : 'N/A'} - ${eventEnd ? fmtTime(eventEnd) : 'N/A'}`;
  }
}

// ========= Events CRUD =========
async function refreshEvents() {
  const result = await apiGet('events.php', { action: 'getAll' });
  
  if (!result.success) {
    showNotification('Failed to load events', 'error');
    return;
  }
  
  const events = result.data;
  window.eventsCache = events;
  const tbody = $('#eventsTable tbody');
  tbody.innerHTML = '';
  
  for (const ev of events) {
    const tr = document.createElement('tr');
    const statusClass = 
      ev.status === 'upcoming' ? 'warning' : 
      ev.status === 'ongoing' ? 'success' : 
      ev.status === 'completed' ? 'info' : 'danger';
    
    const attendanceType = ev.attendanceType || 'both';
    const attendanceTypeText = attendanceType === 'in_only' ? 'Time In Only' : 'Time In & Out';
    const attendanceTypeBadge = attendanceType === 'in_only' ? 'info' : 'success';
    
    tr.innerHTML = `
      <td>${ev.name}</td>
      <td>${fmtDate(ev.date)}</td>
      <td>${fmtTime(ev.start)}</td>
      <td>${fmtTime(ev.end)}</td>
      <td>${ev.venue}</td>
      <td><span class="badge ${statusClass}">${ev.status}</span></td>
      <td><span class="badge ${attendanceTypeBadge}">${attendanceTypeText}</span></td>
      <td class="action-buttons">
        <button class="action-btn edit" onclick="editEvent('${ev.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete" onclick="deleteEvent('${ev.id}')">
          <i class="fas fa-trash"></i>
        </button>
        ${attendanceType === 'both' ? `
          <button class="time-btn-in" onclick="timeInEvent('${ev.id}')">
            <i class="fas fa-sign-in-alt"></i> Start In
          </button>
          <button class="time-btn-out" onclick="timeOutEvent('${ev.id}')">
            <i class="fas fa-sign-out-alt"></i> Start Out
          </button>
        ` : `
          <button class="time-btn-in" onclick="timeInEvent('${ev.id}')" style="width: auto; padding: 8px 16px;">
            <i class="fas fa-sign-in-alt"></i> Start Attendance
          </button>
        `}
      </td>`;
    tbody.appendChild(tr);
  }
}

function showEventModal(eventId = null) {
  const modal = $('#eventModal');
  const title = $('#eventModalTitle');
  const form = $('#eventForm');
  
  if (eventId) {
    title.textContent = 'Edit Event';
    const events = window.eventsCache || [];
    const event = events.find(e => e.id === eventId);
    
    if (event) {
      $('#eventId').value = event.id;
      $('#eventName').value = event.name;
      $('#eventDate').value = event.date;
      $('#eventStart').value = event.start;
      $('#eventEnd').value = event.end;
      $('#eventVenue').value = event.venue;
      $('#eventStatus').value = event.status;
      $('#eventAttendanceType').value = event.attendanceType || 'both';
      $('#eventDesc').value = event.desc || '';
    }
  } else {
    title.textContent = 'Add New Event';
    form.reset();
    $('#eventId').value = '';
    $('#eventDate').value = new Date().toISOString().slice(0, 10);
    $('#eventAttendanceType').value = 'both';
  }
  
  setTimeout(updateAttendanceTypeDisplay, 50);
  showModal('eventModal');
}

async function saveEvent(e) {
  e.preventDefault();
  
  const eventId = $('#eventId').value;
  const eventData = {
    action: eventId ? 'update' : 'add',
    id: eventId,
    name: $('#eventName').value,
    date: $('#eventDate').value,
    start: $('#eventStart').value,
    end: $('#eventEnd').value,
    venue: $('#eventVenue').value,
    status: $('#eventStatus').value,
    attendanceType: $('#eventAttendanceType').value,
    desc: $('#eventDesc').value
  };
  
  const result = await apiCall('events.php', eventData);
  
  if (result.success) {
    showNotification(result.message);
    closeModal('eventModal');
    refreshEvents();
    updateDashboardStats();
  } else {
    showNotification(result.message, 'error');
  }
}

function editEvent(eventId) {
  showEventModal(eventId);
}

async function deleteEvent(eventId) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  
  const result = await apiCall('events.php', {
    action: 'delete',
    id: eventId
  });
  
  if (result.success) {
    showNotification(result.message);
    refreshEvents();
    updateDashboardStats();
  } else {
    showNotification(result.message, 'error');
  }
}

async function timeInEvent(eventId) {
    try {
        const events = window.eventsCache || [];
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        // Show loading notification
        showNotification('Opening attendance scanner and sending notifications...', 'info');

        // Send email notifications to all students for this event
        await sendBulkAttendanceNotifications(eventId, 'IN');

        const params = new URLSearchParams({
            eventId: event.id,
            name: event.name,
            action: 'IN',
            date: event.date,
            start: event.start,
            end: event.end,
            time: new Date().toISOString()
        });

        // Redirect to attendance page after a brief delay to show notification
        setTimeout(() => {
            window.location.href = `biometric_attendance/attendance.html?${params.toString()}`;
        }, 1500);

    } catch (error) {
        console.error('Error in timeInEvent:', error);
        showNotification('Error starting attendance session', 'error');
    }
}

async function timeOutEvent(eventId) {
    try {
        const events = window.eventsCache || [];
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        // Show loading notification
        showNotification('Opening attendance scanner and sending notifications...', 'info');

        // Send email notifications to all students for this event
        await sendBulkAttendanceNotifications(eventId, 'OUT');

        const params = new URLSearchParams({
            eventId: event.id,
            name: event.name,
            action: 'OUT',
            date: event.date,
            start: event.start,
            end: event.end,
            time: new Date().toISOString()
        });

        // Redirect to attendance page after a brief delay to show notification
        setTimeout(() => {
            window.location.href = `biometric_attendance/attendance.html?${params.toString()}`;
        }, 1500);

    } catch (error) {
        console.error('Error in timeOutEvent:', error);
        showNotification('Error starting attendance session', 'error');
    }
}

// ========= Students CRUD =========
async function refreshStudents() {
  try {
    console.log('Loading students from database...');
    const result = await apiGet('students.php', { action: 'getAll' });
    
    if (!result.success) {
      console.error('Failed to load students:', result.message);
      showNotification('Failed to load students', 'error');
      return;
    }
    
    const students = result.data || [];
    window.studentsCache = students;
    const tbody = $('#studentsTable tbody');
    tbody.innerHTML = '';
    
    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #9ca3af; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 10px;">👤</div>
            <div>No students registered yet</div>
            <div style="font-size: 14px; margin-top: 10px;">
              <button class="btn primary" onclick="showStudentModal()" style="margin-top: 10px;">
                <i class="fas fa-plus"></i> Add First Student
              </button>
            </div>
          </td>
        </tr>`;
      console.log('No students found in database');
      return;
    }
    
    for (const student of students) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="student-id">${student.id}</div>
          <small class="muted">Registered: ${new Date(student.created_at).toLocaleDateString()}</small>
        </td>
        <td>
          <div class="student-name">${student.name}</div>
        </td>
        <td>
          <span class="program-badge">${student.program}</span>
        </td>
        <td>
          <span class="year-badge">${student.year}</span>
        </td>
        <td>
          <div class="email-info">
            <i class="fas fa-envelope"></i> ${student.email}
          </div>
          ${student.fingerprint_data ? '<small class="muted">Fingerprint: Registered</small>' : ''}
        </td>
        <td class="action-buttons">
          <button class="action-btn edit" onclick="editStudent('${student.id}')" title="Edit Student">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="deleteStudent('${student.id}')" title="Delete Student">
            <i class="fas fa-trash"></i>
          </button>
          <button class="action-btn view" onclick="viewStudentDetails('${student.id}')" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
        </td>`;
      tbody.appendChild(tr);
    }
    
    // Update student count in dashboard
    updateStudentCount(students.length);
    
    console.log(`✅ Successfully loaded ${students.length} students from database`);
    
  } catch (error) {
    console.error('Error in refreshStudents:', error);
    showNotification('Error loading students from database', 'error');
  }
}

// Update student count in dashboard
function updateStudentCount(count) {
  $('#totalStudents').textContent = count;
}

function showStudentModal(studentId = null) {
  const modal = $('#studentModal');
  const title = $('#studentModalTitle');
  const form = $('#studentForm');
  
  if (studentId) {
    title.textContent = 'Edit Student';
    const students = window.studentsCache || [];
    const student = students.find(s => s.id === studentId);
    
    if (student) {
      $('#studentId').value = student.id;
      $('#studentIdInput').value = student.id;
      $('#studentName').value = student.name;
      $('#studentProgram').value = student.program;
      $('#studentYear').value = student.year;
      $('#studentEmail').value = student.email;
      
      // Show additional info for editing
      const additionalInfo = document.createElement('div');
      additionalInfo.className = 'student-additional-info';
      additionalInfo.innerHTML = `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
          <small class="muted">Registered: ${new Date(student.created_at).toLocaleString()}</small>
        </div>
      `;
      
      // Remove existing additional info if any
      const existingInfo = $('.student-additional-info');
      if (existingInfo) existingInfo.remove();
      
      form.appendChild(additionalInfo);
    }
  } else {
    title.textContent = 'Add New Student';
    form.reset();
    $('#studentId').value = '';
    
    // Remove additional info for new student
    const existingInfo = $('.student-additional-info');
    if (existingInfo) existingInfo.remove();
  }
  
  showModal('studentModal');
}

async function saveStudent(e) {
  e.preventDefault();
  
  const studentId = $('#studentId').value;
  const newStudentId = $('#studentIdInput').value.trim();
  const name = $('#studentName').value.trim();
  const program = $('#studentProgram').value;
  const year = $('#studentYear').value;
  const email = $('#studentEmail').value.trim().toLowerCase();
  
  // Validation
  if (!newStudentId) {
    showNotification('Student ID is required', 'error');
    return;
  }
  
  if (!name) {
    showNotification('Student name is required', 'error');
    return;
  }
  
  if (!program) {
    showNotification('Program is required', 'error');
    return;
  }
  
  if (!year) {
    showNotification('Year level is required', 'error');
    return;
  }
  
  if (!email) {
    showNotification('Email is required', 'error');
    return;
  }
  
  // Validate email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showNotification('Please enter a valid email address', 'error');
    return;
  }
  
  const studentData = {
    action: studentId ? 'update' : 'add',
    oldId: studentId,
    id: newStudentId,
    name: name,
    program: program,
    year: year,
    email: email
  };
  
  // Show loading state
  const submitBtn = $('button[type="submit"]', $('#studentForm'));
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  try {
    const result = await apiCall('students.php', studentData);
    
    if (result.success) {
      showNotification(result.message);
      closeModal('studentModal');
      await refreshStudents();
      await updateDashboardStats();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error saving student:', error);
    showNotification('Error saving student data', 'error');
  } finally {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function editStudent(studentId) {
  showStudentModal(studentId);
}

async function deleteStudent(studentId) {
  const students = window.studentsCache || [];
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    showNotification('Student not found', 'error');
    return;
  }
  
  const confirmation = confirm(`Are you sure you want to delete student:\n\n${student.name} (${student.id})\n${student.program} - ${student.year}\nEmail: ${student.email}\n\nThis action cannot be undone.`);
  
  if (!confirmation) return;
  
  try {
    const result = await apiCall('students.php', {
      action: 'delete',
      id: studentId
    });
    
    if (result.success) {
      showNotification(result.message);
      await refreshStudents();
      await updateDashboardStats();
    } else {
      showNotification(result.message, 'error');
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    showNotification('Error deleting student', 'error');
  }
}

function viewStudentDetails(studentId) {
  const students = window.studentsCache || [];
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    showNotification('Student not found', 'error');
    return;
  }
  
  // Create a detailed view modal
  const details = `
Student Details:

ID: ${student.id}
Name: ${student.name}
Email: ${student.email}
Program: ${student.program}
Year Level: ${student.year}
Registered: ${new Date(student.created_at).toLocaleString()}
${student.fingerprint_data ? 'Fingerprint: Registered' : 'Fingerprint: Not registered'}
  `;
  
  alert(details);
}

// Enhanced student search
function setupStudentSearch() {
  $('#studentSearch').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = $('#studentsTable tbody').querySelectorAll('tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const isVisible = text.includes(searchTerm);
      row.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount++;
    });
    
    // Show no results message if needed
    if (visibleCount === 0 && searchTerm) {
      const tbody = $('#studentsTable tbody');
      if (!tbody.querySelector('.no-results')) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.className = 'no-results';
        noResultsRow.innerHTML = `
          <td colspan="6" style="text-align: center; color: #9ca3af; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 10px;">🔍</div>
            <div>No students found matching "${searchTerm}"</div>
            <div style="font-size: 14px; margin-top: 10px;">Try different search terms</div>
          </td>
        `;
        tbody.appendChild(noResultsRow);
      }
    } else {
      const noResults = $('.no-results');
      if (noResults) noResults.remove();
    }
  });
}

// Bulk operations for students
async function exportStudents() {
  try {
    const students = window.studentsCache || [];
    
    if (students.length === 0) {
      showNotification('No students to export', 'error');
      return;
    }
    
    // Create CSV content
    const headers = ['Student ID', 'Name', 'Email', 'Program', 'Year Level', 'Registration Date'];
    const csvData = [headers];
    
    students.forEach(student => {
      csvData.push([
        student.id,
        student.name,
        student.email,
        student.program,
        student.year,
        new Date(student.created_at).toLocaleDateString()
      ]);
    });
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Exported ${students.length} students to CSV`, 'success');
    
  } catch (error) {
    console.error('Error exporting students:', error);
    showNotification('Error exporting students', 'error');
  }
}

// Add student from admin panel directly
function addStudentFromAdmin() {
  showStudentModal();
}

// ========= Attendance Functions =========
async function refreshAttendance() {
  const eventsResult = await apiGet('events.php', { action: 'getAll' });
  
  if (!eventsResult.success) {
    showNotification('Failed to load attendance', 'error');
    return;
  }
  
  const events = eventsResult.data;
  window.eventsCache = events;
  const tbody = $('#attendanceTable tbody');
  tbody.innerHTML = '';
  
  const eventFilter = $('#eventFilter');
  eventFilter.innerHTML = '<option value="">All Events</option>';
  events.forEach(event => {
    eventFilter.innerHTML += `<option value="${event.id}">${event.name}</option>`;
  });
  
  for (const event of events) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${event.name}</td>
      <td>${fmtDateTime(event.date, event.start)}</td>
      <td class="action-buttons">
        <button class="action-btn view" onclick="viewAttendance('${event.id}')">
          <i class="fas fa-eye"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);
  }
}

async function viewAttendance(eventId) {
  const result = await apiGet('attendance.php', {
    action: 'getByEvent',
    eventId: eventId
  });
  
  if (!result.success) {
    showNotification('Failed to load attendance records', 'error');
    return;
  }
  
  const records = result.data;
  const events = window.eventsCache || [];
  const event = events.find(e => e.id === eventId);
  
  let tableBody = $("#studentAttendanceTable tbody");
  tableBody.innerHTML = "";

  if (records.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6">No students attended ${event?.name || "this event"}.</td></tr>`;
  } else {
    const grouped = {};
    records.forEach(r => {
      if (!grouped[r.studentId]) {
        grouped[r.studentId] = {
          id: r.studentId,
          name: r.studentName,
          program: r.program,
          year: r.year,
          date: r.ts.slice(0,10),
          IN: null,
          OUT: null
        };
      }
      if (r.action === "IN") grouped[r.studentId].IN = r.ts.slice(11,16);
      if (r.action === "OUT") grouped[r.studentId].OUT = r.ts.slice(11,16);
    });

    for (const studentId in grouped) {
      const rec = grouped[studentId];
      tableBody.innerHTML += `
        <tr>
          <td>${rec.id}</td>
          <td>${rec.name}</td>
          <td>${rec.program} / ${rec.year}</td>
          <td>${rec.date}</td>
          <td>${rec.IN || "-"}</td>
          <td>${rec.OUT || "-"}</td>
        </tr>
      `;
    }
  }

  $("#exportBtn").onclick = function () {
    exportAttendance(eventId);
  };

  showModal("attendanceModal");
}

function exportAttendance(eventId) {
  const table = document.getElementById("studentAttendanceTable");
  let csv = [];

  const headers = [];
  table.querySelectorAll("thead th").forEach(th => headers.push(th.innerText.trim()));
  csv.push(headers.join(","));

  table.querySelectorAll("tbody tr").forEach(tr => {
    const row = [];
    tr.querySelectorAll("td").forEach(td => row.push(td.innerText.trim()));
    csv.push(row.join(","));
  });

  const csvContent = csv.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_${eventId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========= Reports Functions =========
function refreshReports() {
  const reportsTable = $('#reportsTable tbody');
  reportsTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Select date range and generate report</td></tr>';
}

function generateReport() {
  const reportType = $('#reportType').value;
  const fromDate = $('#reportFrom').value;
  const toDate = $('#reportTo').value;
  
  if (!fromDate || !toDate) {
    showNotification('Please select both from and to dates.', 'error');
    return;
  }
  
  showNotification(`Report generated for ${fromDate} to ${toDate}`);
}

// ========= Settings Functions =========
function refreshSettings() {
  $('#sysName').value = 'JHCSC BioAttend';
  $('#sysTZ').value = 'Asia/Manila';
  $('#sysEmailNotif').checked = true;
  $('#sysAutoRefresh').checked = false;
  
  $('#emailNotifStatus').textContent = 'Enabled';
  $('#autoRefreshStatus').textContent = 'Disabled';
}

function saveSettings(e) {
  e.preventDefault();
  showNotification('Settings saved successfully.');
}

// ========= Refresh All Data =========
async function refreshAll() {
  try {
    showNotification('Refreshing data...', 'info');
    
    await Promise.all([
      updateDashboardStats(),
      refreshEvents(),
      refreshStudents(),
      refreshAttendance()
    ]);
    
    refreshReports();
    refreshSettings();
    drawChart();
    
    showNotification('Data refreshed successfully', 'success');
  } catch (error) {
    console.error('Error refreshing data:', error);
    showNotification('Error refreshing data', 'error');
  }
}

// ========= Event Listeners =========
function setupEventListeners() {
  $('#registerForm').addEventListener('submit', registerAdmin);
  $('#loginForm').addEventListener('submit', loginAdmin);
  
  $('#showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    $('#registerScreen').classList.add('hidden');
    $('#loginScreen').classList.remove('hidden');
  });
  
  $('#showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    $('#loginScreen').classList.add('hidden');
    $('#registerScreen').classList.remove('hidden');
  });
  
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      goSection(item.dataset.section);
    });
  });
  
  $('#eventForm').addEventListener('submit', saveEvent);
  $('#studentForm').addEventListener('submit', saveStudent);
  $('#settingsForm').addEventListener('submit', saveSettings);
  
  $('#closeEventModal').addEventListener('click', () => closeModal('eventModal'));
  $('#closeStudentModal').addEventListener('click', () => closeModal('studentModal'));
  
  $('#addEventBtn').addEventListener('click', () => showEventModal());
  $('#addStudentBtn').addEventListener('click', () => showStudentModal());
  $('#viewAllAttendance').addEventListener('click', () => goSection('attendance'));
  $('#generateReportBtn').addEventListener('click', generateReport);
  $('#logoutBtn').addEventListener('click', logout);
  
  $('#sysEmailNotif').addEventListener('change', function() {
    $('#emailNotifStatus').textContent = this.checked ? 'Enabled' : 'Disabled';
  });
  
  $('#sysAutoRefresh').addEventListener('change', function() {
    $('#autoRefreshStatus').textContent = this.checked ? 'Enabled' : 'Disabled';
  });
  
  $('#eventSearch').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = $('#eventsTable tbody').querySelectorAll('tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });
  
  $('#studentSearch').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = $('#studentsTable tbody').querySelectorAll('tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
  });
  
  $('#menuToggle').addEventListener('click', function() {
    $('#sidebar').classList.toggle('active');
  });
  
  $('#eventAttendanceType').addEventListener('change', updateAttendanceTypeDisplay);
  $('#eventStart').addEventListener('change', updateAttendanceTypeDisplay);
  $('#eventEnd').addEventListener('change', updateAttendanceTypeDisplay);
  
  // Add export button for students
  const studentsHeader = $('.card .header', $('#students'));
  if (studentsHeader && !$('#exportStudentsBtn')) {
    const exportBtn = document.createElement('button');
    exportBtn.id = 'exportStudentsBtn';
    exportBtn.className = 'btn secondary';
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Export CSV';
    exportBtn.onclick = exportStudents;
    studentsHeader.appendChild(exportBtn);
  }
  
  // Add notification button for events
  const eventsHeader = $('.card .header', $('#events'));
  if (eventsHeader && !$('#sendEventNotificationsBtn')) {
    const notifyBtn = document.createElement('button');
    notifyBtn.id = 'sendEventNotificationsBtn';
    notifyBtn.className = 'btn secondary';
    notifyBtn.innerHTML = '<i class="fas fa-envelope"></i> Notify Students';
    notifyBtn.onclick = function() {
        const events = window.eventsCache || [];
        if (events.length > 0) {
            sendBulkEventNotifications(events[0].id);
        } else {
            showNotification('No events available', 'warning');
        }
    };
    eventsHeader.appendChild(notifyBtn);
  }
  
  setupStudentSearch();
  
  function checkScreenSize() {
    if (window.innerWidth <= 840) {
      $('#menuToggle').style.display = 'block';
      $('#sidebar').classList.remove('active');
    } else {
      $('#menuToggle').style.display = 'none';
      $('#sidebar').classList.remove('active');
    }
  }
  
  window.addEventListener('resize', checkScreenSize);
  checkScreenSize();
}

// ========= Initialize App =========
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    
    // Initialize Gmail service
    setTimeout(async () => {
        await initializeGmailService();
        addEmailConfigurationUI();
    }, 3000);
    
    // Check if user is already logged in
    const adminData = localStorage.getItem('admin');
    if (adminData) {
        try {
            const admin = JSON.parse(adminData);
            updateUserDisplay(admin);
        } catch (error) {
            console.error('Error parsing admin data:', error);
        }
    }
    
    await showApp();
});