let attendanceRecords = [];
let currentEvent = {
  id: null,
  name: 'General Assembly 2025',
  action: 'IN',
  time: null,
  date: null,
  start: null,
  end: null
};

// Get URL parameters and fetch event data
async function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('eventId')) {
    currentEvent.id = params.get('eventId');
    currentEvent.action = params.get('action') || 'IN';
    
    // Fetch event details from API
    await fetchEventDetails(currentEvent.id);
    
    // Update the UI with event information
    updateEventInfo();
  } else {
    // No URL params, show default
    updateEventInfo();
  }
}

// Fetch event details from the API
async function fetchEventDetails(eventId) {
  try {
    console.log('Fetching event with ID:', eventId);
    
    const response = await fetch(`../api/events.php?action=getById&id=${eventId}`);
    const result = await response.json();
    
    console.log('API Response:', result);
    
    if (result.success && result.data) {
      const event = result.data;
      
      // Store event details
      currentEvent.name = event.name;
      currentEvent.date = event.date;
      currentEvent.start = event.start;
      currentEvent.end = event.end;
      currentEvent.venue = event.venue || '';
      currentEvent.status = event.status || '';
      
      console.log('✅ Event loaded successfully:', {
        name: event.name,
        date: event.date,
        start: event.start,
        end: event.end
      });
    } else {
      console.log('❌ Event not found in database, using URL params');
      useFallbackParams();
    }
  } catch (error) {
    console.error('❌ Error fetching event details:', error);
    useFallbackParams();
  }
}

// Use URL parameters as fallback
function useFallbackParams() {
  const params = new URLSearchParams(window.location.search);
  currentEvent.name = params.get('name') || 'Event';
  currentEvent.date = params.get('date') || '';
  currentEvent.start = params.get('start') || '';
  currentEvent.end = params.get('end') || '';
  console.log('Using fallback params:', currentEvent);
}

// Format time from 24hr to 12hr format
function formatTime(timeStr) {
  if (!timeStr) return 'N/A';
  
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch (e) {
    console.error('Error formatting time:', timeStr, e);
    return timeStr;
  }
}

// Format date for display (e.g., "January 15, 2024")
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr + 'T00:00:00');
    const options = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    };
    return date.toLocaleDateString('en-US', options);
  } catch (e) {
    console.error('Error formatting date:', dateStr, e);
    return dateStr;
  }
}

// Format date for CSV (e.g., "2024-01-15")
function formatDateForCSV(dateStr) {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('Error formatting date for CSV:', dateStr, e);
    return dateStr;
  }
}

// Update event information in the UI
function updateEventInfo() {
  const eventDate = document.getElementById('eventDate');
  const eventTime = document.getElementById('eventTime');
  const subtitle = document.getElementById('subtitle');
  const mainTitle = document.getElementById('mainTitle');
  
  console.log('📅 Updating UI with event data:', {
    id: currentEvent.id,
    name: currentEvent.name,
    date: currentEvent.date,
    start: currentEvent.start,
    end: currentEvent.end
  });
  
  if (currentEvent.id) {
    // Update main title to event name
    mainTitle.textContent = currentEvent.name || 'Event';
    console.log('Title updated to:', currentEvent.name);
    
    // Update subtitle to show action
    subtitle.textContent = `Time ${currentEvent.action === 'IN' ? 'In' : 'Out'} Portal`;
    
    // Update date - Format the specific event date
    if (currentEvent.date) {
      const formattedDate = formatDate(currentEvent.date);
      eventDate.textContent = formattedDate;
      console.log('📆 Date formatted:', currentEvent.date, '→', formattedDate);
    } else {
      eventDate.textContent = 'Date not available';
      console.log('⚠️ No date available');
    }
    
    // Update time - Format the specific event start and end time
    if (currentEvent.start && currentEvent.end) {
      const formattedStart = formatTime(currentEvent.start);
      const formattedEnd = formatTime(currentEvent.end);
      const formattedTime = `${formattedStart} - ${formattedEnd}`;
      eventTime.textContent = formattedTime;
      console.log('⏰ Time formatted:', `${currentEvent.start} - ${currentEvent.end}`, '→', formattedTime);
      
      // Start countdown timer
      startCountdown();
    } else if (currentEvent.start) {
      const formattedTime = formatTime(currentEvent.start);
      eventTime.textContent = formattedTime;
      console.log('⏰ Start time formatted:', currentEvent.start, '→', formattedTime);
    } else {
      eventTime.textContent = 'Time not available';
      console.log('⚠️ No time available');
    }
    
    console.log('✅ UI Update Complete');
  } else {
    // Default display when no event parameters
    mainTitle.textContent = 'JHCSC Supreme Student Council';
    subtitle.textContent = 'Biometric Attendance System';
    eventDate.textContent = 'No active event';
    eventTime.textContent = 'N/A';
    console.log('ℹ️ No event ID - showing default');
  }
}

// Countdown Timer
let countdownInterval = null;

function startCountdown() {
  // Clear any existing countdown
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Check if we have the necessary data
  if (!currentEvent.date || !currentEvent.end) {
    console.log('⚠️ Cannot start countdown - missing date or end time');
    return;
  }

  const countdownTimer = document.getElementById('countdownTimer');
  const countdownDisplay = document.getElementById('countdownDisplay');
  const countdownSubtext = document.getElementById('countdownSubtext');
  
  // Show the countdown timer
  countdownTimer.style.display = 'block';

  function updateCountdown() {
    const now = new Date();
    
    // Create the end datetime from event date and end time
    const [endHour, endMinute] = currentEvent.end.split(':').map(Number);
    const endDateTime = new Date(currentEvent.date);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    // Calculate time difference
    const timeDiff = endDateTime - now;
    
    console.log('⏱️ Countdown update:', {
      now: now.toLocaleString(),
      endDateTime: endDateTime.toLocaleString(),
      timeDiff: timeDiff
    });
    
    if (timeDiff <= 0) {
      // Event has ended
      countdownDisplay.textContent = 'CLOSED';
      countdownDisplay.className = 'countdown-display closed';
      countdownSubtext.textContent = 'Attendance is now closed';
      clearInterval(countdownInterval);
      
      // Disable the form
      document.getElementById('gmail').disabled = true;
      document.querySelector('.btn-primary').disabled = true;
      document.querySelector('.btn-primary').style.opacity = '0.5';
      document.querySelector('.btn-primary').style.cursor = 'not-allowed';
      
      console.log('❌ Attendance closed');
    } else {
      // Calculate hours, minutes, seconds
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      // Format the countdown
      const hoursStr = String(hours).padStart(2, '0');
      const minutesStr = String(minutes).padStart(2, '0');
      const secondsStr = String(seconds).padStart(2, '0');
      
      countdownDisplay.textContent = `${hoursStr}:${minutesStr}:${secondsStr}`;
      
      // Change color based on time remaining
      if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes
        countdownDisplay.className = 'countdown-display danger';
        countdownSubtext.textContent = 'Hurry! Closing soon!';
      } else if (timeDiff < 15 * 60 * 1000) { // Less than 15 minutes
        countdownDisplay.className = 'countdown-display warning';
        countdownSubtext.textContent = 'Limited time remaining';
      } else {
        countdownDisplay.className = 'countdown-display';
        countdownSubtext.textContent = 'Until attendance closes';
      }
    }
  }
  
  // Update immediately
  updateCountdown();
  
  // Update every second
  countdownInterval = setInterval(updateCountdown, 1000);
  
  console.log('⏰ Countdown started');
}

// Set date and time
function setDateTime() {
  const now = new Date();
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  document.getElementById('dateTime').textContent = now.toLocaleDateString('en-US', options);
}

// Validate Gmail format
function isValidGmail(email) {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
}

// Check if student exists in database by Gmail
async function checkStudentExists(gmail) {
  try {
    console.log('Checking Gmail:', gmail);
    
    const response = await fetch(`../api/students.php?action=getAll`);
    const result = await response.json();
    
    if (result.success && result.data) {
      // Enhanced student lookup to handle Gmail field
      const student = result.data.find(s => {
        // Try different possible field names for email
        return s.email === gmail || 
               s.gmail === gmail || 
               s.email_address === gmail ||
               (s.contact && s.contact === gmail);
      });
      
      console.log('Student lookup result:', student);
      return student || null;
    }
    return null;
  } catch (error) {
    console.error('Error checking student:', error);
    return null;
  }
}

// Check if attendance already recorded
async function checkExistingAttendance(gmail) {
  try {
    if (!currentEvent.id) return false;
    
    const response = await fetch(`../api/attendance.php?action=getByEvent&eventId=${currentEvent.id}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      const existingRecord = result.data.find(record => {
        // Check different possible field names for email
        const recordEmail = record.email || record.gmail || record.email_address || record.contact;
        return recordEmail === gmail && record.action === currentEvent.action;
      });
      return !!existingRecord;
    }
    return false;
  } catch (error) {
    console.error('Error checking existing attendance:', error);
    return false;
  }
}

// Record attendance in database
async function recordAttendanceInDB(gmail, studentData) {
  try {
    const formData = new FormData();
    formData.append('action', 'record');
    formData.append('eventId', currentEvent.id);
    formData.append('gmail', gmail);
    formData.append('timeAction', currentEvent.action);
    
    const response = await fetch('../api/attendance.php', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error recording attendance:', error);
    return { success: false, message: 'Network error' };
  }
}

// Load existing attendance records
async function loadExistingAttendance() {
  try {
    if (!currentEvent.id) return;
    
    const response = await fetch(`../api/attendance.php?action=getByEvent&eventId=${currentEvent.id}`);
    const result = await response.json();
    
    if (result.success && result.data) {
      attendanceRecords = result.data.map(record => {
        // Get program/course from the record - check different possible field names
        const program = record.program || record.course || record.program_name || record.course_name || 'N/A';
        
        // Use the event date for all records, not the timestamp date
        const eventDate = currentEvent.date ? formatDate(currentEvent.date) : 'N/A';
        const eventDateForCSV = currentEvent.date ? formatDateForCSV(currentEvent.date) : 'N/A';
        
        // Get email from different possible field names
        const email = record.email || record.gmail || record.email_address || record.contact || 'N/A';
        
        return {
          id: record.id,
          email: email,
          name: record.studentName || record.name || 'Unknown Student',
          course: program,
          eventId: currentEvent.id,
          eventName: currentEvent.name,
          action: record.action,
          timestamp: new Date(record.ts || record.timestamp || record.created_at),
          time: new Date(record.ts || record.timestamp || record.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          date: eventDate,
          dateForCSV: eventDateForCSV
        };
      });
      
      renderRecords();
      updateStats();
    }
  } catch (error) {
    console.error('Error loading attendance records:', error);
  }
}

// Calculate unique programs count (like BSIT, BSCS, etc.)
function calculateProgramsCount() {
  const uniquePrograms = new Set();
  attendanceRecords.forEach(record => {
    if (record.course && record.course !== 'N/A') {
      uniquePrograms.add(record.course);
    }
  });
  return uniquePrograms.size;
}

// Update statistics
function updateStats() {
  document.getElementById('totalCount').textContent = attendanceRecords.length;
  document.getElementById('programCount').textContent = calculateProgramsCount();
}

// Export to CSV function
function exportToCSV() {
  if (attendanceRecords.length === 0) {
    alert('No attendance records to export.');
    return;
  }

  // Define CSV headers
  const headers = ['Gmail', 'Name', 'Program', 'Time In/Out', 'Event Date', 'Time', 'Event Name'];
  
  // Convert records to CSV format
  const csvData = attendanceRecords.map(record => [
    record.email,
    `"${record.name}"`, // Wrap in quotes to handle commas in names
    `"${record.course}"`,
    record.action || 'IN',
    record.dateForCSV || record.date,
    record.time,
    `"${currentEvent.name}"`
  ]);

  // Combine headers and data
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n');

  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Create filename with event name and event date
  const eventName = currentEvent.name ? currentEvent.name.replace(/[^a-zA-Z0-9]/g, '_') : 'attendance';
  const eventDate = currentEvent.date ? formatDateForCSV(currentEvent.date) : new Date().toISOString().split('T')[0];
  const filename = `${eventName}_attendance_${eventDate}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Show success feedback
  const exportBtn = document.getElementById('exportBtn');
  const originalText = exportBtn.innerHTML;
  exportBtn.innerHTML = '✓ Exported!';
  exportBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
  
  setTimeout(() => {
    exportBtn.innerHTML = originalText;
    exportBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
  }, 2000);
}

// Initialize
async function init() {
  await getUrlParams();
  setDateTime();
  setInterval(setDateTime, 60000);
  
  // Load existing attendance records if event ID exists
  if (currentEvent.id) {
    await loadExistingAttendance();
  }

  // Add event listener for export button
  document.getElementById('exportBtn').addEventListener('click', exportToCSV);
}

// Start initialization
init();

// Form submission
document.getElementById('biometricForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const gmail = document.getElementById('gmail').value.trim().toLowerCase();
  const errorMsg = document.getElementById('errorMessage');
  const submitBtn = document.querySelector('.btn-primary');
  
  if (!gmail) {
    errorMsg.textContent = 'Please enter your Gmail account';
    errorMsg.classList.add('show');
    return;
  }
  
  // Validate Gmail format
  if (!isValidGmail(gmail)) {
    errorMsg.textContent = 'Please enter a valid Gmail account (must end with @gmail.com)';
    errorMsg.classList.add('show');
    return;
  }
  
  // Disable button to prevent multiple submissions
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';
  
  try {
    // Check if student exists in database
    const student = await checkStudentExists(gmail);
    if (!student) {
      errorMsg.textContent = 'Gmail not found in database. Please register first.';
      errorMsg.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Attendance';
      return;
    }
    
    // Check for duplicate attendance
    const alreadyPresent = await checkExistingAttendance(gmail);
    if (alreadyPresent) {
      errorMsg.textContent = `Time ${currentEvent.action} already recorded for this student`;
      errorMsg.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Attendance';
      return;
    }
    
    errorMsg.classList.remove('show');
    
    // Record attendance in database
    submitBtn.textContent = 'Recording...';
    const dbResult = await recordAttendanceInDB(gmail, student);
    
    if (!dbResult.success) {
      throw new Error(dbResult.message || 'Failed to record attendance');
    }
    
    // Get program/course from student data - check different possible field names
    const program = student.program || student.course || student.program_name || student.course_name || 'N/A';
    const studentName = student.name || student.studentName || 'Unknown Student';
    
    // Use the event date, not current date
    const eventDate = currentEvent.date ? formatDate(currentEvent.date) : 'N/A';
    const eventDateForCSV = currentEvent.date ? formatDateForCSV(currentEvent.date) : 'N/A';
    
    // Create attendance record for display
    const record = {
      id: Date.now(),
      email: gmail,
      name: studentName,
      course: program,
      eventId: currentEvent.id,
      eventName: currentEvent.name,
      action: currentEvent.action,
      timestamp: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: eventDate,
      dateForCSV: eventDateForCSV
    };
    
    // Add to records array
    attendanceRecords.unshift(record);
    
    // Update success message with student details
    document.getElementById('successDetails').textContent = `Welcome, ${studentName}! (${program})`;
    document.getElementById('successBox').classList.remove('hidden');
    document.getElementById('biometricForm').reset();
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      document.getElementById('successBox').classList.add('hidden');
    }, 3000);
    
    // Update display
    renderRecords();
    updateStats();
    
    console.log('✅ Attendance recorded successfully for:', studentName, 'Program:', program);
    
  } catch (error) {
    console.error('Attendance error:', error);
    errorMsg.textContent = 'Error: ' + error.message;
    errorMsg.classList.add('show');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Attendance';
  }
});

// Render attendance records
function renderRecords(filter = '') {
  const listContainer = document.getElementById('recordsList');
  
  let filtered = attendanceRecords;
  if (filter) {
    filtered = attendanceRecords.filter(record => 
      record.email.toLowerCase().includes(filter.toLowerCase()) ||
      record.name.toLowerCase().includes(filter.toLowerCase()) ||
      (record.course && record.course.toLowerCase().includes(filter.toLowerCase()))
    );
  }
  
  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">${filter ? 'No matching records found' : 'No attendance records yet'}</div>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = filtered.map((record, index) => `
    <div class="record-item ${index === 0 && !filter ? 'new' : ''}">
      <div class="record-info">
        <div class="record-id">${record.name}</div>
        <div class="record-time">${record.email} • ${record.course}</div>
        <div class="record-time">${record.time} • ${record.action || 'IN'}</div>
      </div>
      <div class="record-badge">✓ ${record.action || 'Present'}</div>
    </div>
  `).join('');
}

// Search functionality
document.getElementById('searchBox').addEventListener('input', function(e) {
  renderRecords(e.target.value);
});

// Clear error on input
document.getElementById('gmail').addEventListener('input', function() {
  document.getElementById('errorMessage').classList.remove('show');
});