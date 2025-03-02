document.addEventListener("DOMContentLoaded", function () {
    // Function to load a markdown file and generate its nested TOC
    function loadMarkdown(mdFile) {
        fetch(mdFile)
            .then((response) => response.text())
            .then((md) => {
                const contentContainer = document.getElementById("content");
                contentContainer.innerHTML = marked.parse(md);
                const toc = generateNestedTOC(contentContainer);
                console.log("TOC generated:", toc);
                // Insert the TOC in the menu
                insertTOCInMenu(activeLink, toc);
                if (toc) {
                    addToggleArrows(toc);
                }
            })
            .catch((error) => {
                document.getElementById("content").innerHTML =
                    "<p>Error loading content.</p>";
                console.error(error);
            });
    }

    // Toggle the main sidebar
    document.getElementById("toggleSidebar").addEventListener(
        "click",
        function () {
            document.getElementById("sidebar").classList.toggle("collapsed");
        },
    );

    // Handle open/close of main submenus ("Create", "Manage & Edit")
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

    // Variable to keep track of the active link
    let activeLink = null;

    // Handle clicks on menu links to load markdown and update URL
    document.querySelectorAll("#sidebar a[data-md]").forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            activeLink = this;
            const mdFile = this.getAttribute("data-md");

            // Determine category from the parent menu (e.g., "create" or "manage-edit")
            const categoryElem = this.closest("ul").closest("li").querySelector(
                ".menu-text",
            );
            let category = "";
            if (categoryElem) {
                category = categoryElem.textContent.trim().toLowerCase()
                    .replace(/\s+/g, "-");
            }
            // Get the page from the link text (e.g., "events")
            const page = this.textContent.trim().toLowerCase().replace(
                /\s+/g,
                "-",
            );

            // Build the new URL including the "docs" prefix
            const newUrl = "/docs/" + category + "/" + page;

            // Update the URL without reloading the page
            history.pushState({ mdFile: mdFile }, "", newUrl);
            loadMarkdown(mdFile);
        });
    });

    // Handle popstate events (back/forward navigation)
    window.addEventListener("popstate", function (event) {
        if (event.state && event.state.mdFile) {
            loadMarkdown(event.state.mdFile);
        } else {
            // Deduce the markdown file from the URL
            const pathParts = location.pathname.split("/").filter(Boolean);
            if (pathParts.length === 3 && pathParts[0] === "docs") {
                const mdFile = pathParts[1] + "-" + pathParts[2] + ".md";
                loadMarkdown(mdFile);
            } else {
                // Default content if URL doesn't match expected pattern
                document.getElementById("content").innerHTML =
                    "<h1>Welcome to the Documentation</h1><p>Select a page from the menu to view its content.</p>";
            }
        }
    });

    // Function to generate a nested TOC from headings (h2, h3, h4)
    function generateNestedTOC(container) {
        const headings = Array.from(container.querySelectorAll("h2, h3, h4"));
        console.log("Headings found:", headings);
        if (headings.length === 0) return null;

        const rootUl = document.createElement("ul");
        rootUl.className = "toc";

        let currentLevel = 2; // Consider h2 as base level
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

            if (level > currentLevel) {
                const lastLi = currentList.lastElementChild;
                if (lastLi) {
                    const newUl = document.createElement("ul");
                    newUl.style.display = "none"; // Hidden by default
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

    // Function to add toggle arrows to each <li> in the TOC that has a submenu
    function addToggleArrows(toc) {
        const liItems = toc.querySelectorAll("li");
        liItems.forEach((li) => {
            const subUl = li.querySelector("ul");
            if (subUl && !li.querySelector(".toc-arrow")) {
                const arrow = document.createElement("span");
                arrow.className = "toc-arrow";
                arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
                li.insertBefore(arrow, li.firstChild);
                subUl.style.display = "none";
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

    // Function to insert the TOC into the menu, below the clicked link
    function insertTOCInMenu(link, toc) {
        const li = link.parentElement;
        const existingTOC = li.parentElement.querySelector(".toc");
        if (existingTOC) {
            existingTOC.remove();
        }
        if (toc) {
            li.parentElement.insertBefore(toc, li.nextSibling);
        }
    }

    // Initial load: if the URL contains /docs/..., attempt to load the corresponding markdown
    (function initialLoad() {
        const pathParts = location.pathname.split("/").filter(Boolean);
        if (pathParts.length === 3 && pathParts[0] === "docs") {
            const mdFile = pathParts[1] + "-" + pathParts[2] + ".md";
            history.replaceState({ mdFile: mdFile }, "", location.pathname);
            loadMarkdown(mdFile);
        }
    })();
});
