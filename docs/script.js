document.addEventListener("DOMContentLoaded", function () {
    // Basculement de la barre latérale principale
    document.getElementById("toggleSidebar").addEventListener(
        "click",
        function () {
            document.getElementById("sidebar").classList.toggle("collapsed");
        },
    );

    // Gestion de l'ouverture/fermeture des sous-menus principaux ("Create", "Manage & Edit")
    document.querySelectorAll("#sidebar .menu-title").forEach(function (title) {
        title.addEventListener("click", function () {
            const parentLi = this.parentElement;
            parentLi.classList.toggle("active");
            const arrowIcon = this.querySelector(".arrow i");
            if (parentLi.classList.contains("active")) {
                arrowIcon.classList.remove("fa-chevron-down");
                arrowIcon.classList.add("fa-chevron-up");
            } else {
                arrowIcon.classList.remove("fa-chevron-up");
                arrowIcon.classList.add("fa-chevron-down");
            }
        });
    });

    // Chargement du contenu markdown et génération du TOC imbriqué
    document.querySelectorAll("#sidebar a[data-md]").forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const mdFile = this.getAttribute("data-md");
            fetch(mdFile)
                .then((response) => response.text())
                .then((md) => {
                    const contentContainer = document.getElementById("content");
                    contentContainer.innerHTML = marked.parse(md);
                    const toc = generateNestedTOC(contentContainer);
                    console.log("TOC generated:", toc);
                    insertTOCInMenu(this, toc);
                    if (toc) {
                        addToggleArrows(toc);
                    }
                })
                .catch((error) => {
                    document.getElementById("content").innerHTML =
                        "<p>Erreur de chargement du contenu.</p>";
                    console.error(error);
                });
        });
    });

    // Après avoir généré le TOC, ajoute une flèche sur chaque li qui a un sous-menu
    function addToggleArrows(toc) {
        const itemsWithSub = toc.querySelectorAll("li > ul");
        itemsWithSub.forEach(function (subUl) {
            const li = subUl.parentElement;
            // Si le li n'a pas déjà une flèche, on l'ajoute
            if (!li.querySelector(".toc-arrow")) {
                const arrow = document.createElement("span");
                arrow.className = "toc-arrow";
                arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                // Insère la flèche au début du li
                li.insertBefore(arrow, li.firstChild);
                // Masque par défaut le sous-menu (si ce n'est pas déjà fait)
                subUl.style.display = "none";
                // Gestion du clic sur la flèche
                arrow.addEventListener("click", function (e) {
                    e.stopPropagation();
                    if (
                        subUl.style.display === "none" ||
                        subUl.style.display === ""
                    ) {
                        subUl.style.display = "block";
                        arrow.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    } else {
                        subUl.style.display = "none";
                        arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    }
                });
            }
        });
    }

    // Fonction générant un TOC imbriqué à partir des titres (h2, h3, h4)
    function generateNestedTOC(container) {
        // Récupère tous les titres dans l'ordre
        const headings = Array.from(container.querySelectorAll("h2, h3, h4"));
        console.log("Headings found:", headings);
        if (headings.length === 0) return null;

        const rootUl = document.createElement("ul");
        rootUl.className = "toc";

        // On utilise une pile pour gérer la hiérarchie des niveaux
        let currentLevel = 2; // h2 est le niveau de base
        let currentList = rootUl;
        const listStack = [rootUl];

        headings.forEach((heading) => {
            const level = parseInt(heading.tagName.charAt(1));
            if (!heading.id) {
                heading.id = heading.textContent.trim().toLowerCase().replace(
                    /\s+/g,
                    "-",
                );
            }

            const li = document.createElement("li");
            li.className = "h" + level;

            const a = document.createElement("a");
            a.href = "#" + heading.id;
            a.textContent = heading.textContent;
            a.addEventListener("click", function (e) {
                e.preventDefault();
                document.getElementById(heading.id).scrollIntoView({
                    behavior: "smooth",
                });
            });

            li.appendChild(a);

            // Si le niveau augmente, on crée un nouveau sous-menu
            if (level > currentLevel) {
                const newUl = document.createElement("ul");
                newUl.style.display = "none"; // Masqué par défaut
                const lastLi = currentList.lastElementChild;
                if (lastLi) {
                    lastLi.appendChild(newUl);
                    currentList = newUl;
                    listStack.push(newUl);
                    currentLevel = level;
                }
            } else if (level < currentLevel) {
                while (currentLevel > level && listStack.length > 1) {
                    listStack.pop();
                    currentLevel--;
                }
                currentList = listStack[listStack.length - 1];
            }
            currentList.appendChild(li);
        });
        return rootUl;
    }

    function addToggleArrows(toc) {
        // Parcourt tous les <li> du TOC
        const liItems = toc.querySelectorAll("li");
        liItems.forEach((li) => {
            const subUl = li.querySelector("ul");
            if (subUl && !li.querySelector(".toc-arrow")) {
                const arrow = document.createElement("span");
                arrow.className = "toc-arrow";
                arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                // Insère la flèche au début du li
                li.insertBefore(arrow, li.firstChild);
                // S'assurer que le sous-menu est masqué
                subUl.style.display = "none";
                // Gérer le clic sur la flèche
                arrow.addEventListener("click", function (e) {
                    e.stopPropagation();
                    if (subUl.style.display === "none") {
                        subUl.style.display = "block";
                        arrow.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    } else {
                        subUl.style.display = "none";
                        arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    }
                });
            }
        });
    }

    // Insère le TOC dans le menu, en dessous du lien cliqué
    function insertTOCInMenu(link, toc) {
        // Récupère le <li> parent du lien
        const li = link.parentElement;
        // Supprime un TOC existant dans le même conteneur, s'il existe
        const existingTOC = li.parentElement.querySelector(".toc");
        if (existingTOC) {
            existingTOC.remove();
        }
        if (toc) {
            // Insère le TOC juste après le <li> dans le <ul>
            li.parentElement.insertBefore(toc, li.nextSibling);
        }
    }
});
