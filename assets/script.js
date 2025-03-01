// Variable globale
let slidesCount = 0;
let currentIndex = 0;
let wheelDeltaAcc = 0;

function handleScroll() {
    const horizontalSection = document.getElementById("horizontal-section");
    if (!horizontalSection) return;

    if (window.innerWidth >= 1025) {
        const maxScroll = (slidesCount - 1) * window.innerHeight;
        const scrollTop = window.scrollY;
        const clamped = Math.max(0, Math.min(scrollTop, maxScroll));
        const ratio = clamped / maxScroll;

        // Chaque slide fait 50vw, donc (slidesCount - 1)*0.5*window.innerWidth
        const maxTranslate = (slidesCount - 1) * 0.5 * window.innerWidth;
        const translateX = -ratio * maxTranslate;

        horizontalSection.style.transform = `translateX(${translateX}px)`;
    } else {
        horizontalSection.style.transform = "translateX(0)";
    }
}

function handleWheel(event) {
    if (window.innerWidth >= 1025) {
        event.preventDefault();
        const threshold = 100; // sensibilité

        wheelDeltaAcc += event.deltaY;

        if (wheelDeltaAcc > threshold) {
            if (currentIndex < slidesCount - 1) {
                currentIndex++;
            }
            window.scrollTo({
                top: currentIndex * window.innerHeight,
                behavior: "smooth",
            });
            wheelDeltaAcc = 0;
        } else if (wheelDeltaAcc < -threshold) {
            if (currentIndex > 0) {
                currentIndex--;
            }
            window.scrollTo({
                top: currentIndex * window.innerHeight,
                behavior: "smooth",
            });
            wheelDeltaAcc = 0;
        }
    }
}

function handleResize() {
    if (window.innerWidth < 1025) {
        currentIndex = 0;
        wheelDeltaAcc = 0;
        window.scrollTo({ top: 0, behavior: "instant" });
        const horizontalSection = document.getElementById("horizontal-section");
        if (horizontalSection) {
            horizontalSection.style.transform = "translateX(0)";
        }
    }
}

window.addEventListener("scroll", handleScroll);
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("resize", handleResize);

document.addEventListener("DOMContentLoaded", () => {
    // Définir slidesCount dynamiquement
    slidesCount = document.querySelectorAll(".slide").length;
    // Ajuster la hauteur du body en fonction du nombre de slides
    document.body.style.height = slidesCount * 100 + "vh";
    // Mettre à jour la variable CSS pour la largeur du horizontal-section
    document.documentElement.style.setProperty("--slides-count", slidesCount);
    // Initialisation de la translation
    handleScroll();
});
