const fs = require('fs');
const path = require('path');

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const channel = process.env.TWITCH_CHANNEL;

if (!clientId || !clientSecret || !channel) {
  console.error('Missing TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, or TWITCH_CHANNEL.');
  process.exit(1);
}

async function getAppToken() {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Could not authenticate with Twitch (${response.status}).`);
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
    const text = await response.text();
    throw new Error(`Twitch API request failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function updateTwitchData() {
  console.log(`Updating Twitch data for ${channel}...`);
  const token = await getAppToken();

  const users = await twitchRequest(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(channel)}`,
    token
  );

  const user = users.data?.[0];
  if (!user) throw new Error(`Twitch user "${channel}" was not found.`);

  const userId = user.id;

  const [streamData, scheduleData] = await Promise.all([
    twitchRequest(
      `https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(userId)}`,
      token
    ),
    twitchRequest(
      `https://api.twitch.tv/helix/schedule?broadcaster_id=${encodeURIComponent(userId)}&first=25`,
      token
    )
  ]);

  const schedule = (scheduleData.data?.segments ?? [])
    .filter(segment => !segment.canceled_until)
    .map(segment => ({
      id: segment.id ?? null,
      title: segment.title ?? 'Twitch stream',
      category: segment.category?.name ?? 'Live stream',
      start_time: segment.start_time ?? null,
      end_time: segment.end_time ?? null,
      image: 'assets/schedule.svg'
    }));

  const output = {
    live: (streamData.data?.length ?? 0) > 0,
    schedule,
    updated_at: new Date().toISOString()
  };

  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'twitch.json'),
    JSON.stringify(output, null, 2) + '\n',
    'utf8'
  );

  console.log(`Saved ${schedule.length} schedule entr${schedule.length === 1 ? 'y' : 'ies'}.`);
}

updateTwitchData().catch(error => {
  console.error(error);
  process.exit(1);
});
