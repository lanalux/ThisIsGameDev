<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function fail(int $status, string $message): never {
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Method not allowed.');
}

// Change this before launch.
$destination = getenv('CONTACT_TO_EMAIL') ?: 'hi@thisisgamedev.com';

// Basic same-site check. Keep if the form lives on the same domain.
$host = $_SERVER['HTTP_HOST'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $host !== '' && parse_url($origin, PHP_URL_HOST) !== $host) {
    fail(403, 'Error.');
}

// Honeypot.
if (trim($_POST['website'] ?? '') !== '') {
    // Return success so bots do not learn what triggered the rejection.
    echo json_encode(['ok' => true]);
    exit;
}

// Human-speed check. Blocks instant form submissions.
$startedAt = (int) ($_POST['started_at'] ?? 0);
if ($startedAt <= 0 || (int)(microtime(true) * 1000) - $startedAt < 2500) {
    fail(400, 'Please wait a moment and try again.');
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$company = trim($_POST['company'] ?? '');
$topic = trim($_POST['topic'] ?? '');
$message = trim($_POST['message'] ?? '');

if ($name === '' || mb_strlen($name) > 80) fail(400, 'Please enter your name.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 160) fail(400, 'Please enter a valid email.');
if ($topic === '' || mb_strlen($topic) > 100) fail(400, 'Please choose a topic.');
if ($message === '' || mb_strlen($message) > 4000) fail(400, 'Please enter a message.');
if (mb_strlen($company) > 120) fail(400, 'Company name is too long.');

if (preg_match('/[\r\n]/', $email)) fail(400, 'Invalid email.');

// Lightweight IP cooldown using a temp file.
// For higher traffic, replace this with your database or Redis.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$key = hash('sha256', $ip);
$rateFile = sys_get_temp_dir() . '/thisisgamedev_contact_' . $key;
if (is_file($rateFile) && filemtime($rateFile) > time() - 60) {
    fail(429, 'Please wait before sending another message.');
}
@touch($rateFile);

$subject = '[This Is Game Dev] ' . $topic;
$body =
    "Name: {$name}\n" .
    "Email: {$email}\n" .
    "Company / project: {$company}\n" .
    "Topic: {$topic}\n\n" .
    "Message:\n{$message}\n";

$headers = [
    'Content-Type: text/plain; charset=UTF-8',
    'From: website@' . preg_replace('/:\d+$/', '', $host),
    'Reply-To: ' . $email
];

$sent = @mail($destination, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    fail(500, 'Mail could not be sent. Your host may require SMTP.');
}

echo json_encode(['ok' => true]);
