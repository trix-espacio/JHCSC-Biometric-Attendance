<?php
require_once '../config.php';

// Enable CORS and set headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the action parameter
$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Route to appropriate function
switch($action) {
    case 'getAll':
        getAllStudents();
        break;
    case 'add':
        addStudent();
        break;
    case 'update':
        updateStudent();
        break;
    case 'delete':
        deleteStudent();
        break;
    default:
        sendJSON(['success' => false, 'message' => 'Invalid action specified']);
}

function getAllStudents() {
    global $conn;
    
    try {
        $query = "SELECT id, name, email, program, year, created_at FROM students ORDER BY created_at DESC";
        $stmt = $conn->prepare($query);
        
        if (!$stmt) {
            throw new Exception('Database query preparation failed: ' . $conn->error);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $students = [];
        while ($row = $result->fetch_assoc()) {
            $students[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'program' => $row['program'],
                'year' => $row['year'],
                'created_at' => $row['created_at']
            ];
        }
        
        sendJSON([
            'success' => true, 
            'data' => $students,
            'count' => count($students)
        ]);
        
        $stmt->close();
        
    } catch (Exception $e) {
        sendJSON(['success' => false, 'message' => 'Error loading students: ' . $e->getMessage()]);
    }
}

function addStudent() {
    global $conn;
    
    // Get form data
    $studentId = trim($_POST['id'] ?? '');
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $program = trim($_POST['program'] ?? '');
    $year = trim($_POST['year'] ?? '');
    $fingerprint = trim($_POST['fingerprint'] ?? '');
    
    // Validate required fields
    if (empty($studentId)) {
        sendJSON(['success' => false, 'message' => 'Student ID is required']);
    }
    if (empty($name)) {
        sendJSON(['success' => false, 'message' => 'Full name is required']);
    }
    if (empty($email)) {
        sendJSON(['success' => false, 'message' => 'Email is required']);
    }
    if (empty($program)) {
        sendJSON(['success' => false, 'message' => 'Program is required']);
    }
    if (empty($year)) {
        sendJSON(['success' => false, 'message' => 'Year level is required']);
    }
    
    // Validate Email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJSON(['success' => false, 'message' => 'Invalid email format']);
    }
    
    try {
        // Check if student ID already exists
        $checkStmt = $conn->prepare("SELECT id FROM students WHERE id = ?");
        if (!$checkStmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        
        $checkStmt->bind_param("s", $studentId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            $checkStmt->close();
            sendJSON(['success' => false, 'message' => 'Student ID already exists in the system']);
        }
        $checkStmt->close();
        
        // Check if Email already exists
        $checkEmailStmt = $conn->prepare("SELECT id FROM students WHERE email = ?");
        if (!$checkEmailStmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        
        $checkEmailStmt->bind_param("s", $email);
        $checkEmailStmt->execute();
        $checkEmailResult = $checkEmailStmt->get_result();
        
        if ($checkEmailResult->num_rows > 0) {
            $checkEmailStmt->close();
            sendJSON(['success' => false, 'message' => 'Email address already registered in the system']);
        }
        $checkEmailStmt->close();
        
        // Insert new student
        $insertStmt = $conn->prepare("INSERT INTO students (id, name, email, program, year, fingerprint_data) VALUES (?, ?, ?, ?, ?, ?)");
        
        if (!$insertStmt) {
            throw new Exception('Database insertion preparation failed: ' . $conn->error);
        }
        
        $insertStmt->bind_param("ssssss", $studentId, $name, $email, $program, $year, $fingerprint);
        
        if ($insertStmt->execute()) {
            // Success
            sendJSON([
                'success' => true,
                'message' => 'Student registered successfully!',
                'data' => [
                    'id' => $studentId,
                    'name' => $name,
                    'email' => $email,
                    'program' => $program,
                    'year' => $year
                ]
            ]);
        } else {
            throw new Exception('Database insertion failed: ' . $insertStmt->error);
        }
        
        $insertStmt->close();
        
    } catch (Exception $e) {
        sendJSON(['success' => false, 'message' => 'Registration failed: ' . $e->getMessage()]);
    }
}

function updateStudent() {
    global $conn;
    
    $oldId = trim($_POST['oldId'] ?? '');
    $studentId = trim($_POST['id'] ?? '');
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $program = trim($_POST['program'] ?? '');
    $year = trim($_POST['year'] ?? '');
    
    if (empty($oldId) || empty($studentId)) {
        sendJSON(['success' => false, 'message' => 'Student ID is required']);
    }
    
    // Validate Email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJSON(['success' => false, 'message' => 'Invalid email format']);
    }
    
    try {
        $stmt = $conn->prepare("UPDATE students SET id = ?, name = ?, email = ?, program = ?, year = ? WHERE id = ?");
        
        if (!$stmt) {
            throw new Exception('Database update preparation failed: ' . $conn->error);
        }
        
        $stmt->bind_param("ssssss", $studentId, $name, $email, $program, $year, $oldId);
        
        if ($stmt->execute()) {
            sendJSON(['success' => true, 'message' => 'Student updated successfully!']);
        } else {
            throw new Exception('Database update failed: ' . $stmt->error);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        sendJSON(['success' => false, 'message' => 'Update failed: ' . $e->getMessage()]);
    }
}

function deleteStudent() {
    global $conn;
    
    $studentId = trim($_POST['id'] ?? '');
    
    if (empty($studentId)) {
        sendJSON(['success' => false, 'message' => 'Student ID is required']);
    }
    
    try {
        $stmt = $conn->prepare("DELETE FROM students WHERE id = ?");
        
        if (!$stmt) {
            throw new Exception('Database deletion preparation failed: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $studentId);
        
        if ($stmt->execute()) {
            sendJSON(['success' => true, 'message' => 'Student deleted successfully!']);
        } else {
            throw new Exception('Database deletion failed: ' . $stmt->error);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        sendJSON(['success' => false, 'message' => 'Deletion failed: ' . $e->getMessage()]);
    }
}

// Close database connection
$conn->close();
?>