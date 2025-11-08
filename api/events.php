<?php
require_once '../config.php';
requireAuth();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'getAll':
        getAllEvents();
        break;
    case 'getById':
        getEventById();
        break;
    case 'add':
        addEvent();
        break;
    case 'update':
        updateEvent();
        break;
    case 'delete':
        deleteEvent();
        break;
    default:
        sendJSON(['success' => false, 'message' => 'Invalid action']);
}

function getAllEvents() {
    global $conn;
    
    $query = "SELECT * FROM events ORDER BY date DESC, start_time DESC";
    $result = $conn->query($query);
    
    $events = [];
    while ($row = $result->fetch_assoc()) {
        $events[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'date' => $row['date'],
            'start' => substr($row['start_time'], 0, 5),
            'end' => substr($row['end_time'], 0, 5),
            'venue' => $row['venue'],
            'desc' => $row['description'],
            'status' => $row['status'],
            'attendanceType' => $row['attendance_type'] ?? 'both'
        ];
    }
    
    sendJSON(['success' => true, 'data' => $events]);
}

function getEventById() {
    global $conn;
    
    $id = $_GET['id'] ?? $_POST['id'] ?? '';
    
    if (empty($id)) {
        sendJSON(['success' => false, 'message' => 'Event ID is required.']);
    }
    
    $stmt = $conn->prepare("SELECT * FROM events WHERE id = ?");
    $stmt->bind_param("s", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $event = [
            'id' => $row['id'],
            'name' => $row['name'],
            'date' => $row['date'],
            'start' => substr($row['start_time'], 0, 5),
            'end' => substr($row['end_time'], 0, 5),
            'venue' => $row['venue'],
            'desc' => $row['description'],
            'status' => $row['status']
        ];
        sendJSON(['success' => true, 'data' => $event]);
    } else {
        sendJSON(['success' => false, 'message' => 'Event not found.']);
    }
}

function addEvent() {
    global $conn;
    
    $id = generateUUID();
    $name = trim($_POST['name'] ?? '');
    $date = $_POST['date'] ?? '';
    $start = $_POST['start'] ?? '';
    $end = $_POST['end'] ?? '';
    $venue = trim($_POST['venue'] ?? '');
    $desc = trim($_POST['desc'] ?? '');
    $status = $_POST['status'] ?? 'upcoming';
    
    if (empty($name) || empty($date) || empty($start) || empty($end) || empty($venue)) {
        sendJSON(['success' => false, 'message' => 'Please fill in all required fields.']);
    }
    
    $stmt = $conn->prepare("INSERT INTO events (id, name, date, start_time, end_time, venue, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssss", $id, $name, $date, $start, $end, $venue, $desc, $status);
    
    if ($stmt->execute()) {
        sendJSON(['success' => true, 'message' => 'Event added successfully.', 'data' => ['id' => $id]]);
    } else {
        sendJSON(['success' => false, 'message' => 'Failed to add event.']);
    }
}

function updateEvent() {
    global $conn;
    
    $id = $_POST['id'] ?? '';
    $name = trim($_POST['name'] ?? '');
    $date = $_POST['date'] ?? '';
    $start = $_POST['start'] ?? '';
    $end = $_POST['end'] ?? '';
    $venue = trim($_POST['venue'] ?? '');
    $desc = trim($_POST['desc'] ?? '');
    $status = $_POST['status'] ?? 'upcoming';
    
    if (empty($id) || empty($name) || empty($date) || empty($start) || empty($end) || empty($venue)) {
        sendJSON(['success' => false, 'message' => 'Please fill in all required fields.']);
    }
    
    $stmt = $conn->prepare("UPDATE events SET name = ?, date = ?, start_time = ?, end_time = ?, venue = ?, description = ?, status = ? WHERE id = ?");
    $stmt->bind_param("ssssssss", $name, $date, $start, $end, $venue, $desc, $status, $id);
    
    if ($stmt->execute()) {
        sendJSON(['success' => true, 'message' => 'Event updated successfully.']);
    } else {
        sendJSON(['success' => false, 'message' => 'Failed to update event.']);
    }
}

function deleteEvent() {
    global $conn;
    
    $id = $_POST['id'] ?? '';
    
    if (empty($id)) {
        sendJSON(['success' => false, 'message' => 'Event ID is required.']);
    }
    
    $stmt = $conn->prepare("DELETE FROM events WHERE id = ?");
    $stmt->bind_param("s", $id);
    
    if ($stmt->execute()) {
        sendJSON(['success' => true, 'message' => 'Event deleted successfully.']);
    } else {
        sendJSON(['success' => false, 'message' => 'Failed to delete event.']);
    }
}
?>