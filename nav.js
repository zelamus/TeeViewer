/* ==========================================================================
   TeeViewer shared chrome
   --------------------------------------------------------------------------
   - Applies the saved theme before first paint.
   - Wires the theme toggle and keeps its label in sync.
   - Marks the current page in the primary navigation.
   - Opens and closes the mobile navigation sheet.

   The script is defensive: every lookup may return null and no wiring runs
   when the matching elements are absent.
   ========================================================================== */

(function () {
    "use strict";

    var STORAGE_KEY = "teeviewer-theme";
    var root = document.documentElement;

    // Progressive enhancement: CSS only shows stat skeletons when this is set.
    root.classList.add("js");

    function readStoredTheme() {
        try {
            var value = window.localStorage.getItem(STORAGE_KEY);

            if (value === "dark" || value === "light") {
                return value;
            }
        } catch (error) {
            // localStorage may be blocked on file:// origins.
        }

        return null;
    }

    var storedTheme = readStoredTheme();

    if (storedTheme) {
        root.setAttribute("data-theme", storedTheme);
    }

    var systemLight = null;

    try {
        systemLight = window.matchMedia("(prefers-color-scheme: light)");
    } catch (error) {
        systemLight = null;
    }

    if (!storedTheme) {
        var themeMeta = document.querySelector('meta[name="theme-color"]');

        if (themeMeta) {
            themeMeta.setAttribute("content", systemLight && systemLight.matches ? "#fbfbfc" : "#0a0a0a");
        }
    }

    function currentTheme() {
        var explicit = root.getAttribute("data-theme");

        if (explicit === "dark" || explicit === "light") {
            return explicit;
        }

        return systemLight && systemLight.matches ? "light" : "dark";
    }

    function syncThemeControls(theme) {
        var toggles = document.querySelectorAll("[data-theme-toggle]");
        var next = theme === "light" ? "dark" : "light";
        var label = "Switch to " + next + " theme";

        for (var i = 0; i < toggles.length; i += 1) {
            toggles[i].setAttribute("aria-label", label);
            toggles[i].setAttribute("title", label);
        }

        var meta = document.querySelector('meta[name="theme-color"]');

        if (meta) {
            meta.setAttribute("content", theme === "light" ? "#fbfbfc" : "#0a0a0a");
        }
    }

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);

        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            // Keep the choice for this page when storage is unavailable.
        }

        syncThemeControls(theme);
    }

    function setActiveNav() {
        var path = window.location.pathname;
        var here = path.substring(path.lastIndexOf("/") + 1).toLowerCase();

        if (!here) {
            here = "index.html";
        }

        var links = document.querySelectorAll(".nav-buttons a[href]");

        for (var i = 0; i < links.length; i += 1) {
            var link = links[i];
            var href = link.getAttribute("href") || "";

            link.classList.remove("is-active");
            link.removeAttribute("aria-current");

            if (!href || href.charAt(0) === "#" || /^(https?:|mailto:)/i.test(href)) {
                continue;
            }

            var clean = href.split("#")[0].split("?")[0];
            var target = clean.substring(clean.lastIndexOf("/") + 1).toLowerCase();

            if (target && target === here) {
                link.classList.add("is-active");
                link.setAttribute("aria-current", "page");
            }
        }
    }

    function initTheme() {
        syncThemeControls(currentTheme());

        var toggles = document.querySelectorAll("[data-theme-toggle]");

        for (var i = 0; i < toggles.length; i += 1) {
            toggles[i].addEventListener("click", function () {
                applyTheme(currentTheme() === "light" ? "dark" : "light");
            });
        }

        if (systemLight) {
            var onSystemChange = function () {
                if (!readStoredTheme()) {
                    syncThemeControls(currentTheme());
                }
            };

            if (typeof systemLight.addEventListener === "function") {
                systemLight.addEventListener("change", onSystemChange);
            } else if (typeof systemLight.addListener === "function") {
                systemLight.addListener(onSystemChange);
            }
        }
    }

    function initMenu() {
        var toggle = document.querySelector("[data-menu-toggle]");
        var nav = document.getElementById("site-nav");

        if (!toggle || !nav) {
            return;
        }

        function setOpen(open) {
            nav.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
            document.body.classList.toggle("nav-open", open);
        }

        toggle.addEventListener("click", function () {
            setOpen(!nav.classList.contains("is-open"));
        });

        nav.addEventListener("click", function (event) {
            var target = event.target;

            if (target && typeof target.closest === "function" && target.closest("a")) {
                setOpen(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && nav.classList.contains("is-open")) {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener("click", function (event) {
            if (!nav.classList.contains("is-open")) {
                return;
            }

            if (nav.contains(event.target) || toggle.contains(event.target)) {
                return;
            }

            setOpen(false);
        });

        var desktop = null;

        try {
            desktop = window.matchMedia("(min-width: 769px)");
        } catch (error) {
            desktop = null;
        }

        if (desktop) {
            var onDesktop = function (event) {
                if (event.matches) {
                    setOpen(false);
                }
            };

            if (typeof desktop.addEventListener === "function") {
                desktop.addEventListener("change", onDesktop);
            } else if (typeof desktop.addListener === "function") {
                desktop.addListener(onDesktop);
            }
        }
    }

    function init() {
        setActiveNav();
        initTheme();
        initMenu();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
