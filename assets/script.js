// Variables globales pour le scroll horizontal
let slidesCount = 0;
let currentIndex = 0;
let wheelDeltaAcc = 0;

// Fonction de scroll horizontal
function handleScroll() {
    const horizontalSection = document.getElementById("horizontal-section");
    if (!horizontalSection) return;

    if (window.innerWidth >= 1025) {
        const maxScroll = (slidesCount - 1) * window.innerHeight;
        const scrollTop = window.scrollY;
        const clamped = Math.max(0, Math.min(scrollTop, maxScroll));
        const ratio = clamped / maxScroll;
        const maxTranslate = (slidesCount - 1) * 0.5 * window.innerWidth;
        const translateX = -ratio * maxTranslate;
        horizontalSection.style.transform = `translateX(${translateX}px)`;
    } else {
        horizontalSection.style.transform = "translateX(0)";
    }
}

// Gestionnaire de la molette pour “snap” slide par slide
function handleWheel(event) {
    if (window.innerWidth < 1025) return;
    event.preventDefault();

    const threshold = 100;
    wheelDeltaAcc += event.deltaY;

    if (wheelDeltaAcc > threshold) {
        if (currentIndex < slidesCount - 1) currentIndex++;
        window.scrollTo({ top: currentIndex * window.innerHeight, behavior: "smooth" });
        wheelDeltaAcc = 0;
    } else if (wheelDeltaAcc < -threshold) {
        if (currentIndex > 0) currentIndex--;
        window.scrollTo({ top: currentIndex * window.innerHeight, behavior: "smooth" });
        wheelDeltaAcc = 0;
    }
}

// Réinitialisation au redimensionnement sous 1025px
function handleResize() {
    if (window.innerWidth < 1025) {
        currentIndex = 0;
        wheelDeltaAcc = 0;
        window.scrollTo({ top: 0, behavior: "instant" });
        const horizontalSection = document.getElementById("horizontal-section");
        if (horizontalSection) horizontalSection.style.transform = "translateX(0)";
    }
}

// Au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
    // 1) Initialisation des slides
    slidesCount = document.querySelectorAll(".slide").length;
    document.body.style.height = slidesCount * 100 + "vh";
    document.documentElement.style.setProperty("--slides-count", slidesCount);
    handleScroll();

    // 2) Détection de plateforme pour le bouton “Get the app”
    const btn = document.querySelector('.get-app-btn');
    const iosLink = 'https://apps.apple.com/us/app/sway-find-raves-and-festivals/id6744655264';
    const androidLink = 'https://play.google.com/store/apps/details?id=app.sway.main';
    const defaultLink = iosLink;

    if (btn) {
        btn.addEventListener('click', () => {
            let linkToOpen = defaultLink;
            const ua = navigator.userAgent || '';

            // Si userAgentData existe (Chrome/Edge récent)
            if (navigator.userAgentData && navigator.userAgentData.platform) {
                const plat = navigator.userAgentData.platform;
                if (/Android/i.test(plat)) {
                    linkToOpen = androidLink;
                } else if (/iPhone|iPad|iPod|iOS/i.test(plat)) {
                    linkToOpen = iosLink;
                }
            }
            // Sinon on se rabat sur userAgent string
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

// Écouteurs globaux
window.addEventListener("scroll", handleScroll);
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("resize", handleResize);