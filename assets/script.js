// script.js

// Nombre total de slides
const slidesCount = 5;
// Index de la slide courante
let currentIndex = 0;
// Accumulateur pour la molette
let wheelDeltaAcc = 0;

/**
 * Conversion continue du scroll vertical => translation horizontale
 * (identique à l'exemple précédent)
 */
function handleScroll() {
    const horizontalSection = document.getElementById("horizontal-section");
    if (!horizontalSection) return;

    if (window.innerWidth >= 1025) {
        const maxScroll = (slidesCount - 1) * window.innerHeight;
        const scrollTop = window.scrollY;
        const clamped = Math.max(0, Math.min(scrollTop, maxScroll));
        const ratio = clamped / maxScroll;

        // 4 slides * 50vw => 2 * window.innerWidth
        const maxTranslate = (slidesCount - 1) * 0.5 * window.innerWidth;
        const translateX = -ratio * maxTranslate;

        horizontalSection.style.transform = `translateX(${translateX}px)`;
    } else {
        horizontalSection.style.transform = "translateX(0)";
    }
}

/**
 * Gère le "scroll cranté" à la molette en laptop :
 * - On cumule deltaY dans wheelDeltaAcc
 * - Si on dépasse le seuil, on change de slide
 */
function handleWheel(event) {
    if (window.innerWidth >= 1025) {
        event.preventDefault();
        const threshold = 100; // sensibilité

        wheelDeltaAcc += event.deltaY;

        // Si on dépasse le seuil positif => slide suivante
        if (wheelDeltaAcc > threshold) {
            if (currentIndex < slidesCount - 1) {
                currentIndex++;
            }
            window.scrollTo({
                top: currentIndex * window.innerHeight,
                behavior: "smooth",
            });
            wheelDeltaAcc = 0;
        } // Si on dépasse le seuil négatif => slide précédente
        else if (wheelDeltaAcc < -threshold) {
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
    // Si on quitte le mode laptop, on remet tout à zéro
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

// Listeners
window.addEventListener("scroll", handleScroll);
window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("resize", handleResize);

document.addEventListener("DOMContentLoaded", () => {
    const slides = document.querySelectorAll(".slide");
    const slidesCount = slides.length; // ici 5
    document.body.style.height = slidesCount * 100 + "vh";
    // Initialisation de la translation
    handleScroll();
});
