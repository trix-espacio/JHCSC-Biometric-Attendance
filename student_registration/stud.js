document.addEventListener('DOMContentLoaded', function() {
  const registrationForm = document.getElementById('registrationForm');
  const scanBtn = document.getElementById('scanBtn');
  const fingerprintContainer = document.getElementById('fingerprintContainer');
  const submitBtn = document.getElementById('submitBtn');
  const confirmation = document.getElementById('regConfirmation');
  const newRegistrationBtn = document.getElementById('newRegistration');
  
  let isFingerprintScanned = false;
  
  // Simulate fingerprint scanning
  scanBtn.addEventListener('click', function() {
    if (!isFingerprintScanned) {
      fingerprintContainer.classList.add('success-animation');
      document.getElementById('fingerprintError').textContent = '';
      
      setTimeout(function() {
        scanBtn.classList.add('scanned');
        isFingerprintScanned = true;
        fingerprintContainer.classList.remove('success-animation');
        validateForm();
        alert("✅ Fingerprint successfully scanned!");
      }, 2000);
    }
  });
  
  // Validation function
  function validateForm() {
    const studentId = document.getElementById('studentId').value.trim();
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const program = document.getElementById('program').value;
    const yearLevel = document.getElementById('yearLevel').value;
    
    let isValid = true;
    
    // Student ID validation
    if (!studentId) {
      document.getElementById('studentIdError').textContent = 'Student ID is required';
      isValid = false;
    } else {
      document.getElementById('studentIdError').textContent = '';
    }
    
    // Full Name validation
    if (!fullName) {
      document.getElementById('fullNameError').textContent = 'Full name is required';
      isValid = false;
    } else {
      document.getElementById('fullNameError').textContent = '';
    }
    
    // Email validation
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      document.getElementById('emailError').textContent = 'Email account is required';
      isValid = false;
    } else if (!emailPattern.test(email)) {
      document.getElementById('emailError').textContent = 'Please enter a valid email address';
      isValid = false;
    } else {
      document.getElementById('emailError').textContent = '';
    }
    
    // Program validation
    if (!program) {
      document.getElementById('programError').textContent = 'Program is required';
      isValid = false;
    } else {
      document.getElementById('programError').textContent = '';
    }
    
    // Year Level validation
    if (!yearLevel) {
      document.getElementById('yearLevelError').textContent = 'Year level is required';
      isValid = false;
    } else {
      document.getElementById('yearLevelError').textContent = '';
    }
    
    // Fingerprint validation
    if (!isFingerprintScanned) {
      document.getElementById('fingerprintError').textContent = 'Fingerprint scan is required';
      isValid = false;
    } else {
      document.getElementById('fingerprintError').textContent = '';
    }
    
    submitBtn.disabled = !isValid;
    return isValid;
  }
  
  // Real-time validation
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(field => {
    field.addEventListener('input', validateForm);
    field.addEventListener('change', validateForm);
  });
  
  // Form submission - Send to backend
  registrationForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (validateForm()) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering...';

      // Collect data
      const studentData = {
        action: 'add',
        id: document.getElementById('studentId').value.trim(),
        name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(), // Changed from gmail to email
        program: document.getElementById('program').value,
        year: document.getElementById('yearLevel').value,
        fingerprint: 'simulated_fingerprint_data'
      };

      try {
        console.log('Sending student data:', studentData);
        
        // Send to backend API
        const response = await fetch('../api/students.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(studentData)
        });

        const result = await response.json();
        console.log('API Response:', result);

        if (result.success) {
          // Success - show confirmation
          registrationForm.classList.add('hidden');
          confirmation.classList.remove('hidden');
          
          console.log('✅ Student registered successfully in database');
          
        } else {
          // Error from server
          throw new Error(result.message || 'Failed to register student');
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert('Error: ' + error.message + '\nPlease try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register Student';
      }
    }
  });
  
  // New registration reset
  newRegistrationBtn.addEventListener('click', function() {
    registrationForm.reset();
    isFingerprintScanned = false;
    scanBtn.classList.remove('scanned');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Register Student';
    
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(msg => {
      msg.textContent = '';
    });
    
    registrationForm.classList.remove('hidden');
    confirmation.classList.add('hidden');
  });
});