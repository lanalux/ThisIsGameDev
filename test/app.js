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
          <div class="schedule-date"><strong>SETUP</strong><span>TWITCH</span></div>
          <img class="schedule-thumb" src="assets/schedule.svg" alt="">
          <div class="schedule-title"><strong>Add your Twitch channel</strong><span>Edit config.js</span></div>
          <div class="schedule-time">Local time appears here</div>
          <span class="schedule-link">+</span>
        </div>`;
      return;
    }

    try {
      const response = await fetch(`${cfg.twitchApiEndpoint || "api/twitch.php"}?channel=${encodeURIComponent(cfg.twitchChannel)}`, {
        headers: { "Accept": "application/json" }
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
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = document.getElementById("form-status");

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      status.textContent = "Sending…";

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { "Accept": "application/json" }
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.message || "Could not send.");
        form.reset();
        if (startedAt) startedAt.value = String(Date.now());
        status.textContent = "Sent. Thank you.";
      } catch (error) {
        status.textContent = "Could not send right now. Please try again.";
      } finally {
        submit.disabled = false;
      }
    });
  }

  loadTwitch();
})();
