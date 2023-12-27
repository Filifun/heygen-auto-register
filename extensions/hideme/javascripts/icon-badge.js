let badgeError = chrome.i18n.getMessage("badge_error");
let badgeOff = chrome.i18n.getMessage("badge_off");

function setIconAndBadge() {

    let offIconPath = {
        path: "images/icon16_off.png",
    };

    let onIconPath = {
        path: "images/icon16.png",
    };

    if (localStorage._error_state != "false" &&
        localStorage._error_state != undefined &&
        localStorage._error_state != "undefined" &&
        localStorage._error_state != "WEBRTC_NOT_CONTROLLABLE") {
        var details = {
            text: badgeError
        }
        
        chrome.browserAction.setBadgeText(details);
        chrome.browserAction.setBadgeBackgroundColor({ color: "#f00" });
        var icon = offIconPath;
        chrome.browserAction.setIcon(icon);
        return;
    }


    if (localStorage.connected === "false" ||
        localStorage.connected === undefined) {
        var details = {
            text: badgeOff
        }
        chrome.browserAction.setBadgeText(details);
        chrome.browserAction.setBadgeBackgroundColor({ color: "#0eaed2" });
        var icon = offIconPath;
        chrome.browserAction.setIcon(icon);
    } else if (localStorage.connected === "true") {
        var details = {
            text: ""
        }
        chrome.browserAction.setBadgeText(details);
        var icon = onIconPath;
        chrome.browserAction.setIcon(icon);
    }
}