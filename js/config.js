/* =========================================================================
   ARONEX 1.0 — PUBLIC SITE CONFIGURATION
   -------------------------------------------------------------------------
   This file is downloaded by every visitor's browser, so it must contain
   ONLY public values.

   NEVER put these here:
     • your Supabase SECRET / service_role key  (starts with sb_secret_)
     • your database password
   If you do, anyone can read/write your data. Keep them private.

   Fill in the placeholders below, then save. See README.md for the full
   step-by-step setup guide.
   ========================================================================= */

window.ARONEX_CONFIG = {
  /* --- Supabase connection (Setup Step 5) -------------------------------
     Dashboard → Project Settings → API keys
     Copy the Project URL and the publishable / anon key.
     Both are safe for the browser ONLY when RLS is configured (see the SQL
     in supabase/schema.sql). */
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabaseKey: "sb_publishable_REPLACE_ME",

  /* --- Registration mode ------------------------------------------------
     "unstop" = this site only INTRODUCES the event and sends students to
                Unstop to register and pay. (current)
     "form"   = use the built-in team registration form + admin dashboard,
                which needs a Supabase project. See README.md. */
  registration: {
    mode: "unstop",
    unstopUrl: "https://unstop.com/o/rRjGv5f?lb=2plaAQoR", // official Unstop page
    // Extra registration options shown next to the Unstop button (optional)
    forms: [
      {
        label: "Ideathon \u2014 Google Form",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSeOMEwdXX7uFbVc_PAn9Mz9VT2jHy9XYaTD7lfKUpH6tQ4CnA/viewform",
      },
      {
        label: "Poster Presentation \u2014 Google Form",
        url: "https://docs.google.com/forms/d/e/1FAIpQLScM990qaC4rrGd_q9F5cSrCHuMU-JR7Zw23OVuRPCx1KXdroQ/viewform",
      },
    ],
    // Rulebook / guidelines link (optional)
    rulebookUrl: "https://drive.google.com/drive/folders/1M33NV0rGJUsy03UL4hWa2srZJ-5EaKfS",
    note: "",
  },

  /* --- Event details ---------------------------------------------------- */
  event: {
    name: "ARONEX 1.0",
    tagline: "State-Level Ideathon & Poster Presentation",
    theme: "Innovation for a Sustainable Future",
    college: "Sharadchandra Pawar College of Engineering",
    venue: "Sharadchandra Pawar College of Engineering, Dumbarwadi, Otur, Pune",
    dateLabel: "22–23 October 2026",
    startDate: "2026-10-22T09:00:00+05:30", // used by the countdown
    endDate: "2026-10-23T17:00:00+05:30",
    teamSize: 2,
    fee: 200,
    currency: "₹",
  },

  /* --- Competitions ----------------------------------------------------- */
  competitions: [
    {
      key: "Ideathon",
      icon: "💡",
      title: "Ideathon",
      tagline: "Pitch an idea that solves a real problem.",
      description:
        "Present an innovative, feasible idea that addresses a real-world problem. Teams pitch the problem, the proposed solution and its impact to a panel of judges.",
      points: [
        "Original idea with a clear problem statement",
        "Feasibility and clarity of the proposed solution",
        "Impact, innovation and presentation quality",
      ],
    },
    {
      key: "Poster Presentation",
      icon: "🖼️",
      title: "Poster Presentation",
      tagline: "Showcase your work on a technical poster.",
      description:
        "Design and present a technical poster explaining your project, research or concept, and defend it during the judging session.",
      points: [
        "Technical depth and accuracy",
        "Poster design, layout and readability",
        "Clarity while explaining to the judges",
      ],
    },
  ],

  /* --- Registration form options ---------------------------------------- */
  domains: [
    "Artificial Intelligence & Machine Learning",
    "Internet of Things & Embedded Systems",
    "Web & Mobile Application Development",
    "Cybersecurity & Blockchain",
    "Robotics & Automation",
    "Healthcare & MedTech",
    "Agriculture & Rural Development",
    "Sustainability & Clean Energy",
    "FinTech & Smart Commerce",
    "Education Technology",
    "Other",
  ],
  academicYears: ["First Year", "Second Year", "Third Year", "Fourth Year", "Other"],

  /* --- Organiser details ------------------------------------------------
     Fill these in yourself. Anything left blank is simply hidden on the
     site. No UPI ID, phone number or email has been invented for you. --- */
  organizer: {
    name: "Sharadchandra Pawar College of Engineering, Dumbarwadi, Otur, Pune",
    contactEmail: "",
    contactPhone: "",
    // One card per coordinator, shown in the Contact section.
    contacts: [
      { role: "Faculty Coordinator", name: "Dr. Monika Rokade", phone: "+91 75880 31942" },
      { role: "Student Coordinator", name: "Samarth Jadhav", phone: "+91 90493 91868" },
    ],
    upiId: "",
    upiPayeeName: "",
    upiLink: "",
    qrImage: "",
    extraNote: "",
  },
};
