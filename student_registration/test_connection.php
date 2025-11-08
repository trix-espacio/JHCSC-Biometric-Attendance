<?php
require_once 'config.php';

echo "Database connection test:<br>";
echo "Connected successfully to database: " . DB_NAME . "<br>";

// Check if admins table exists
$result = $conn->query("SHOW TABLES LIKE 'admins'");
if ($result->num_rows > 0) {
    echo "✓ Admins table exists<br>";
} else {
    echo "✗ Admins table not found<br>";
}

// Check all tables
echo "<br>Available tables:<br>";
$tables = $conn->query("SHOW TABLES");
while ($row = $tables->fetch_array()) {
    echo "- " . $row[0] . "<br>";
}
?>