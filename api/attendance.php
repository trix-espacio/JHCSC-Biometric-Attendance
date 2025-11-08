<?php
require_once '../config.php';
requireAuth();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'getAll':
        getAllAttendance();
        break;
    case 'getByEvent':
        getAttendanceByEvent();
        break;
    case 'record':
        recordAttendance();
        break;
    case 'getStats':
        getAttendanceStats();
        break;
    default:
        sendJSON(['success' => false, 'message' => 'Invalid action']);
}

function getAllAttendance() {
    global $conn;
    
    $query = "SELECT a.*, e.name as event_name, e.date as event_date, 
              s.name as student_name, s.program, s.year 
              FROM attendance a
              JOIN events e ON a.event_id = e.id
              JOIN students s ON a.student_id = s.id
              ORDER BY a.timestamp DESC";
    
    $result = $conn->query($query);
    
    $attendance = [];
    while ($row = $result->fetch_assoc()) {
        $attendance[] = [
            'id' => $row['id'],
            'eventId' => $row['event_id'],
            'eventName' => $row['event_name'],
            'eventDate' => $row['event_date'],
            'studentId' => $row['student_id'],
            'studentName' => $row['student_name'],
            'program' => $row['program'],
            'year' => $row['year'],
            'action' => $row['action'],
            'ts' => $row['timestamp']
        ];
    }
    
    sendJSON(['success' => true, 'data' => $attendance]);
}

function getAttendanceByEvent() {
    global $conn;
    
    $eventId = $_GET['eventId'] ?? '';
    
    if (empty($eventId)) {
        sendJSON(['success' => false, 'message' => 'Event ID is required.']);
    }
    
    $stmt = $conn->prepare("
        SELECT a.*, s.name as student_name, s.program, s.year, s.contact
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.event_id = ?
        ORDER BY a.timestamp ASC
    ");
    
    $stmt->bind_param("s", $eventId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $attendance = [];
    while ($row = $result->fetch_assoc()) {
        $attendance[] = [
            'id' => $row['id'],
            'studentId' => $row['student_id'],
            'studentName' => $row['student_name'],
            'program' => $row['program'],
            'year' => $row['year'],
            'contact' => $row['contact'],
            'action' => $row['action'],
            'ts' => $row['timestamp']
        ];
    }
    
    sendJSON(['success' => true, 'data' => $attendance]);
}

function recordAttendance() {
    global $conn;
    
    $id = generateUUID();
    $eventId = $_POST['eventId'] ?? '';
    $studentId = $_POST['studentId'] ?? '';
    $action = $_POST['action'] ?? 'IN';
    $timestamp = $_POST['timestamp'] ?? date('Y-m-d H:i:s');
    
    if (empty($eventId) || empty($studentId)) {
        sendJSON(['success' => false, 'message' => 'Event ID and Student ID are required.']);
    }
    
    // Verify event exists
    $stmt = $conn->prepare("SELECT id FROM events WHERE id = ?");
    $stmt->bind_param("s", $eventId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) {
        sendJSON(['success' => false, 'message' => 'Event not found.']);
    }
    
    // Verify student exists
    $stmt = $conn->prepare("SELECT id FROM students WHERE id = ?");
    $stmt->bind_param("s", $studentId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) {
        sendJSON(['success' => false, 'message' => 'Student not found.']);
    }
    
    // Insert attendance record
    $stmt = $conn->prepare("INSERT INTO attendance (id, event_id, student_id, action, timestamp) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $id, $eventId, $studentId, $action, $timestamp);
    
    if ($stmt->execute()) {
        sendJSON(['success' => true, 'message' => 'Attendance recorded successfully.']);
    } else {
        sendJSON(['success' => false, 'message' => 'Failed to record attendance.']);
    }
}

function getAttendanceStats() {
    global $conn;
    
    // Total students
    $totalStudents = $conn->query("SELECT COUNT(*) as count FROM students")->fetch_assoc()['count'];
    
    // Upcoming events
    $today = date('Y-m-d');
    $nextWeek = date('Y-m-d', strtotime('+7 days'));
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM events WHERE date BETWEEN ? AND ?");
    $stmt->bind_param("ss", $today, $nextWeek);
    $stmt->execute();
    $upcomingEvents = $stmt->get_result()->fetch_assoc()['count'];
    
    // Today's attendance
    $todayStart = date('Y-m-d 00:00:00');
    $todayEnd = date('Y-m-d 23:59:59');
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM attendance WHERE timestamp BETWEEN ? AND ?");
    $stmt->bind_param("ss", $todayStart, $todayEnd);
    $stmt->execute();
    $todayAttendance = $stmt->get_result()->fetch_assoc()['count'];
    
    // Last 30 days attendance for chart
    $chartData = [];
    for ($i = 29; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dateStart = $date . ' 00:00:00';
        $dateEnd = $date . ' 23:59:59';
        
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM attendance WHERE timestamp BETWEEN ? AND ?");
        $stmt->bind_param("ss", $dateStart, $dateEnd);
        $stmt->execute();
        $count = $stmt->get_result()->fetch_assoc()['count'];
        
        $chartData[] = ['date' => $date, 'count' => $count];
    }
    
    sendJSON([
        'success' => true,
        'data' => [
            'totalStudents' => $totalStudents,
            'upcomingEvents' => $upcomingEvents,
            'todayAttendance' => $todayAttendance,
            'chartData' => $chartData
        ]
    ]);
}
?>