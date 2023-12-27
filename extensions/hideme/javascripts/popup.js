/*
 * main script loaded with popup.html
 */


/*
 * Functionality for controlling the behaviour of control elements,
 * and view of the extension.
 */





let Popup = {};
Popup.enableSocksToggleID = "#cmn-toggle-3";
Popup.automaticFallbackToggleID = "#cmn-toggle-5";
Popup.notControllableAlert = ".not_controllable_alert";
Popup.disableProxyMesssage = chrome.i18n.getMessage("disable_proxy_message");
Popup.disableSOCKSMessage = chrome.i18n.getMessage("disable_socks_message");
Popup.disableAutomaticFallbackMessage = chrome.i18n.getMessage("disable_automatic_fallback_message");
Popup.disconnectedText = chrome.i18n.getMessage("status_disconnected");
Popup.connectedText = chrome.i18n.getMessage("status_connected");


document.addEventListener('DOMContentLoaded', function() {
    /* Clear the error state to blank state since there are no controls to 
    to remove the error message if extension was in proxy uncontrollable state. User needs to resolve the problem and restart the extension to reset the 
    error state. */
    Utils.clearErrorState();
    Localization.resetI18n(Localization.localizeHtmlPage);
    Proxy.checkProxyState();
    Privacy.checkWebRTCState();
    Popup.showError();
    Popup.monitorProxyToggleSwitch();
    Popup.monitorWebRTCSetting();
    Popup.monitorEnableSocks();
    Popup.monitorAlwaysEnableProxy();
    // Popup.monitorAutomaticFallback();
    Popup.monitorSettingsView();
    Popup.monitorLanguageSelect();
    Popup.monitorLinkClicks();
    Popup.monitorErrorButtons();
    Servers.listServers();
    Popup.monitorServerSelect();
    Popup.addFirefoxScrolling();
    Popup.restoreProxyConnectToggle();
});





Popup.restoreExtensionState = function() {
    this.restoreProxyConnectToggle();
    this.restoreDisableWebRTCToggle();
    this.restoreEnableSocksToggle();
    this.restoreProxyAlwaysEnabledToggle();
    this.restoreAutoFallbackToggle();
    Popup.showSelectedServer();
    setIconAndBadge();
};




Popup.restoreProxyConnectToggle = function() {
    if (Proxy.proxyConnected()) {
        $(".main #cmn-toggle-1").prop("checked", true);
        this.indicateConnection();
    } else {
        $(".main #cmn-toggle-1").prop("checked", false);
        this.indicateDisconnect();
    }
}


Popup.restoreDisableWebRTCToggle = function() {
    if (Privacy.webRTCDisabled()) {
        $("#cmn-toggle-2").prop("checked", true);
    } else {
        $("#cmn-toggle-2").prop("checked", false);
    }
}


Popup.restoreProxyAlwaysEnabledToggle = function() {
    if (Proxy.proxyAlwaysEnabled()) {
        // $("#cmn-toggle-1").prop("disabled", true);
        $("#cmn-toggle-4").prop("checked", true);
        Popup.disableToggles("#cmn-toggle-4");
    } else {
        $("#cmn-toggle-4").prop("checked", false);
        if (Proxy.proxyConnected()) {

            Popup.disableToggles("#cmn-toggle-1");
        }
    }
}


Popup.restoreEnableSocksToggle = function() {
    if (Proxy.hidemeEnabled()) {
        $("#cmn-toggle-3").prop("checked", true);
        this.disableSelectServer(Popup.disableSOCKSMessage);
        Popup.disableSingleToggle(Popup.automaticFallbackToggleID, Popup.disableSOCKSMessage);
    } else {
        $("#cmn-toggle-3").prop("checked", false);
        this.enableSelectServer();
    }
}


Popup.restoreAutoFallbackToggle = function() {
    if (Proxy.autoFallbackIsSet()) {
        $("#cmn-toggle-5").prop("checked", true);
        Popup.disableSingleToggle(Popup.enableSocksToggleID, Popup.disableAutomaticFallbackMessage);
    } else {
        $("#cmn-toggle-5").prop("checked", false);
    }
}


Popup.showSelectedServer = function() {
    let selectedProxyServer = this.getSelectedServer();
    if (selectedProxyServer) {
        let selectedServerId = Servers.serverNameToIdentifier(selectedProxyServer.name);
        let src = Servers.flagSrc(selectedServerId);
        $(".selected_server .server_name").text(selectedProxyServer.name);
        $(".selected_server .server_flag img").attr("src", src);
    }
}


Popup.getSelectedServer = function() {
    if (localStorage._selected_server && localStorage._selected_server !== 'undefined'){
        return JSON.parse(localStorage._selected_server);
    }
}


Popup.monitorProxyToggleSwitch = function() {
    $(".main #cmn-toggle-1").change(function() {
        if (this.checked) {
            Proxy.updateSelectedProxyServer();
            Popup.indicateConnection();
            Proxy.startSelectedProxy();
            setIconAndBadge();
            Popup.disableToggles("#cmn-toggle-1");
        } else {
            Proxy.stopProxy();
            setIconAndBadge();
            Popup.indicateDisconnect();
            Popup.enableToggles();
        }
    });
}


Popup.monitorWebRTCSetting = function() {
    $("#cmn-toggle-2").change(function() {
        if (this.checked) {
            Privacy.disableWebRTC();
        } else {
            Privacy.enableWebRTC();
        }
    });
}


Popup.monitorSettingsView = function() {
    $("#settings_view").click(function() {
        Popup.showSettings();
    });

    $(".settings .content .glyphicon-menu-left").click(function() {
        if (Proxy.proxyAlwaysEnabled()) {
            Proxy.startSelectedProxy();
        }
        Popup.showError();
        Popup.hideSettings();
    })
}

Popup.monitorLanguageSelect = function() {
    Popup.addLanguageSettingsViewListener();
    Popup.addBackToSettingsListener();
    Popup.addLanguageSelectListener();
}

Popup.addLanguageSettingsViewListener = function() {
    $("#language_settings_view").click(function() {
        Popup.showLanguageSettings();
    });
}

Popup.addBackToSettingsListener = function() {
    $(".language_settings .content .glyphicon-menu-left").click(function() {
        Popup.hideLanguageSettings();
    })
}


Popup.addLanguageSelectListener = function() {
    $(".language_settings .content").click(function() {
        let locale = $(this).find(".key").attr("value"); // extracts locale info from clicked element
        chrome.i18n._resetL10nData();
        Localization.setLocale(locale);
        Localization.localizeHtmlPage();
        Popup.hideLanguageSettings();
    });
}




Popup.monitorEnableSocks = function() {
    $(Popup.enableSocksToggleID).change(function() {
        if (Proxy.autoFallbackIsSet()) {
            this.checked = false;
            return;
        }

        if (this.checked) {
            Proxy.enableHidemeProxy();
            Popup.disableSingleToggle(Popup.automaticFallbackToggleID, Popup.disableSOCKSMessage);
        } else {
            Proxy.disableHidemeProxy();
            Popup.enableSingleToggle(Popup.automaticFallbackToggleID);
        }
    });
}


Popup.monitorAlwaysEnableProxy = function() {
    $("#cmn-toggle-4").change(function() {
        if (this.checked) {
            /* Disable Proxy on/off switch */
            $("#cmn-toggle-1").prop("disabled", true);
            Proxy.setAlwaysEnableProxy();
            Popup.disableToggles("#cmn-toggle-4");
        } else {
            $("#cmn-toggle-1").prop("disabled", false);
            Proxy.unsetAlwaysEnableProxy();
            Popup.enableToggles();
        }
        Popup.restoreExtensionState();
    });
}


Popup.monitorAutomaticFallback = function() {
    $(Popup.automaticFallbackToggleID).change(function() {
        if (Proxy.hidemeEnabled()) {
            this.checked = false;
            return;
        }

        if (this.checked) {
            /* Disable Proxy on/off switch */
            Proxy.enableAutomaticFallback();
            Popup.disableSingleToggle(Popup.enableSocksToggleID, Popup.disableAutomaticFallbackMessage);
        } else {
            Proxy.disableAutomaticFallback();
            Popup.enableSingleToggle(Popup.enableSocksToggleID);
        }
    });
}


Popup.monitorServerSelect = function() {
    Popup.addServerSelectListener();
    Popup.addServerListElementListener();
    Popup.addBackToMainListener();
}


Popup.addServerSelectListener = function(argument) {
    $("#row_select_server").click(function() {
        if (Proxy.proxyConnected() || Proxy.hidemeEnabled())
            return;
        Popup.showServerList();
    });
}


Popup.addServerListElementListener = function() {
    $(".servers_list li").click(function() {
        var serverName = $(this).attr("name");
        Utils.clearErrorState();
        Proxy.setSelectedServer(serverName);
        Popup.showSelectedServer();
        Popup.hideServerList();
        Proxy.startProxyIfConnected();
        Popup.showError()
    });
}


Popup.addBackToMainListener = function() {
    $(".servers_list .location .glyphicon-menu-left").click(function() {
        Popup.hideServerList();
    })
}


Popup.showServerList = function() {
    Popup.showView(".servers_list");
}


Popup.hideServerList = function() {
    Popup.hideView(".servers_list");
}


Popup.showSettings = function() {
    Popup.showView(".settings");
}


Popup.hideSettings = function() {
    Popup.hideView(".settings");
}

Popup.showLanguageSettings = function() {
    Popup.showViewWithPrev(".language_settings", ".settings")
}

Popup.hideLanguageSettings = function() {
    Popup.hideViewWithPrev(".language_settings", ".settings")
}

Popup.animationDuration = 100;
Popup.dialogContainerSelectors = [".servers_list", ".settings"];


Popup.showView = function(container_selector) {
    Popup.showViewWithPrev(container_selector, ".main")
}

Popup.showViewWithPrev = function(container_selector, prev_selector) {
    $(container_selector).css("height", "100%");
    $(prev_selector).css("left", "-258px");
    $(container_selector).css("left", "0px");
}

Popup.hideView = function(container_selector) {
    Popup.hideViewWithPrev(container_selector, ".main");
}

Popup.hideViewWithPrev = function(container_selector, prev_selector) {
    $(prev_selector).css("left", "0px");
    $(container_selector).css("left", "258px");
    setTimeout(function() {
        $(container_selector).css("height", "0%");
    }, 100);
}

Popup.monitorLinkClicks = function() {
    $("a").click(function(e) {
        var location = $(this).attr('href');
        chrome.tabs.create({ active: true, url: location });
    })
}


Popup.indicateConnection = function() {
    $(".connection_status").removeClass("disconnected").addClass("connected");
    $(".connection_status .indicator").html(Popup.connectedText);
}


Popup.indicateDisconnect = function() {
    $(".connection_status").removeClass("connected").addClass("disconnected");
    $(".connection_status .indicator").html(Popup.disconnectedText);
}


// Shows error if any, clear the popup from error reports otherwise.
Popup.showError = function() {
    Popup.restoreExtensionState();
    if (Popup.showAndReportNotControllableError()) {
        return;
    }
    Popup.showProxyOrWebRTCError();
    Popup.noErrorCleanup();
}

// If extension is in not controllable state (either proxy or webrtc),
// shows not controllable error and indicates that error occured by returning 
// true. Otherwise indicates that no not controllable error occured by returning 
// false. 
Popup.showAndReportNotControllableError = function() {
    /* This error condition is checked synchronously upon the loading 
       of  popup.html */
    if (Proxy.inProxyNotControllableErrorState()) {
        /* show  proxy not controllable error view */
        Popup.showNotControllable();
        return true;
    }

    if (Privacy.inWebRTCNotControllableErrorState()) {
        $(Popup.notControllableAlert).show();
        return true;
    }

    return false;
}

// If extension is in proxy_error or webrtc_error, indicates this 
// in proxy connect toggle (main toggle).
Popup.showProxyOrWebRTCError = function() {
    /* This error condition is set  asynchronously. */
    if (Proxy.inProxyErrorState() || Privacy.inWebRTCErrorState()) {
        // Popup.enableToggles()
        Popup.addErrorStateToProxyToggle();
    }
}


// Clear the popup from error reporting if extension is not in error state
Popup.noErrorCleanup = function() {
    if (Utils.noError()) {
        Popup.removeErrorStateFromProxyToggle();
        Popup.hideNotControllable();
    }
}

Popup.addErrorStateToProxyToggle = function() {
    $("label.proxy_toggle").addClass("error");
    $("label.proxy_toggle").parent().attr("data-tooltip",
        localStorage._error_message).addClass("tooltip-bottom tooltip-wide");
}


Popup.removeErrorStateFromProxyToggle = function() {
    $("label.proxy_toggle").removeClass("error");
    $("label.proxy_toggle").parent().removeAttr("data-tooltip").
    removeClass("tooltip-wide tooltip-bottom");

    if (Proxy.proxyAlwaysEnabled()) {
        $("label.proxy_toggle").parent().attr("data-tooltip", 'Disable Proxy to access this setting').addClass("tooltip-bottom");
    }
}


Popup.showNotControllable = function() {
    $(".main .not_controllable .error_message").text(localStorage._error_message);
    $(".main .content").hide();
    $(".main .not_controllable").show();
}

Popup.hideNotControllable = function() {
    /* Hides not controllable view if user fixes the error */
    if ($(".main .not_controllable").css('display') === 'block') {
        $(".main .content").show();
        $(".main .not_controllable").hide();
    }
}


Popup.monitorErrorButtons = function() {
    $(".extension_error .close_error").click(function() {
        $(".extension_error").hide();
        Popup.restoreExtensionState();
    });
}



// Number of toggles in our extension popup window
Popup.toggleCount = 5;
/* Iterates over all the toggle switches and disables them, except the one we indicate to skip. */
Popup.disableToggles = function(toggleToSkip) {
    Popup.disableSelectServer(Popup.disableProxyMesssage);
    let idTmpl = "#cmn-toggle-";
    for (let i = 1; i <= Popup.toggleCount; i++) {
        let id = idTmpl + i;
        if (id != toggleToSkip) {
            Popup.disableSingleToggle(id, Popup.disableProxyMesssage);
        }
    }
}

Popup.disableSingleToggle = function(id, message) {
    $(id).prop("disabled", true);
    $(id).parent().attr("data-tooltip", message)
        .addClass("tooltip-bottom");
    $(id + " + label").addClass("disabled");
}


Popup.enableSingleToggle = function(id) {
    $(id).prop("disabled", false);
    $(id).parent().removeAttr("data-tooltip").
    removeClass("tooltip-bottom");
    $(id + " + label").removeClass("disabled");
}

Popup.disableSelectServer = function(message) {
    $("#row_select_server").addClass("disabled").
    attr('data-tooltip', message);
}

Popup.enableSelectServer = function() {
    $("#row_select_server").removeClass("disabled").removeAttr('data-tooltip');
}


Popup.enableToggles = function() {
    if (Proxy.hidemeDisabled()) {
        Popup.enableSelectServer();
    }

    let idTmpl = "#cmn-toggle-";
    for (let i = 1; i <= Popup.toggleCount; i++) {
        let id = idTmpl + i;
        Popup.enableSingleToggle(id);
    }
}


Popup.addFirefoxScrolling = function() {
    if (!Utils.isChrome()) {
        $('.main, .settings, .servers_list, .language_settings').bind('mousewheel', function(event) {
            event.preventDefault();
            var scrollTop = this.scrollTop;
            this.scrollTop = (scrollTop + ((event.deltaY * event.deltaFactor) * -1));
            //console.log(event.deltaY, event.deltaFactor, event.originalEvent.deltaMode, event.originalEvent.wheelDelta);
        });
    }
}

let port = chrome.runtime.connect({ name: "popup" });
chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.status === "error_update_popup") {
        Popup.showError();
        console.log("Error update received, popup");
    }
});