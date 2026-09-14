(() => {
  "use strict";

  const cfg = window.SITE_CONFIG || {};

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });

    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const startedAt = document.getElementById("started-at");
  if (startedAt) startedAt.value = String(Date.now());

  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));

  const localDateParts = (iso) => {
    const d = new Date(iso);
    return {
      dow: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d).toUpperCase(),
      mon: new Intl.DateTimeFormat(undefined, { month: "short" }).format(d).toUpperCase(),
      day: new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(d),
      time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d)
    };
  };

  async function loadTwitch() {
    const scheduleEl = document.getElementById("schedule-list");
    if (!scheduleEl) return;

    if (!cfg.twitchChannel || cfg.twitchChannel === "lana_lux") {
      scheduleEl.innerHTML = `
        <div class="schedule-item">
          <div class="schedule-date"><strong>15</strong><span>SEPT</span></div>
          <img class="schedule-thumb" src="assets/schedule.svg" alt="">
          <div class="schedule-title"><strong>Work and Learn</strong><span>We'll do a coworking session where we vote on a topic to watch videos about while working on our tasks for the day.</span></div>
          <div class="schedule-time">11am - 1pm Eastern Time</div>
          <span class="schedule-link">+</span>
        </div>`;
      return;
    }

    try {
      const twitchDataUrl = cfg.twitchDataFile || "data/twitch.json";
      const response = await fetch(twitchDataUrl, {
        headers: { "Accept": "application/json" },
        cache: "no-cache"
      });
      if (!response.ok) throw new Error("Twitch endpoint failed.");
      const data = await response.json();

      const liveSection = document.getElementById("live");
      if (data.live && liveSection) {
        liveSection.hidden = false;
        const player = document.getElementById("twitch-player");
        const parent = location.hostname || "localhost";
        const src =
          `https://player.twitch.tv/?channel=${encodeURIComponent(cfg.twitchChannel)}` +
          `&parent=${encodeURIComponent(parent)}&muted=true&autoplay=true`;
        player.innerHTML =
          `<iframe title="${escapeHtml(cfg.twitchChannel)} live on Twitch" src="${src}" allowfullscreen loading="eager"></iframe>`;
      }

      const items = Array.isArray(data.schedule) ? data.schedule : [];
      if (!items.length) {
        scheduleEl.innerHTML = `<p class="loading">No upcoming streams are currently scheduled.</p>`;
        return;
      }

      scheduleEl.innerHTML = items.slice(0, cfg.maxScheduleItems || 6).map((item) => {
        const p = localDateParts(item.start_time);
        return `
          <article class="schedule-item">
            <div class="schedule-date">
              <strong>${escapeHtml(p.dow)}</strong>
              <span>${escapeHtml(p.mon)} ${escapeHtml(p.day)}</span>
            </div>
            <img class="schedule-thumb" src="${escapeHtml(item.image || "assets/schedule.svg")}" alt="">
            <div class="schedule-title">
              <strong>${escapeHtml(item.title || "Twitch stream")}</strong>
              <span>${escapeHtml(item.category || "Live stream")}</span>
            </div>
            <div class="schedule-time">${escapeHtml(p.time)}</div>
            <span class="schedule-link" aria-hidden="true">+</span>
          </article>`;
      }).join("");
    } catch (error) {
      console.error(error);
      scheduleEl.innerHTML = `<p class="loading">Schedule is temporarily unavailable. Check back soon.</p>`;
    }
  }

  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = document.getElementById("form-status");

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const email = cfg.contactEmail;
      if (!email || email === "YOUR_EMAIL@example.com") {
        status.textContent = "Contact email is not configured yet.";
        return;
      }

      const data = new FormData(form);
      const subject = data.get("subject") || "Website enquiry";
      const name = data.get("name") || "";
      const replyTo = data.get("email") || "";
      const message = data.get("message") || "";
      const body = `Name: ${name}\nEmail: ${replyTo}\n\n${message}`;

      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "Opening your email app…";
    });
  }

  loadTwitch();
})();
