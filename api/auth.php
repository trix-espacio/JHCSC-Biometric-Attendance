<?php
require_once '../config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_POST['action'] ?? '';

switch ($action) {
    case 'register':
        register();
        break;
    case 'login':
        login();
        break;
    case 'logout':
        logout();
        break;
    case 'checkSession':
        checkSession();
        break;
    default:
        sendJSON(['success' => false, 'message' => 'Invalid action']);
}

function register() {
    global $conn;
    
    $name = trim($_POST['name'] ?? '');
    $email = trim(strtolower($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';
    
    if (empty($name) || empty($email) || strlen($password) < 6) {
        sendJSON(['success' => false, 'message' => 'Please complete the form (password must be at least 6 characters).']);
    }
    
    // Check if admin already exists
    $stmt = $conn->prepare("SELECT id FROM admins WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendJSON(['success' => false, 'message' => 'Admin already exists for this email.']);
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert new admin
    $stmt = $conn->prepare("INSERT INTO admins (name, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $name, $email, $hashedPassword);
    
    if ($stmt->execute()) {
        $adminId = $stmt->insert_id;
        $_SESSION['admin_id'] = $adminId;
        $_SESSION['admin_name'] = $name;
        $_SESSION['admin_email'] = $email;
        
        sendJSON([
            'success' => true, 
            'message' => 'Registration successful! Welcome to BioAttend.',
            'data' => [
                'name' => $name,
                'email' => $email
            ]
        ]);
    } else {
        sendJSON(['success' => false, 'message' => 'Registration failed. Please try again.']);
    }
}

function login() {
    global $conn;
    
    $email = trim(strtolower($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        sendJSON(['success' => false, 'message' => 'Please enter both email and password.']);
    }
    
    $stmt = $conn->prepare("SELECT id, name, email, password FROM admins WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendJSON(['success' => false, 'message' => 'Invalid email or password.']);
    }
    
    $admin = $result->fetch_assoc();
    
    if (!password_verify($password, $admin['password'])) {
        sendJSON(['success' => false, 'message' => 'Invalid email or password.']);
    }
    
    $_SESSION['admin_id'] = $admin['id'];
    $_SESSION['admin_name'] = $admin['name'];
    $_SESSION['admin_email'] = $admin['email'];
    
    sendJSON([
        'success' => true,
        'message' => 'Welcome back, ' . $admin['name'] . '!',
        'data' => [
            'name' => $admin['name'],
            'email' => $admin['email']
        ]
    ]);
}

function logout() {
    session_destroy();
    sendJSON(['success' => true, 'message' => 'You have been logged out successfully.']);
}

function checkSession() {
    if (isset($_SESSION['admin_id'])) {
        sendJSON([
            'success' => true,
            'data' => [
                'name' => $_SESSION['admin_name'],
                'email' => $_SESSION['admin_email']
            ]
        ]);
    } else {
        sendJSON(['success' => false, 'message' => 'No active session']);
    }
}
?>