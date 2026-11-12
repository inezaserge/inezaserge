/* ============================================================
   Ineza Serge — Portfolio (white + blue)
   1. Setup          2. Theme            3. Navigation
   4. Ambient        5. Intro            6. Scroll story (pinned)
   7. Cards + reveals   8. Misc
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ---------- 1. Setup ---------- */
const $  = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 2. Theme (device setting by default, saved choice wins) ---------- */
const root = document.documentElement;
const themeToggle = $("#themeToggle");
const deviceDark = matchMedia("(prefers-color-scheme: dark)");

const savedTheme = () => {
  try { return localStorage.getItem("theme"); } catch { return null; }
};
const applyTheme = (theme) => {
  root.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
};

applyTheme(root.getAttribute("data-theme"));

themeToggle.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("theme", next); } catch { /* storage blocked */ }
});

// Visitors who never picked a theme follow the device when it changes
deviceDark.addEventListener("change", (e) => {
  if (!savedTheme()) applyTheme(e.matches ? "dark" : "light");
});

/* ---------- 3. Navigation + scrollspy ---------- */
const burger = $("#burger");
const menu = $("#menu");

burger.addEventListener("click", () => {
  const open = menu.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", String(open));
});

let story, projectsTween; // master timelines (section 6 and 6b)

// Converts a nav target into a scroll position (pinned sections map to pixels)
const scrollTarget = (id) => {
  const st = story.scrollTrigger;
  const atLabel = (label) => st.start + (story.labels[label] / story.duration()) * (st.end - st.start);

  if (id === "home") return 0;
  if (id === "about" || id === "services") return atLabel(id);
  if (id === "projects") return projectsTween.scrollTrigger.start;
  return $("#" + id).getBoundingClientRect().top + window.scrollY - 70;
};

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-goto]");
  if (!link) return;
  e.preventDefault();
  menu.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: scrollTarget(link.dataset.goto), behavior: "smooth" });
});

// Highlight the nav link of the section you are in
const spyIds = ["home", "about", "services", "skills", "projects", "contact"];
const navLinks = $$(".nav__links a");
const nav = $(".nav");

ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: () => {
    if (!story || !projectsTween) return; // pinned sections not ready yet
    const y = window.scrollY + window.innerHeight * 0.35;
    let current = "home";
    spyIds.forEach((id) => { if (scrollTarget(id) <= y) current = id; });
    navLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.goto === current));

    // words only on Home and About, glass pill from "What I do" onward
    nav.classList.toggle("nav--clear", current === "home" || current === "about");
  },
});

/* ---------- 4. Ambient: the role text rotates ---------- */
if (!reduceMotion) {
  const roles = ["Website Developer", "Backend Developer", "Mobile Developer", "AI Creator", "Graphic Designer"];
  const ROLE_HOLD = 1.1 // seconds each word stays visible
  const roleEl = $(".js-role");
  let roleIndex = 0;

  const cycleRole = () => {
    gsap.timeline({ onComplete: cycleRole })
      // the word stays still for ROLE_HOLD seconds, then slides out
      .to(roleEl, { yPercent: -100, autoAlpha: 0, duration: 0.4, ease: "power2.in" }, ROLE_HOLD)
      .add(() => {
        roleIndex = (roleIndex + 1) % roles.length;
        roleEl.textContent = roles[roleIndex];
      })
      .fromTo(roleEl,
        { yPercent: 100, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", immediateRender: false });
  };

  gsap.delayedCall(1.2, cycleRole); // start after the hero intro has finished
}

/* ---------- 5. Intro ---------- */
gsap.from("[data-intro]", {
  y: 40,
  autoAlpha: 0,
  duration: 0.9,
  ease: "power3.out",
  stagger: 0.08,
  delay: 0.1,
});

/* ---------- 6. Scroll story: hero → about → services ---------- */
const stage = $(".stage");
const collapseItems = $$("[data-collapse]");
const aboutLayer = $(".layer--about");
const servicesLayer = $(".layer--services");
const chapters = $$(".chapter");
const dots = $$(".dot");
const codeSteps = [0, 1, 2].map((n) => $$(`.about .ln[data-step="${n}"]`));
/* ---------- Background video: pause when off-screen or when calm motion is preferred ---------- */
const bgVideo = $(".bgvideo video");
if (bgVideo) {
  const saveData = navigator.connection && navigator.connection.saveData;
  if (reduceMotion || saveData) {
    bgVideo.removeAttribute("autoplay");
    bgVideo.pause(); // the still poster image stays visible
  } else {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) bgVideo.play().catch(() => {});
      else bgVideo.pause(); // saves battery once you scroll past the stage
    }).observe(stage);
  }
}

// Distance an element must travel to land in the middle of the stage
const toCenter = (el) => {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: s.left + s.width / 2 - (r.left + r.width / 2),
    y: s.top + (s.height + 72) / 2 - (r.top + r.height / 2), // 72 = navbar offset
  };
};

// Starting states
gsap.set(chapters.slice(1), { autoAlpha: 0, y: 40 });
gsap.set(dots, { opacity: 0.35 });
gsap.set(dots[0], { opacity: 1, scaleX: 2.6 });

story = gsap.timeline({
  defaults: { ease: "none" },
  scrollTrigger: {
    trigger: stage,
    start: "top top",
    end: () => `+=${window.innerHeight * 5}`, // smaller number = faster story (was 8)
    pin: true,
    scrub: 0.5,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  },
});

// Switches the story text and the progress dots
const swapChapter = (from, to, at) => {
  story
    .to(chapters[from], { autoAlpha: 0, y: -40, duration: 0.4 }, at)
    .to(chapters[to],   { autoAlpha: 1, y: 0,   duration: 0.4 }, at + 0.3)
    .to(dots[from],     { opacity: 0.35, scaleX: 1,   duration: 0.4 }, at)
    .to(dots[to],       { opacity: 1,    scaleX: 2.6, duration: 0.4 }, at + 0.3);
};

// The code window "writes" its lines while you scroll
const writeCode = (step, at) => {
  story.fromTo(codeSteps[step],
    { autoAlpha: 0, x: -14 },
    { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.15 }, at);
};

story
  .addLabel("home", 0)

  // 1) Everything in the hero is pulled to the centre and disappears
  .to(collapseItems, {
    x: (i, el) => toCenter(el).x,
    y: (i, el) => toCenter(el).y,
    scale: 0.1,
    rotation: () => gsap.utils.random(-180, 180),
    autoAlpha: 0,
    ease: "power2.in",
    duration: 1.1,
    stagger: { amount: 0.4 },
  }, 0)

  // 2) The about section grows out of the centre
  .fromTo(aboutLayer,
    { autoAlpha: 0, scale: 0.4 },
    { autoAlpha: 1, scale: 1, duration: 0.9, ease: "power3.out" }, 1.4)
  .addLabel("about", 2.4);

writeCode(0, 2.4);
swapChapter(0, 1, 3.4);
writeCode(1, 3.8);
swapChapter(1, 2, 5.2);
writeCode(2, 5.6);

story
  // 3) About slides away to the right, services arrive
  .to(aboutLayer, { xPercent: 100, duration: 1.1, ease: "power2.inOut" }, 6.8)
  .fromTo(servicesLayer,
    { xPercent: -100, autoAlpha: 0 },
    { xPercent: 0, autoAlpha: 1, duration: 1.1, ease: "power2.inOut" }, 6.8)
  .fromTo(".service-card",
    { y: 60, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.1 }, 7.6)
  .addLabel("services", 8.4)
  .to({}, { duration: 0.5 }, 8.7); // short pause before the page continues


/* ---------- 6b. Projects: pinned horizontal slider ---------- */
const projectsSection = $(".projects");
const projectsTrack = $(".projects__track");
const projectCards = $$(".project");
const countEl = $(".js-count");

const trackDistance = () => Math.max(0, projectsTrack.scrollWidth - window.innerWidth);

projectsTween = gsap.to(projectsTrack, {
  x: () => -trackDistance(),
  ease: "none",
  scrollTrigger: {
    trigger: projectsSection,
    start: "top top",
    end: () => `+=${trackDistance()}`,
    pin: true,
    scrub: 1,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const current = Math.min(projectCards.length, Math.floor(self.progress * projectCards.length) + 1);
      countEl.textContent = String(current).padStart(2, "0");
    },
  },
});

// Each box fills its progress bar and counts up when it slides into view
projectCards.forEach((card) => {
  const target = Number(card.dataset.progress);
  const fill = $(".bar__fill", card);
  const labels = $$(".js-pct", card);
  const counter = { value: 0 };

  labels.forEach((el) => { el.textContent = "0%"; });

  gsap.timeline({
    scrollTrigger: {
      trigger: card,
      containerAnimation: projectsTween,
      start: "left 80%",
      toggleActions: "play none none reverse",
    },
  })
    .fromTo(fill, { scaleX: 0 }, { scaleX: target / 100, duration: 1.4, ease: "power3.out" }, 0)
    .to(counter, {
      value: target,
      duration: 1.4,
      ease: "power3.out",
      onUpdate: () => labels.forEach((el) => { el.textContent = `${Math.round(counter.value)}%`; }),
    }, 0);
});

/* ---------- 7. Cards spotlight + reveals ---------- */
// Soft blue light follows the cursor inside each service card
$$(".service-card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });
});

// Duplicate the skill tiles so the marquee loops without a gap
$$(".marquee__track").forEach((track) => {
  [...track.children].forEach((tile) => {
    const copy = tile.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    track.appendChild(copy);
  });
});

$$(".reveal").forEach((el) => {
  gsap.from(el, {
    y: 50, autoAlpha: 0, duration: 0.9, ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" },
  });
});

// Skills rows rise from the bottom centre
gsap.from(".marquee", {
  y: 120, scale: 0.9, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.2,
  scrollTrigger: { trigger: ".skills", start: "top 55%", toggleActions: "play none none reverse" },
});

/* ---------- 8. Misc ---------- */
gsap.to(".progress", {
  scaleX: 1, ease: "none",
  scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
});

$("#year").textContent = new Date().getFullYear();

// Re-measure once fonts and images have loaded
window.addEventListener("load", () => ScrollTrigger.refresh());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
