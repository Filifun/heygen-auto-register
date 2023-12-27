'use strict'



let Privacy = {};
Privacy.notControllableWebRTC = "WEBRTC_NOT_CONTROLLABLE";
Privacy.webRTCError = "webrtc_error";
Privacy.hidemeWebRTCDisablePolicy = "disable_non_proxied_udp";


/* Checks if extension can control webRTC settings, sets an error state if 
   can't. If extension can control settings, runs provided callback. */
Privacy.checkWebRTCState = function(callback) {
    chrome.privacy.network.webRTCIPHandlingPolicy.get({}, function(config) {
        let levelOfControl = config.levelOfControl;
        if (levelOfControl === LevelOfControl.OTHER_EXTENSION ||
            levelOfControl === LevelOfControl.NOT_CONTROLLABLE) {

            /* If user has unset 'disable webrtc setting', we don't report 
               an error .*/
            if (!Privacy.webRTCDisabled() || Proxy.inProxyNotControllableErrorState()) {
                return;
            }

            let errorState = Privacy.notControllableWebRTC;
            // let errorMessage = Utils.getErrorMessage(errorState);


            localStorage._error_state = errorState;
            // localStorage._error_message = errorMessage;
            Privacy.sendWebRTCErrorUpdate();
        } else {
            Privacy.clearWebRTCError();
            if (callback != undefined)
                callback(config);
        }
    });
}




/* Uses checkWebRTCState to see if it is  possible to disable webRTC, if possible
   disables webRTC IP leakage. */
Privacy.checkAndSetWebRTCIPHandlingPolicy = function(policyValue) {
    Privacy.checkWebRTCState(function(config) {
        Privacy.setWebRTCIPHandlingPolicy(policyValue);
    });
}


Privacy.setWebRTCIPHandlingPolicy = function(policyValue) {
    if ((typeof browser !== "undefined")) { // Firefox only
        chrome.privacy.network.peerConnectionEnabled.set({ value: policyValue === 'default' ? true : false });
    }
    chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: policyValue }, function() {
        if (chrome.runtime.lastError) {
            localStorage._error_state = Privacy.webRTCError;
            localStorage._error_message = chrome.runtime.lastError;
            Privacy.sendWebRTCErrorUpdate();
        }
    });
}

Privacy.disableWebRTC = function() {
    Privacy.clearWebRTCError();
    Privacy.checkAndSetWebRTCIPHandlingPolicy(Privacy.hidemeWebRTCDisablePolicy);
    localStorage._webrtc_disabled = "true";
};

Privacy.enableWebRTC = function() {
    let prev = localStorage._prev_webRTCIPHandlingPolicy;
    if (!prev) {
        prev = "default";
    }
    localStorage._webrtc_disabled = "false";
    Privacy.setWebRTCIPHandlingPolicy('default');
    Privacy.clearWebRTCError();
}


Privacy.clearWebRTCError = function() {
    if (Privacy.inWebRTCErrorState() || Privacy.inWebRTCNotControllableErrorState()) {
        Utils.clearErrorState();
        Privacy.sendWebRTCErrorUpdate();
    }
}

/*
 * If web rtc policy has been changed before, we don't need to
 * touch webRTC settings. 
 */
Privacy.disableWebRTCByDefault = function() {
    if (!!localStorage._webrtc_disabled) {
        return;
    }

    Privacy.checkWebRTCState(function(config) {
        localStorage._prev_webRTCIPHandlingPolicy = config.value;
    });
    Privacy.disableWebRTC();
}



Privacy.sendWebRTCErrorUpdate = function() {
    chrome.runtime.sendMessage({ status: "error_update_bg" });
}

Privacy.webRTCSet = function() {
    return !!localStorage._webrtc_disabled;
}

Privacy.webRTCDisabled = function() {
    return localStorage._webrtc_disabled === "true";
}


Privacy.inWebRTCErrorState = function() {
    return localStorage._error_state === Privacy.webRTCError;
}

Privacy.inWebRTCNotControllableErrorState = function() {
    return localStorage._error_state === Privacy.notControllableWebRTC;
}