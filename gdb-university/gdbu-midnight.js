/* GDB University · Signed In After Midnight · additive shared wall.
   Campus Passport remains independent and unchanged. */
(() => {
  "use strict";
  const dialog = document.getElementById("gdb-midnight-dialog");
  if (!dialog) return;
  const ENDPOINT = "https://fgtowzonkmirmugnzlsf.supabase.co/functions/v1/gdb-midnight-wall";
  const PUBLIC_ANON_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndG93em9ua21pcm11Z256bHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTk5MDIsImV4cCI6MjEwNzA5NTkwMn0.XgVqz_1hvkHv-TptiAXou5RTQMCi8kkJUQjJ6wS3gQc"; // Supabase public anonymous key; never a server secret.
  const $ = selector => dialog.querySelector(selector);
  const openers = document.querySelectorAll("[data-gdb-midnight-open]");
  const close = $("[data-gdb-midnight-close]");
  const refresh = $("[data-gdb-midnight-refresh]");
  const form = $("[data-gdb-midnight-form]");
  const submit = $("[data-gdb-midnight-submit]");
  const notice = $("[data-gdb-midnight-notice]");
  const entries = $("[data-gdb-midnight-entries]");
  const summary = $("[data-gdb-midnight-summary]");
  let lastOpener = null;
  let activeRequest = false;

  const headers = {
    "apikey": PUBLIC_ANON_JWT,
    "authorization": "Bearer " + PUBLIC_ANON_JWT
  };
  const setNotice = (message, kind = "") => {
    notice.textContent = message;
    notice.dataset.kind = kind;
  };
  function small(name, text) {
    const node = document.createElement(name);
    node.textContent = text;
    return node;
  }
  const dateText = raw => {
    const date = new Date(raw);
    return Number.isFinite(date.getTime()) ?
      new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date) : "";
  };
  const departmentNames = new Set(["Undeclared", "Low End Studies", "Dancefloor Physics", "Club Science", "Rave Ethics"]);

  function renderWall(items) {
    entries.replaceChildren();
    if (!items.length) {
      const empty = small("p", "The wall is waiting for its first approved signature. Yours could be next.");
      empty.className = "gdb-midnight-empty";
      entries.append(empty);
      summary.textContent = "THE YEARBOOK IS OPEN";
      return;
    }
    summary.textContent = items.length + (items.length === 1 ? " SIGNATURE ON THE WALL" : " SIGNATURES ON THE WALL");
    items.forEach((entry, index) => {
      const card = document.createElement("article");
      card.className = "gdb-midnight-note";
      card.style.setProperty("--note-tilt", ["-1.7deg","1.4deg","-0.6deg","2deg"][index % 4]);
      const kicker = small("span", departmentNames.has(entry.department) ? entry.department : "GDB University");
      kicker.className = "gdb-midnight-note-dept";
      const name = small("h3", String(entry.nickname || "Night Scholar").slice(0,32));
      card.append(kicker, name);
      if (entry.note) {
        const message = small("p", String(entry.note).slice(0,180));
        card.append(message);
      }
      const time = small("time", dateText(entry.created_at));
      if (entry.created_at) time.dateTime = String(entry.created_at);
      card.append(time);
      entries.append(card);
    });
  }

  async function fetchWall() {
    summary.textContent = "CHECKING THE YEARBOOK…";
    entries.replaceChildren(small("p","Loading approved signatures…"));
    try {
      const response = await fetch(ENDPOINT, {method:"GET",headers,cache:"no-store"});
      if (!response.ok) throw new Error("Wall is unavailable");
      const body = await response.json();
      if (!Array.isArray(body.entries)) throw new Error("Invalid wall response");
      renderWall(body.entries.slice(0,80));
    } catch (_) {
      entries.replaceChildren(small("p","The yearbook is temporarily unavailable. Please try again."));
      summary.textContent = "CONNECTION UNAVAILABLE";
    }
  }

  openers.forEach(opener => opener.addEventListener("click", () => {
    lastOpener = opener;
    dialog.showModal();
    fetchWall();
  }));
  close.addEventListener("click", () => dialog.close());
  refresh.addEventListener("click", fetchWall);
  dialog.addEventListener("close", () => { lastOpener?.focus(); });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (activeRequest || !form.reportValidity()) return;
    const data = new FormData(form);
    activeRequest = true;
    submit.disabled = true;
    setNotice("Sending your signature…");
    try {
      const result = await fetch(ENDPOINT, {
        method:"POST",
        headers:{...headers,"content-type":"application/json"},
        body:JSON.stringify({
          nickname:String(data.get("nickname") || "").trim(),
          note:String(data.get("note") || "").trim(),
          department:String(data.get("department") || "Undeclared"),
          website:String(data.get("website") || "")
        })
      });
      const body = await result.json().catch(() => ({}));
      if (result.status === 202 && body.ok) {
        form.reset();
        setNotice("You're signed in! Your message is waiting for approval before it appears on the public wall.", "success");
      } else if (result.status === 429) {
        setNotice("You signed in recently. Come back a little later to leave another message.", "error");
      } else if (result.status === 400) {
        setNotice("Please double-check your name and message, then try again.", "error");
      } else {
        setNotice("We couldn't save that signature right now. Please try again later.", "error");
      }
    } catch (_) {
      setNotice("Connection trouble. No confirmation yet—please try again later.", "error");
    } finally {
      activeRequest = false;
      submit.disabled = false;
    }
  });
})();
