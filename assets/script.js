// Variables globales pour le scroll horizontal
let slidesCount   = 0;
let currentIndex  = 0;
let wheelDeltaAcc = 0;

/**
 * Fonction de scroll horizontal : traduit #horizontal-section
 * en fonction du scroll vertical, mais seulement sur desktop.
 */
function handleScroll() {
  const sec = document.getElementById("horizontal-section");
  if (!sec) return;

  if (window.innerWidth >= 1025) {
    const maxScroll    = (slidesCount - 1) * window.innerHeight;
    const scrollTop    = window.scrollY;
    const clamped      = Math.max(0, Math.min(scrollTop, maxScroll));
    const ratio        = clamped / maxScroll;
    const maxTranslate = (slidesCount - 1) * 0.5 * window.innerWidth;
    const translateX   = -ratio * maxTranslate;
    sec.style.transform = `translateX(${translateX}px)`;
  } else {
    sec.style.transform = "translateX(0)";
  }
}

/**
 * Gestionnaire de la molette : “snap” slide par slide
 * (uniquement sur desktop, désactivé sur mobile).
 */
function handleWheel(event) {
  if (window.innerWidth < 1025) return;
  event.preventDefault();

  wheelDeltaAcc += event.deltaY;
  const threshold = 100;

  if (wheelDeltaAcc > threshold && currentIndex < slidesCount - 1) {
    currentIndex++;
    wheelDeltaAcc = 0;
  } else if (wheelDeltaAcc < -threshold && currentIndex > 0) {
    currentIndex--;
    wheelDeltaAcc = 0;
  }

  window.scrollTo({
    top: currentIndex * window.innerHeight,
    behavior: "smooth"
  });
}

/**
 * Réinitialisation en cas de redimensionnement sous 1025px :
 * remet la page au slide 0 et désactive toute translation.
 */
function handleResize() {
  if (window.innerWidth < 1025) {
    currentIndex  = 0;
    wheelDeltaAcc = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
    const sec = document.getElementById("horizontal-section");
    if (sec) sec.style.transform = "translateX(0)";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1) Initialisation du nombre de slides et du body height
  slidesCount = document.querySelectorAll(".slide").length;
  document.body.style.height = `${slidesCount * 100}vh`;
  document.documentElement.style.setProperty("--slides-count", slidesCount);

  // 2) Détection du mode mobile (smartphones/tablettes)
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (!isMobile) {
    // Only on desktop: bind custom scroll handlers
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("wheel",  handleWheel,  { passive: false });
    window.addEventListener("resize", handleResize);
    handleScroll();
  } else {
    // On mobile: remove any transform
    const sec = document.getElementById("horizontal-section");
    if (sec) sec.style.transform = "none";
  }

  // 3) Détection de plateforme pour le bouton “Get the app”
  const btn         = document.querySelector('.get-app-btn');
  const iosLink     = 'https://apps.apple.com/us/app/sway-find-raves-and-festivals/id6744655264';
  const androidLink = 'https://play.google.com/store/apps/details?id=app.sway.main';
  const defaultLink = iosLink;

  if (btn) {
    btn.addEventListener('click', () => {
      let linkToOpen = defaultLink;
      const ua = navigator.userAgent || '';

      // Modern browsers (Chrome/Edge) with userAgentData
      if (navigator.userAgentData && navigator.userAgentData.platform) {
        const plat = navigator.userAgentData.platform;
        if (/Android/i.test(plat)) {
          linkToOpen = androidLink;
        } else if (/iPhone|iPad|iPod|iOS/i.test(plat)) {
          linkToOpen = iosLink;
        }
      }
      // Fallback on userAgent string
      else {
        if (/android/i.test(ua)) {
          linkToOpen = androidLink;
        } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
          linkToOpen = iosLink;
        }
      }

      window.open(linkToOpen, '_blank');
    });
  }
});
