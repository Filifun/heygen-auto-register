'use strict'


let Proxy = {};

Proxy.notControllableError = "PROXY_NOT_CONTROLLABLE";
Proxy.proxyError = "proxy_error";


/*
 * Checks to see if proxy settings of the browser is controllable by this extension.
 */
Proxy.checkProxyState = function() {
    chrome.proxy.settings.get({ 'incognito': false }, function(config) {
        let levelOfControl = config.levelOfControl;
        if (levelOfControl === LevelOfControl.OTHER_EXTENSION ||
            levelOfControl === LevelOfControl.NOT_CONTROLLABLE) {
            let errorState = Proxy.notControllableError;
            let errorMessage = Utils.getErrorMessage(errorState);

            localStorage._error_state = errorState;
            localStorage._error_message = errorMessage;
            Proxy.sendErrorUpdate();
        }
    });
}


/*
 * Saves current proxy settings as previous proxy configurations
 */
Proxy.saveOldProxyConfig = function() {
    chrome.proxy.settings.get({ 'incognito': false },
        function(config) {
            localStorage._prev_proxy_config = JSON.stringify({ value: config.value });
            // console.log(localStorage._prev_proxy_config);
        }
    );
}


/*
 * Creates cofiguration for selected server ip address and port.
 * Sets the creted configuration as current proxy settings of the browser.
 * If error occurs, sets the error state to proxy error. Otherwise creates alarm 
 * for doing TTL expiration of the proxy server settings.
 */
Proxy.startSelectedProxy = function() {
    localStorage.connected = "true";
    Proxy.clearProxyError();
    let serverInfo = JSON.parse(localStorage._selected_server);
    let config = Proxy.GenerateProxyConfig(serverInfo);
    Proxy.saveOldProxyConfig();
    chrome.proxy.settings.set(config, function() {
        if (chrome.runtime.lastError) {
            Proxy.setProxyError(Utils.getErrorMessage(Proxy.proxyError));
            console.log("Error Setting Regular Proxy ", chrome.runtime.lastError);
        } else {
            Servers.createProxyTTLExpiredAlarm(serverInfo);
        }
    });
}


/*
 * Starts proxy only if extension is in connected state. 
 * Have seen this pattern occuring few times. So worth refactoring into its own 
 * method and testing once.
 */
Proxy.startProxyIfConnected = function() {
    if (this.proxyConnected()) {
        this.startSelectedProxy();
    }
}


/*
 * Clears the current proxy settings and makes the connection direct.
 */
Proxy.stopProxy = function() {
    Servers.clearTTLExpiredAlarm();

    localStorage.connected = "false";
    // let config = { scope: "regular" };
    // chrome.proxy.settings.clear(config, function() {
    //     console.log("Cleared the settings");
    // });

    let config;

    if (Utils.isChrome()) {
        config = {
            value: {
                mode: "system"
            },
            scope: 'regular'
        };

    } else {
        config = { value: { proxyType: "system" } };
    }

    chrome.proxy.settings.set(config, function() {
        console.log("Cleared the settings");
    });

    Proxy.clearProxyError();
    Proxy.useNormalProxy();
}


/*
 * Sets the error state to `proxy_error` and sets passed error messasge as error_message value.
 */
Proxy.setProxyError = function(error_message) {
    localStorage.connected = "false";
    localStorage._error_state = this.proxyError;
    localStorage._error_message = error_message;
    Proxy.sendErrorUpdate();
}



/*
 * Clears the error state and sets it to false if its `proxy_error`
 */
Proxy.clearProxyError = function() {
    if (Proxy.inProxyErrorState()) {
        Utils.clearErrorState();
        Proxy.sendErrorUpdate();
    }
}


/* Starts new  proxy server with largest remaining TTL value */
Proxy.startNewProxyServer = function() {
    let servers = JSON.parse(localStorage._servers_list);
    let serverArray = [];
    Utils.shuffle(servers);
    let now = Date.now();
    let maxTTL = -1;
    let maxServer = null;


    for (let serverName in servers) {
        if (!servers.hasOwnProperty(serverName)) {
            continue;
        }

        serverArray.push(servers[serverName]);
    }

    serverArray = Utils.shuffle(serverArray);

    for (let i in serverArray) {
        let serverInfo = serverArray[i];
        let remainingTTL = Servers.remainingTTLUsingNow(now, serverInfo);

        if (remainingTTL > maxTTL) {
            maxServer = serverInfo;
            maxTTL = remainingTTL;
        }
    }





    console.log("MAX TTL:", maxTTL);
    if (maxTTL <= 0) {
        // Proxy.setProxyError("Could not find  server with positive remaining TTL, need to refresh the list of servers");
        return;
    }


    console.log("maxServer ", maxServer);
    let selectedServer = JSON.parse(localStorage._selected_server);
    let newSelectedServer = Object.assign({}, maxServer);
    newSelectedServer.name = selectedServer.name;
    localStorage._selected_server = JSON.stringify(newSelectedServer);
    Proxy.startProxyIfConnected();
}




Proxy.selectProxyServer = function(serverName) {
    let servers_list = JSON.parse(localStorage._servers_list);
    localStorage._selected_server = JSON.stringify(servers_list[serverName]);
}

Proxy.selectPrevProxyServer = function(serverName) {
    let servers_list = JSON.parse(localStorage._servers_list);
    localStorage._prev_server = JSON.stringify(servers_list[serverName]);
}

Proxy.enableHidemeProxy = function() {
    localStorage._enable_socks = "true";
    localStorage._prev_server = localStorage._selected_server;
    Proxy.selectProxyServer(Servers.hidemeProxyName);
    Proxy.startProxyIfConnected();
}



Proxy.disableHidemeProxy = function() {
    localStorage._enable_socks = "false";
    Proxy.restorePrevServer();
    Proxy.startProxyIfConnected();
}


Proxy.setAlwaysEnableProxy = function() {
    localStorage._always_enable_proxy = "true";
}

Proxy.unsetAlwaysEnableProxy = function() {
    localStorage._always_enable_proxy = "false";
}


Proxy.enableAutomaticFallback = function() {
    localStorage._auto_fallback = "true";
}

Proxy.disableAutomaticFallback = function() {
    localStorage._auto_fallback = "false";
}


Proxy.updateSelectedProxyServer = function() {
    let name = 'Automatic';

    if (localStorage._selected_server && localStorage._selected_server !== 'undefined'){
        name = JSON.parse(localStorage._selected_server).name;
    }

    let id = Servers.serverNameToIdentifier(name);
    Proxy.selectProxyServer(id);
}

Proxy.ProxyTypes = {
    AUTO: 'auto_detect',
    PAC: 'pac_script',
    DIRECT: 'direct',
    FIXED: 'fixed_servers',
    SYSTEM: 'system'
};

Proxy.GenerateProxyConfig = function(serverInfo) {
    if (Utils.isChrome()) {
        let config = { mode: "fixed_servers" }
        config.rules = {
            singleProxy: {
                scheme: "socks5",
                host: serverInfo.host,
                port: serverInfo.port
            },
            bypassList: ["localhost", Servers.proxyAPIServerIP]
        }
        return { value: config, scope: 'regular' };
    } else {
        let config = {
            proxyType: "manual",
            socks: serverInfo.host + ":" + serverInfo.port,
            socksVersion: 5,
            passthrough: "localhost, " + Servers.proxyAPIServerIP
        };
        return { value: config };

    }

}


Proxy.monitorProxyErrors = function() {
    var onError;

    if ((typeof browser !== "undefined")) { // Firefox
        onError = 'onError'
    } else { // Chrome
        onError = 'onProxyError';
    }

    chrome.proxy[onError].addListener(function() {

        if (!Proxy.proxyConnected() || Proxy.hidemeEnabled()) {
            return;
        }

        localStorage._error_state = Proxy.proxyError;
        localStorage._error_message = Utils.getErrorMessage("proxy_connection_error");
        Proxy.fallback();
        setIconAndBadge();
        Proxy.sendErrorUpdate();
        Proxy.updatePopup();
    });
}


Proxy.fallback = function() {
    console.log("fallback auto_fb", localStorage._auto_fallback);
    console.log("fallback enable_socks", localStorage._enable_socks);
    console.log("fallback error_state", localStorage._error_state);


    /* Error occured while using hideme proxy. Disable 
       hideme proxy, when using automatically fallback to 
       fallback proxy. */
    if (!Proxy.hidemeEnabled()) {
        Proxy.useFallbackProxy();
    }

}


Proxy.useFallbackProxy = function() {
    console.log("using fallback proxy");
    if (Proxy.isInFallenBackState()) {
        let fallbackCount = parseInt(localStorage._fallback_count, 10);
        if (fallbackCount != NaN && fallbackCount < 3) {
            Proxy.startSelectedProxy();
            fallbackCount++;
            localStorage._fallback_count = fallbackCount;
        }

        return;
    }

    Proxy.enableFallenBackState();
    localStorage._fallback_count = 1;

    /* USE OF FALLBACK SERVERS IS DISABLED FOR NOW */
    // let arr = JSON.parse(localStorage._fallback_servers_list);
    // let random_server = arr[Math.floor(Math.random() * arr.length)];
    // random_server.name = "Automatic";

    // localStorage._prev_server = localStorage._selected_server;
    // localStorage._selected_server = JSON.stringify(random_server);
    // startSelectedProxy();

    localStorage._prev_server = localStorage._selected_server;
    Proxy.startNewProxyServer();
}

Proxy.useNormalProxy = function() {
    if (Proxy.isInFallenBackState()) {
        Proxy.disableFallenBackState();
        Proxy.restorePrevServer();
        Proxy.updatePopup();
        Proxy.startProxyIfConnected();
    }
}


Proxy.updatePopup = function() {
    let arr = chrome.extension.getViews({ 'type': 'popup' });
    if (arr.length > 0) {
        /* Descriptor of popup view */
        let popup = arr[0];

        /* Calls a method defined in popup window only. */
        /* This will update the popup window, only if extension popup 
        is currently open */
        console.log("updating popup:", popup)

        /* TODO: Add test for popup.js that adds showError on window Popup's scope */
        popup.showError();
    }
}


Proxy.restorePrevServer = function() {
    localStorage._selected_server = localStorage._prev_server;
    localStorage._prev_server = null;
}


Proxy.sendErrorUpdate = function() {
    let message = { status: "error_update_bg", error_state: localStorage._error_state, error_message: localStorage._error_message };
    console.log("Sending Error Update, message  = ", message);
    chrome.runtime.sendMessage(message);
}

Proxy.enableFallenBackState = function() {
    localStorage._fallen_back = "true";
}

Proxy.disableFallenBackState = function() {
    localStorage._fallen_back = "false";
}

Proxy.isInFallenBackState = function() {
    return localStorage._fallen_back === "true";
}

Proxy.hidemeEnabled = function() {
    return localStorage._enable_socks === "true";
}

Proxy.hidemeDisabled = function() {
    return localStorage._enable_socks != "true";
}

Proxy.proxyConnected = function() {
    return localStorage.connected === "true";
}

Proxy.proxyAlwaysEnabled = function() {
    return localStorage._always_enable_proxy === "true";
}

Proxy.autoFallbackIsSet = function() {
    return localStorage._auto_fallback === "true"
}

Proxy.inProxyNotControllableErrorState = function() {
    return localStorage._error_state === this.notControllableError;
}

Proxy.inProxyErrorState = function() {
    return localStorage._error_state === this.proxyError;
}


Proxy.setSelectedServer = function(serverName) {
    if (this.hidemeEnabled()) {
        this.selectPrevProxyServer(serverName);
    } else {
        this.selectProxyServer(serverName);
    }
}