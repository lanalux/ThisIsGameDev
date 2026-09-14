<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

$channel = trim($_GET['channel'] ?? '');
if ($channel === '' || !preg_match('/^[A-Za-z0-9_]{3,25}$/', $channel)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid channel']);
    exit;
}

// Set these as server environment variables if possible.
// Fallback: replace the placeholder strings below.
$clientId = getenv('TWITCH_CLIENT_ID') ?: 'YOUR_TWITCH_CLIENT_ID';
$clientSecret = getenv('TWITCH_CLIENT_SECRET') ?: 'YOUR_TWITCH_CLIENT_SECRET';

if (str_starts_with($clientId, 'YOUR_') || str_starts_with($clientSecret, 'YOUR_')) {
    http_response_code(500);
    echo json_encode(['error' => 'Twitch API credentials are not configured.']);
    exit;
}

function twitchRequest(string $url, string $clientId, string $token): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => [
            'Client-ID: ' . $clientId,
            'Authorization: Bearer ' . $token
        ]
    ]);

    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $status < 200 || $status >= 300) {
        throw new RuntimeException('Twitch API request failed.');
    }

    return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
}

function getAppToken(string $clientId, string $clientSecret): string {
    $cacheFile = sys_get_temp_dir() . '/thisisgamedev_twitch_token.json';

    if (is_file($cacheFile)) {
        $cached = json_decode((string) file_get_contents($cacheFile), true);
        if (is_array($cached) && ($cached['expires_at'] ?? 0) > time() + 120) {
            return (string) $cached['token'];
        }
    }

    $url = 'https://id.twitch.tv/oauth2/token?' . http_build_query([
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'grant_type' => 'client_credentials'
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8
    ]);

    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false || $status < 200 || $status >= 300) {
        throw new RuntimeException('Could not authenticate with Twitch.');
    }

    $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    $token = (string) ($data['access_token'] ?? '');
    $expires = (int) ($data['expires_in'] ?? 0);

    @file_put_contents($cacheFile, json_encode([
        'token' => $token,
        'expires_at' => time() + $expires
    ]));

    return $token;
}

try {
    $token = getAppToken($clientId, $clientSecret);

    $users = twitchRequest(
        'https://api.twitch.tv/helix/users?login=' . rawurlencode($channel),
        $clientId,
        $token
    );

    $user = $users['data'][0] ?? null;
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'Twitch user not found.']);
        exit;
    }

    $userId = (string) $user['id'];

    $streamData = twitchRequest(
        'https://api.twitch.tv/helix/streams?user_id=' . rawurlencode($userId),
        $clientId,
        $token
    );

    $scheduleData = twitchRequest(
        'https://api.twitch.tv/helix/schedule?broadcaster_id=' . rawurlencode($userId) . '&first=10',
        $clientId,
        $token
    );

    $schedule = [];
    foreach (($scheduleData['data']['segments'] ?? []) as $segment) {
        if (!empty($segment['canceled_until'])) continue;

        $schedule[] = [
            'id' => $segment['id'] ?? null,
            'title' => $segment['title'] ?? 'Twitch stream',
            'category' => $segment['category']['name'] ?? 'Live stream',
            'start_time' => $segment['start_time'] ?? null,
            'end_time' => $segment['end_time'] ?? null,
            // Use your own image art for schedule rows by replacing this value.
            'image' => 'assets/schedule.svg'
        ];
    }

    echo json_encode([
        'live' => !empty($streamData['data']),
        'schedule' => $schedule
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    error_log($e->getMessage());
    http_response_code(502);
    echo json_encode(['error' => 'Twitch data is temporarily unavailable.']);
}
