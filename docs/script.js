// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", function () {
    // Function to load a markdown file and generate its TOC
    function loadMarkdown(mdFile) {
      console.log("Loading markdown file:", mdFile);
      fetch(mdFile)
        .then(response => response.text())
        .then(md => {
          const contentContainer = document.getElementById("content");
          contentContainer.innerHTML = marked.parse(md);
          // Generate a flat TOC from all h2 headings in the content
          const toc = generateFlatTOC(contentContainer);
          console.log("TOC generated:", toc);
          // If no active link is set, select the one corresponding to the loaded file
          if (!activeLink) {
            activeLink = document.querySelector(`#sidebar a[data-md="${mdFile}"]`);
          }
          if (activeLink && toc) {
            insertTOCInMenu(activeLink, toc);
          }
          // Automatically open the parent submenu of the active link
          if (activeLink) {
            const parentMainLi = activeLink.closest("ul.menu > li");
            if (parentMainLi && !parentMainLi.classList.contains("active")) {
              parentMainLi.classList.add("active");
              const arrowIcon = parentMainLi.querySelector(".menu-title .arrow i");
              if (arrowIcon) {
                arrowIcon.classList.remove("fa-chevron-down");
                arrowIcon.classList.add("fa-chevron-up");
              }
            }
          }
        })
        .catch(error => {
          document.getElementById("content").innerHTML = "<p>Error loading content.</p>";
          console.error(error);
        });
    }
  
    // Toggle the sidebar on burger button click
    document.getElementById("toggleSidebar").addEventListener("click", function () {
      const sidebar = document.getElementById("sidebar");
      if (window.innerWidth <= 768) {
        // In mobile mode, toggle the full-screen overlay
        sidebar.classList.toggle("mobile-active");
      } else {
        // In desktop mode, toggle the collapsed state
        sidebar.classList.toggle("collapsed");
      }
    });
  
    // Toggle submenu open/close on menu title click
    document.querySelectorAll("#sidebar .menu-title").forEach(title => {
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
  
    let activeLink = null;
  
    // Handle menu link clicks to load the corresponding markdown file
    document.querySelectorAll("#sidebar a[data-md]").forEach(link => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        activeLink = this;
        // Retrieve the category from the parent menu item
        const categoryElem = this.closest("ul").closest("li").querySelector(".menu-text");
        let category = "";
        if (categoryElem) {
          category = categoryElem.textContent.trim().toLowerCase().replace(/\s+/g, "-");
        }
        // Retrieve the page name from the link text
        const page = this.textContent.trim().toLowerCase().replace(/\s+/g, "-");
        // Build the markdown file path (e.g., "create/create-events.md")
        const mdFile = category + "/" + category + "-" + page + ".md";
        const newUrl = "/docs/" + category + "/" + page;
        history.pushState({ mdFile: mdFile }, "", newUrl);
        loadMarkdown(mdFile);
        // In mobile mode, hide the overlay menu after clicking
        if (window.innerWidth <= 768) {
          document.getElementById("sidebar").classList.remove("mobile-active");
        }
      });
    });
  
    // Handle navigation history (popstate)
    window.addEventListener("popstate", function (event) {
      if (event.state && event.state.mdFile) {
        loadMarkdown(event.state.mdFile);
      } else {
        const pathParts = location.pathname.split("/").filter(Boolean);
        if (pathParts.length === 3 && pathParts[0] === "docs") {
          const mdFile = pathParts[1] + "-" + pathParts[2] + ".md";
          loadMarkdown(mdFile);
        } else {
          document.getElementById("content").innerHTML =
            "<h1>Welcome to the Documentation</h1><p>Select a page from the menu to display its content.</p>";
        }
      }
    });
  
    // Function to generate a flat TOC from all h2 elements in the container
    function generateFlatTOC(container) {
      const headings = Array.from(container.querySelectorAll("h2"));
      console.log("Headings found:", headings);
      if (headings.length === 0) return null;
      const ul = document.createElement("ul");
      ul.className = "toc";
      headings.forEach(heading => {
        if (!heading.id) {
          heading.id = heading.textContent.trim().toLowerCase().replace(/\s+/g, "-");
        }
        const li = document.createElement("li");
        li.className = "h2";
        const a = document.createElement("a");
        a.href = "#" + heading.id;
        a.textContent = heading.textContent;
        a.addEventListener("click", function (e) {
          e.preventDefault();
          document.getElementById(heading.id).scrollIntoView({ behavior: "smooth" });
        });
        li.appendChild(a);
        ul.appendChild(li);
      });
      return ul;
    }
  
    // Function to insert the generated TOC below the active link in the menu
    function insertTOCInMenu(link, toc) {
      // Remove any existing TOC in the same menu section
      const parentLi = link.parentElement;
      const existingTOC = parentLi.parentElement.querySelector(".toc");
      if (existingTOC) {
        existingTOC.remove();
      }
      // Insert the new TOC immediately after the active link
      parentLi.parentElement.insertBefore(toc, parentLi.nextSibling);
    }
  
    // Initial load based on the URL
    (function initialLoad() {
      const pathParts = location.pathname.split("/").filter(Boolean);
      if (pathParts.length === 3 && pathParts[0] === "docs") {
        const mdFile = pathParts[1] + "/" + pathParts[1] + "-" + pathParts[2] + ".md";
        history.replaceState({ mdFile: mdFile }, "", location.pathname);
        loadMarkdown(mdFile);
      }
    })();
  });
  