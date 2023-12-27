'use strict'



chrome.runtime.onInstalled.addListener(function() {
    chrome.tabs.create({ url: "welcome.html" });
    Servers.createUpdateServersAlarm();
});


chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.status === "error_update_bg") {
        // setIconAndBadge();
        console.log("Error update received, bg");
        console.log("Connected? ", localStorage.connected);
        chrome.runtime.sendMessage({ status: "error_update_popup" });
    } else {
        var tab = sender.tab;

        if (!tab)
            return;

        var createdTabId = parseInt(localStorage._created_tab_id, 10);
        if (tab.id == createdTabId) {
            localStorage._quic_info = message.info;
            chrome.tabs.remove([createdTabId]);
            chrome.runtime.sendMessage({ status: "_quic_info" });
        }
    }
});



/* Trick to listen to popup close event */
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name != "popup") {
        return;
    }
    port.onDisconnect.addListener(function() {
        if (localStorage._always_enable_proxy === "true" &&
            localStorage.connected === "false") {
            startSelectedProxy();
            setIconAndBadge();
        }
    })
});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === "PullServersAlarm") {
        Servers.pullAndUpdateProxyServers();
    }

    if (alarm.name === "ProxyTTLExpiredAlarm") {
        console.log("TTL expired");
        Servers.pullAndUpdateProxyServers();
        if(!Proxy.proxyConnected()) {
            Proxy.startNewProxyServer();
        }
    }
});


setIconAndBadge();
Servers.setServerListAndFlagsDefaults();
// Servers.setFallbackDefaults();
Privacy.disableWebRTCByDefault();
Servers.pullAndPrepareFallbackServers();
Proxy.useNormalProxy();
Localization.resetI18n(Localization.localizeHtmlPage);
// Proxy.stopProxy();


Proxy.monitorProxyErrors();
Servers.pullAndUpdateProxyServers();
