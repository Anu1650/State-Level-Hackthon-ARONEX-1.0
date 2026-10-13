# ARONEX 1.0 — Website

**State-Level Ideathon & Poster Presentation**
Sharadchandra Pawar College of Engineering, Dumbarwadi, Otur, Pune · 22–23 October 2026
Team of 2 · ₹200 per team

This website **introduces ARONEX 1.0**. Students register and pay on
**Unstop** — the site simply explains the event and links them to the official
registration portal.

```
index.html            Intro page: hero, countdown, competitions, how-to-register, fee, FAQ, contact
admin.html            OPTIONAL organiser dashboard (only used in "form" mode)
css/styles.css        All styling
js/config.js          ★ YOUR settings — event details, organiser contacts, Unstop link
js/supabaseClient.js  Optional Supabase client (only used in "form" mode)
js/main.js            Page logic (mode-aware)
js/admin.js           Optional dashboard logic
supabase/schema.sql   OPTIONAL database + security (only used in "form" mode)
assets/favicon.svg    Site icon
```

> Nothing here invents your UPI ID, phone number, email or prize details.
> Every organiser-specific value is a blank placeholder in `js/config.js`.

---

## Registration modes

`js/config.js` has one switch:

```js
registration: {
  mode: "unstop",        // ← current: intro site, register on Unstop
  unstopUrl: "https://unstop.com/...",   // your Unstop event link
  forms: [               // optional extra registration options (shown beside the Unstop button)
    { label: "Ideathon — Google Form",           url: "https://docs.google.com/forms/d/e/.../viewform" },
    { label: "Poster Presentation — Google Form", url: "https://docs.google.com/forms/d/e/.../viewform" },
  ],
  rulebookUrl: "https://drive.google.com/...", // optional rulebook / guidelines link
  note: "",
},
```

- **`mode: "unstop"`** (default) — the site shows a **Register on Unstop**
  button everywhere. Registration and payment happen entirely on Unstop. No
  database needed.
- **`mode: "form"`** — the site uses its own built-in team registration form
  and the `admin.html` dashboard. This needs a Supabase project (see the
  optional section at the end).

---

## 1. Run it locally

You can simply **double-click `index.html`** — it works straight from disk.

Prefer a local server? From this folder run either:

```bash
python -m http.server 5500      # then open http://localhost:5500
# or
npx serve .
```

---

## 2. Add your Unstop link

1. Create your event on [unstop.com](https://unstop.com/) as an organiser
   (team event, exactly 2 members, ₹200 fee).
2. Copy the public event URL (something like
   `https://unstop.com/competitions/aronex-1-0-...`).
3. Paste it into `js/config.js`:

```js
registration: {
  mode: "unstop",
  unstopUrl: "https://unstop.com/...",   // ← your link
  note: "",                              // optional extra line
},
```

Every **Register on Unstop** button now points there. Until you add a link, the
site shows a polite "link coming soon" note instead of a broken button.

You can also list **extra registration options** (e.g. a Google Form per
competition) via `registration.forms`, and a **rulebook** link via
`registration.rulebookUrl`. Both appear in the "Register" section; the
Rulebook also appears in the header nav and footer. Empty values are hidden
automatically.

---

## 3. Fill in your organiser details

In `js/config.js`:

```js
event: {
  name: "ARONEX 1.0",
  dateLabel: "22–23 October 2026",
  venue: "Sharadchandra Pawar College of Engineering, Dumbarwadi, Otur, Pune",
  teamSize: 2,
  fee: 200,
  currency: "₹",
  startDate: "2026-10-22T09:00:00+05:30",   // drives the countdown
},
organizer: {
  name: "",             // e.g. "Department of Computer Engineering, SPCOE"
  contactEmail: "",
  contactPhone: "",
},
```

Anything left blank is simply hidden. You can also edit the competitions,
domains and FAQ text in the same file / in `index.html`.

---

## 4. Deploy for free

Static hosting — no build step. Good options:

**Cloudflare Pages**
1. Push this folder to a GitHub repository (there are no secrets to leak).
2. [pages.cloudflare.com](https://pages.cloudflare.com/) → **Create project → Connect to Git**.
3. Build command: *(none)* · Output directory: `/`.
4. Deploy. (Check free-plan limits before launch.)

**GitHub Pages** — push to GitHub → **Settings → Pages → Deploy from a branch → main / root**.

**Netlify** — drag-and-drop this folder onto [app.netlify.com/drop](https://app.netlify.com/drop).

Consider adding a custom domain later. You can also add the site link on your
Unstop event page so students can read about the event before registering.

---

## 5. Test before sharing

- [ ] The **Register on Unstop** buttons open your correct Unstop URL.
- [ ] Dates, venue, team size and fee are correct everywhere.
- [ ] The countdown shows the right time remaining.
- [ ] The page works on mobile.
- [ ] Contact details are correct (or hidden if you removed them).
- [ ] No fake prize, UPI or organiser details are shown.

---

## Optional: built-in form + admin dashboard (Supabase)

Only needed if you switch to `mode: "form"` — for example if you later want to
collect registrations on your own site instead of Unstop.

1. Create a project at [supabase.com](https://supabase.com/).
2. **Authentication → Users → Add user** to create your organiser login
   (turn **Auto Confirm User** on). Keep the email private.
3. Open `supabase/schema.sql`, replace `YOUR_ADMIN_EMAIL@example.com` with that
   exact email, and run it in **SQL Editor → New query**.
4. **Project Settings → API keys** → copy the **Project URL** and the
   **publishable / anon key** into `js/config.js`.
5. Set `registration.mode` to `"form"`.

You then get: secure organiser login, registration list, payment
verification (pending / submitted / verified / rejected), CSV export and live
statistics at `admin.html`.

How the form writes to the database (in `js/main.js`):

```js
const res = await supabase.from("aronex_registrations").insert(payload);
```

It deliberately does **not** call `.select()`, so students can never read
registrations back — they only see a confirmation. The database grants the
public role *insert-only* access and allows reads/updates only for users with
the `admin` role, enforced by Row Level Security.

Security notes for that mode:
- RLS is the boundary; a publishable key is not an admin password.
- Never put the secret/service-role key or database password in the website.
- Entering a UTR does not prove payment — verify each transaction yourself.
- Add server-side validation, rate limiting and a CAPTCHA before open
  internet traffic.

---

Built for the ARONEX 1.0 organising committee. Replace every placeholder in
`js/config.js` before sharing the link with students.
