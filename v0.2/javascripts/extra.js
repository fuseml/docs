// Show warning banner when displaying old content versions
window.addEventListener("DOMContentLoaded", function() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/docs/versions.json");
    xhr.onload = function() {
        var versions = JSON.parse(this.responseText);
        latest_version = ""
        for (id in versions) {
            if (versions[id]["aliases"].length > 0 && versions[id]["aliases"].includes("latest")) {
                latest_version = "/" + versions[id].version + "/";
            }
        }
        if(window.location.pathname.includes("/dev/")) {
            document.querySelector("div[data-md-component=announce]").innerHTML = "<div id='announce-msg'>You are viewing the FuseML development documentation version. You should <a href='/docs/latest/'>use the latest stable documentation</a> version instead.</div>";
        }
        else if (!window.location.pathname.includes("/latest/") && (latest_version.length > 0 && !window.location.pathname.includes(latest_version))) {
            document.querySelector("div[data-md-component=announce]").innerHTML = "<div id='announce-msg'>You are not viewing the documentation for the latest stable FuseML version. You should <a href='/docs/latest/'>use the latest stable documentation</a> version instead.</div>";
        }
    };
    xhr.send();
});