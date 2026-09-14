const fs = require('fs');
const path = require('path');

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const channel = process.env.TWITCH_CHANNEL;

if (!clientId || !clientSecret || !channel) {
    console.error('Missing Twitch environment variables.');
    process.exit(1);
}

async function getAppToken() {
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
    });

    const response = await fetch(
        `https://id.twitch.tv/oauth2/token?${params}`,
        {
            method: 'POST'
        }
    );

    if (!response.ok) {
        throw new Error(`Could not authenticate with Twitch: ${response.status}`);
    }

    const data = await response.json();

    return data.access_token;
}

async function twitchRequest(url, token) {
    const response = await fetch(url, {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Twitch API request failed: ${response.status}`);
    }

    return response.json();
}

async function updateTwitchData() {
    console.log(`Getting Twitch data for ${channel}...`);

    const token = await getAppToken();

    // Find user
    const users = await twitchRequest(
        `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`,
        token
    );

    const user = users.data?.[0];

    if (!user) {
        throw new Error('Twitch user not found.');
    }

    const userId = user.id;

    // Check whether stream is live
    const streamData = await twitchRequest(
        `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(userId)}`,
        token
    );

    // Get upcoming schedule
    const scheduleData = await twitchRequest(
        `https://api.twitch.tv/helix/schedule?broadcaster_id=${encodeURIComponent(userId)}&first=25`,
        token
    );

    const schedule = [];

    for (const segment of scheduleData.data?.segments ?? []) {
        if (segment.canceled_until) {
            continue;
        }

        schedule.push({
            id: segment.id ?? null,
            title: segment.title ?? 'Twitch stream',
            category: segment.category?.name ?? 'Live stream',
            start_time: segment.start_time ?? null,
            end_time: segment.end_time ?? null,
            image: 'assets/schedule.svg'
        });
    }

    const output = {
        live: streamData.data?.length > 0,
        schedule: schedule,
        updated_at: new Date().toISOString()
    };

    const outputDirectory = path.join(process.cwd(), 'data');

    fs.mkdirSync(outputDirectory, {
        recursive: true
    });

    fs.writeFileSync(
        path.join(outputDirectory, 'twitch.json'),
        JSON.stringify(output, null, 2)
    );

    console.log(`Saved ${schedule.length} schedule entries.`);
}

updateTwitchData().catch(error => {
    console.error(error);
    process.exit(1);
});