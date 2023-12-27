'use strict'


let Servers = {};
Servers.proxyAPIServerIP = "188.166.142.39"
Servers.fallbackServersListURL = "https://raw.githubusercontent.com/hidemevpn/proxy/master/config.json";

Servers.hidemeProxyName = "hideme"

// Configures how often server list will be pulled from the proxy.API server
Servers.listUpdatePerioudInMinutes = 10;

/* Creates system identifier from the Server name obtained from proxy API. 
   TODO: Will need to rectify this method's behaviour as we move along.
*/
Servers.serverNameToIdentifier = function(name) {
    let serversList = JSON.parse(localStorage._servers_list);
    for (const id in serversList) {
        if (!serversList.hasOwnProperty(id)) 
            continue;

        if (serversList[id].name == name) {
            return id;
        }
    }

    return name.toLowerCase().replace(".", "").split(" ").join("_");
}


/* Dynamically lists servers in popup.html */
Servers.listServers = function() {
    Servers.setServerListAndFlagsDefaults();
    let serversList = JSON.parse(localStorage._servers_list);
    let elem = document.querySelector(".servers_list ul");

    if (!elem) {
        return;
    }

    Servers.emptyNodesChildrenElements(elem);
    let arr = Servers.sortedServersArray(serversList);

    for (let server of arr) {
        let li = document.createElement("li");
        li.setAttribute("name", server);
        let src = Servers.flagSrc(server);
        li.innerHTML = Servers.liInnerHtml(src, serversList[server].name);
        elem.appendChild(li);
    }
}

/* Returns sorted array of server names from provided serversList.
   Using this array servers can be listed in sorted order. */
Servers.sortedServersArray = function(serversList) {
    let arr = []
    for (let server in serversList) {
        if (server != Servers.hidemeProxyName)
            arr.push(server);
    }
    arr.sort()
    return arr
}

Servers.liInnerHtml = function(src, serverName) {
    return `<span class="server_flag"><img src="${src}"></span> <span class="server_name">${serverName}</span>`
}

Servers.flagSrc = function(serverId) {
    let flags = JSON.parse(localStorage._flags);
    let src = flags[serverId];
    return `./images/flags/${src}`
}

Servers.emptyNodesChildrenElements = function(myNode) {
    if (!myNode) {
        return;
    }

    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
}

Servers.pullRemoteList = function(url, callback) {
    var xhr = new XMLHttpRequest(); // new HttpRequest instance
    xhr.open("GET", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send();

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            try {
                var resp = JSON.parse(xhr.responseText);
                if (callback != undefined) {
                    callback(resp);
                }
            } catch (e) {
                console.log("__DEBUG__, Caught error: ", e);
            }

        }
    }
}


/* More of a client methods that use pullRemoteList methods functionality */
Servers.pullServerList = function(callback) {
    Servers.setServerListAndFlagsDefaults();
    let url = `http://${Servers.proxyAPIServerIP}/servers/list`;
    Servers.pullRemoteList(url, callback);
}

Servers.pullFallbackList = function(callback) {
    Servers.pullRemoteList(Servers.fallbackServersListURL, callback);
}

Servers.pullAndUpdateProxyServers = function() {
    Servers.pullServerList(function(array_of_servers) {
        Servers.updateServerList(array_of_servers);
        Proxy.updateSelectedProxyServer();
        if (Proxy.proxyConnected()) {
            Proxy.startSelectedProxy();
        }
    })
}

Servers.pullAndPrepareFallbackServers = function() {
    try {
        Servers.pullFallbackList(function(array_of_servers) {
            localStorage._fallback_servers_list = JSON.stringify(array_of_servers);
            Servers.updateServerList(array_of_servers);
            Proxy.updateSelectedProxyServer();
            if (Proxy.proxyConnected()) {
                Proxy.startSelectedProxy();
            }
        });
    } catch (e) {
        console.log("DEBUG: Could not pull the fallback list");
    }
}

Servers.updateServerList = function(array_of_servers) {
    let servers_list = Servers.defaultList;
    let now = Date.now();
    for (let server of array_of_servers) {
        let id = Servers.serverNameToIdentifier(server.name);
        server.receivedTime = now;
        servers_list[id] = server;
    }
    Servers.setAutomaticServer(array_of_servers, servers_list);
    localStorage._servers_list = JSON.stringify(servers_list);
    Servers.setDefaultServer();
}

Servers.setDefaultServer = function() {
    if (localStorage._selected_server === undefined) {
        Proxy.selectProxyServer('automatic');
    }
}

Servers.setFallbackDefaults = function() {
    if (!!localStorage._fallback_servers_list) {
        return;
    }

    localStorage._fallback_servers_list = JSON.stringify(Servers.defaultFallbackServersList);
}

Servers.createUpdateServersAlarm = function() {
    chrome.alarms.create("PullServersAlarm", { periodInMinutes: Servers.listUpdatePerioudInMinutes });
}



/* Functionality to create server TTL alarms */

Servers.clearTTLExpiredAlarm = function() {
     chrome.alarms.clear("ProxyTTLExpiredAlarm");
}

Servers.createProxyTTLExpiredAlarm = function(serverInfo) {
    Servers.clearTTLExpiredAlarm();
    if (serverInfo.ttl < 0 || !serverInfo.ttl) return;

    let remainingTTL = Servers.remainingTTL(serverInfo);

    chrome.alarms.create("ProxyTTLExpiredAlarm", { delayInMinutes: remainingTTL });
}

/*  
 * Calculates the remaining TTL value of server object.
 * Remaining TTL value is calculated by subtracting the time difference between
 * now and server's received time  in minutes from server's TTL value.
 */
Servers.remainingTTL = function(serverInfo) {
    // Now is Unix epoch time in milliseconds
    let now = Date.now();
    return Servers.remainingTTLUsingNow(now, serverInfo);
}

Servers.remainingTTLUsingNow = function(
    now /* Date object to calculate time difference as described above*/ ,
    serverInfo /* server object that contains TTL value  */
) {
    // Need to calculate minute time difference between 2 epoch timestamps
    let minuteSinceReceived = (now - serverInfo.receivedTime) / (60 * 1000);
    // console.log("minuteSinceReceived: ", minuteSinceReceived);
    let updatedTTL = serverInfo.ttl - minuteSinceReceived;
    return updatedTTL;
}


/* 
 * Functionality that sets servers list and server flags list in localstorage 
 */

Servers.setServerListAndFlagsDefaults = function() {
    if (!!localStorage._servers_list) {
        return;
    }
    let now = Date.now();
    let serversList = Servers.defaultList;

    for (let server in serversList) {
        if (serversList.hasOwnProperty(server)) {
            serversList[server]["receivedTime"] = now;
        }
    }

    localStorage._servers_list = JSON.stringify(serversList);
    Servers.setFlagDefaults();
}

Servers.setFlagDefaults = function() {
    if (!!localStorage._flags) {
        return;
    }
    localStorage._flags = JSON.stringify(Servers.flags);
}


Servers.setAutomaticServer = function(array_of_servers, servers_list) {
    if (array_of_servers.length == 0) {
        return;
    }
    // Selects and makes a copy of randomly selected server 
    let randomServer = Object.assign({}, array_of_servers[Math.floor(Math.random()*array_of_servers.length)]);
    randomServer.name = "Automatic"
    servers_list['automatic'] = randomServer;
}

Servers.defaultFallbackServersList = [{
    name: "FB0",
    ttl: -1,
    host: "95.174.67.50",
    port: 18080
}];


Servers.flags = {
    "automatic": "auto.png",
    "hideme": "auto.png",
    "canada": "ca.png",
    "germany": "de.png",
    "singapore": "sg.png",
    "netherlands": "nl.png",
    "united_states": "us.png",
    "usa": "us.png"
};

Servers.defaultList = {
    "hideme": {
        name: "hide.me SOCKS",
        ttl: -1,
        host: "socks.hide.me",
        port: 1080
    }
};



function serversRequest() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "http://188.166.142.39/servers/list");
    xhr.send()

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var resp = JSON.parse(xhr.responseText)
            console.log(resp)
        }
    }
}