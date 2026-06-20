const slides = Array.from(document.querySelectorAll(".slide"));
const progressBar = document.getElementById("progressBar");
const currentSlide = document.getElementById("currentSlide");
const totalSlides = document.getElementById("totalSlides");
const thumbNav = document.getElementById("thumbNav");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const modeButtons = Array.from(document.querySelectorAll(".mode"));

let activeIndex = 0;

const pad = (value) => String(value).padStart(2, "0");

function slideLabel(slide, index) {
  const kicker = slide.dataset.kicker || `Slide ${index + 1}`;
  return kicker.replace(/^\d+\s*[·.]?\s*/, "");
}

function buildThumbs() {
  slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb";
    button.setAttribute("aria-label", `Go to ${slideLabel(slide, index)}`);
    button.innerHTML = `<span>${pad(index + 1)}</span><b>${slideLabel(slide, index)}</b>`;
    button.addEventListener("click", () => goTo(index));
    thumbNav.appendChild(button);
  });
}

function updateDeck() {
  slides.forEach((slide, index) => {
    const isActive = index === activeIndex;
    slide.classList.toggle("active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  Array.from(document.querySelectorAll(".thumb")).forEach((thumb, index) => {
    thumb.classList.toggle("active", index === activeIndex);
  });

  currentSlide.textContent = pad(activeIndex + 1);
  totalSlides.textContent = pad(slides.length);
  progressBar.style.width = `${((activeIndex + 1) / slides.length) * 100}%`;
  prevBtn.disabled = activeIndex === 0;
  nextBtn.disabled = activeIndex === slides.length - 1;

  if (window.matchMedia("(max-width: 820px)").matches) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function goTo(index) {
  activeIndex = Math.max(0, Math.min(index, slides.length - 1));
  updateDeck();
}

function next() {
  goTo(activeIndex + 1);
}

function prev() {
  goTo(activeIndex - 1);
}

document.addEventListener("keydown", (event) => {
  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    next();
  }

  if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    prev();
  }

  if (event.key === "Home") {
    event.preventDefault();
    goTo(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    goTo(slides.length - 1);
  }
});

prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    modeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.body.dataset.mode = button.dataset.mode;
  });
});

buildThumbs();
updateDeck();

if (window.lucide) {
  window.lucide.createIcons();
}
