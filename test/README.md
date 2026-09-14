# This Is Game Dev — simple website starter

This is a plain HTML + CSS + vanilla JavaScript build based on the selected mockup direction.

## Files

- `index.html` — homepage
- `segments.html` — segment descriptions / rules
- `styles.css` — all styling, responsive layout, accessibility states
- `app.js` — menu, Twitch live state, Twitch schedule rendering, contact form
- `config.js` — your public site settings
- `api/twitch.php` — server-side Twitch API bridge
- `api/contact.php` — contact form handler with basic spam protection
- `assets/*.svg` — replaceable placeholder artwork

No CSS framework and no JavaScript library is used.

## 1. Add your Twitch channel

Edit `config.js`:

```js
twitchChannel: "YOUR_CHANNEL"
```

## 2. Create a Twitch developer application

Create an app in the Twitch developer console and get a Client ID + Client Secret.

On your server, ideally set:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

If your host does not support environment variables, you can put the values directly in `api/twitch.php`, but keeping the secret out of a public repository is safer.

The browser never receives your Client Secret.

The PHP endpoint:
- checks whether the channel is live
- loads the broadcaster's Twitch schedule
- returns simple JSON to `app.js`

When live, the page unhides the Twitch section and creates Twitch's official player with:
- autoplay on
- muted on
- your current hostname passed as Twitch's required `parent`

When offline, the live section remains hidden.

Schedule dates are converted by the browser to the visitor's local timezone.

## 3. Contact form

In `api/contact.php`, replace:

```php
YOUR_EMAIL@example.com
```

or set the `CONTACT_TO_EMAIL` environment variable.

It includes basic protection:
- hidden honeypot field
- minimum form-fill time
- input validation / limits
- same-origin check
- simple one-message-per-minute IP cooldown
- safe Reply-To header validation

`mail()` works on many shared hosts, but some hosts require SMTP. If yours does, swap the final mail call for your host's SMTP setup or PHPMailer later.

## 4. Replace the artwork

The current images are intentionally simple SVG placeholders:

- `assets/hero.svg`
- `assets/about.svg`
- `assets/featured.svg`
- `assets/schedule.svg`

You can replace any of those with your own JPG/WebP/PNG and update the matching path in the HTML / PHP.

For the visual direction in your mockup, I would use:
- hero: wide pastel / moody game environment
- live area: Twitch itself supplies the moving visual
- schedule: tiny crops of meshes, WIP scenes, shader tests
- about: quieter environmental scene
- get featured: stranger / more graphic artwork or a close-up asset

## 5. Segment rules

The segment page contains placeholder rules inferred from the formats we discussed. Replace those with the exact wording from the original site before publishing.

## 6. Accessibility included

- semantic headings / sections
- keyboard focus states
- skip link
- responsive navigation
- readable form labels
- reduced-motion support
- live regions for async Twitch / form states
- decorative art uses empty alt text

## 7. Hosting

Upload the folder contents to the public directory on your PHP-capable hosting.

The Twitch API bridge requires:
- PHP 8+
- cURL extension
- outbound HTTPS enabled

The database is not required for this version.
