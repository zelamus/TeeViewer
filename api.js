/* TeeViewer API helpers.
   Loaded by players.html and any page that needs getStatus or searchPlayer.
   Reads window.COUNTRY_CODES from country_codes.js and window.fetchJSON from
   data.js. Every DOM lookup is optional, so a missing element never throws. */

(function () {
    "use strict";

    var myTee = null;

    function byId(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        var node = byId(id);

        if (node) {
            node.textContent = value;
        }
    }

    function formatTimestamp(timestamp) {
        if (!timestamp) {
            return "N/A";
        }

        try {
            var date = new Date(timestamp);

            if (isNaN(date.getTime())) {
                return "Invalid Date";
            }

            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        } catch (error) {
            return "Invalid Date";
        }
    }

    function countryLabel(code) {
        var table = window.COUNTRY_CODES || {};
        var name = table[code];

        if (!name) {
            return code === undefined || code === null
                ? "Unknown"
                : "Unknown (Code: " + code + ")";
        }

        if (name === "default") {
            return "Default";
        }

        if (/^[A-Za-z]{2}$/.test(name)) {
            try {
                return new Intl.DisplayNames(["en"], { type: "region" }).of(name.toUpperCase());
            } catch (error) {
                return name;
            }
        }

        return name;
    }

    function clearPlayerFields() {
        setText("name", "");
        setText("playtime", "");
        setText("joindate", "");
        setText("country", "");
        setText("clan", "");
        setText("points", "");
        setText("lastseen", "");
    }

    function teardownTee() {
        if (myTee) {
            try {
                myTee.api.functions.unbindContainer();
            } catch (error) {
                // The renderer may never have bound a container.
            }

            myTee = null;
        }

        var container = document.querySelector(".teeassembler-tee");

        if (container) {
            container.replaceChildren();
        }
    }

    window.navigateToPage = function (page) {
        window.location.href = page;
    };

    window.getStatus = async function () {
        if (typeof window.fetchJSON !== "function") {
            return;
        }

        var targets = [
            { id: "onlineplayercount", key: "numPlayers" },
            { id: "numServers", key: "numServers" },
            { id: "numClans", key: "numClans" },
            { id: "numMaps", key: "numMaps" },
            { id: "numGameTypes", key: "numGameTypes" },
            { id: "numVersions", key: "numVersions" }
        ];

        try {
            var data = await window.fetchJSON("https://api.status.tw/stats");

            targets.forEach(function (target) {
                var node = byId(target.id);

                if (!node) {
                    return;
                }

                var value = Number(data && data[target.key]);

                node.textContent = Number.isFinite(value)
                    ? value.toLocaleString("en-US")
                    : "—";
            });
        } catch (error) {
            targets.forEach(function (target) {
                var node = byId(target.id);

                if (node) {
                    node.textContent = "—";
                }
            });
        }
    };

    window.searchPlayer = async function () {
        var playerNameInput = byId("playerSearch");
        var playerInfoDiv = byId("playerInfo");
        var playerName = playerNameInput ? playerNameInput.value.trim() : "";

        if (playerInfoDiv) {
            playerInfoDiv.textContent = "Loading player data...";
        }

        clearPlayerFields();
        teardownTee();

        if (!playerName) {
            if (playerInfoDiv) {
                playerInfoDiv.textContent = "Please enter a player name.";
            }

            return;
        }

        try {
            var response = await fetch(
                "https://ddstats.tw/player/json?player=" + encodeURIComponent(playerName)
            );

            if (!response.ok) {
                var errorText = await response.text();

                if (errorText.indexOf("player not found") !== -1) {
                    if (playerInfoDiv) {
                        playerInfoDiv.textContent = "";
                    }

                    setText("name", 'Player "' + playerName + '" not found.');
                    return;
                }

                throw new Error(
                    "Could not fetch resource: " + response.status + " " + response.statusText
                );
            }

            var data = await response.json();
            var general = data && data.general_activity ? data.general_activity : {};
            var profile = data && data.profile ? data.profile : {};
            var recent = data && data.recent_player_info && data.recent_player_info[0]
                ? data.recent_player_info[0]
                : {};

            var playtimeSeconds = Number(general.total_seconds_played);
            var playtimeHours = Number.isFinite(playtimeSeconds)
                ? Math.trunc(playtimeSeconds / 3600)
                : null;

            if (playerInfoDiv) {
                playerInfoDiv.textContent = "";
            }

            setText("playtime", playtimeHours === null ? "—" : playtimeHours + " Hours");
            setText("joindate", formatTimestamp(general.start_of_playtime));
            setText("country", countryLabel(recent.country));
            setText("clan", profile.clan || "N/A");
            setText("points", profile.points === undefined ? "—" : profile.points);
            setText("lastseen", formatTimestamp(recent.last_seen));
            setText("name", profile.name || playerName);

            var flag = byId("CountryFlag");
            var table = window.COUNTRY_CODES || {};
            var flagCode = table[recent.country];

            if (flag && flagCode && flagCode !== "default") {
                flag.src = "/TeeViewer/countryflags/" + flagCode + ".png";
            }

            var container = document.querySelector(".teeassembler-tee");

            if (container && typeof TeeAssembler !== "undefined" && TeeAssembler.Tee) {
                try {
                    myTee = new TeeAssembler.Tee({
                        container: container,
                        imageLink: "https://ddstats.tw/skins/" + (recent.skin_name || "default") + ".png",
                        bodyColor: recent.skin_color_body !== null && recent.skin_color_body !== undefined
                            ? String(recent.skin_color_body)
                            : "",
                        feetColor: recent.skin_color_feet !== null && recent.skin_color_feet !== undefined
                            ? String(recent.skin_color_feet)
                            : "",
                        colorFormat: "code"
                    });

                    myTee.api.functions.lookAtCursor();
                } catch (error) {
                    container.textContent = "Tee preview not available.";
                }
            } else if (container) {
                container.textContent = "Tee preview not available.";
            }

            if (playerNameInput) {
                playerNameInput.value = "";
            }
        } catch (error) {
            if (playerInfoDiv) {
                playerInfoDiv.textContent =
                    "An error occurred while fetching player data. Please try again.";
            }

            clearPlayerFields();
            teardownTee();
        }
    };

    function init() {
        var playerNameInput = byId("playerSearch");

        if (playerNameInput) {
            playerNameInput.addEventListener("keypress", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    window.searchPlayer();
                }
            });
        }

        if (typeof window.fetchJSON === "function") {
            window.getStatus();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
