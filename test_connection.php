<?php
require_once 'config.php';

echo "<h2>BioAttend Database Test</h2>";

// Test database connection
if ($conn->connect_error) {
    echo "<p style='color: red;'>✗ Database connection failed: " . $conn->connect_error . "</p>";
} else {
    echo "<p style='color: green;'>✓ Connected successfully to database: " . DB_NAME . "</p>";
}

// Check tables
$tables = ['admins', 'students', 'events', 'attendance', 'system_settings'];
foreach ($tables as $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    if ($result->num_rows > 0) {
        echo "<p style='color: green;'>✓ Table '$table' exists</p>";
    } else {
        echo "<p style='color: red;'>✗ Table '$table' not found</p>";
    }
}

// Test sample data
echo "<h3>Sample Data Check:</h3>";
$testQueries = [
    'Admins' => "SELECT COUNT(*) as count FROM admins",
    'Students' => "SELECT COUNT(*) as count FROM students", 
    'Events' => "SELECT COUNT(*) as count FROM events",
    'Settings' => "SELECT COUNT(*) as count FROM system_settings"
];

foreach ($testQueries as $name => $query) {
    $result = $conn->query($query);
    if ($result) {
        $row = $result->fetch_assoc();
        echo "<p>$name: " . $row['count'] . " records</p>";
    }
}

$conn->close();
?>