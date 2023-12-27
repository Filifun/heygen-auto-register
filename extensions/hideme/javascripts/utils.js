'use strict'

let Utils = {};
let LevelOfControl = {
    NOT_CONTROLLABLE: 'not_controllable',
    OTHER_EXTENSION: 'controlled_by_other_extensions',
    AVAILABLE: 'controllable_by_this_extension',
    CONTROLLING: 'controlled_by_this_extension'
};

//TODO: move webrtc error to privacy object when it comes to it.
Utils.error_messages = {
    "PROXY_NOT_CONTROLLABLE": chrome.i18n.getMessage("proxy_not_controllable_error"),

    "WEBRTC_NOT_CONTROLLABLE": chrome.i18n.getMessage("webrtc_not_controllable_error"),
    "proxy_error": chrome.i18n.getMessage("proxy_setting_error"),
    "proxy_connection_error": chrome.i18n.getMessage("proxy_connection_error")
};




Utils.getErrorMessage = function(errorState) {
    return Utils.error_messages[errorState];
};




Utils.clearErrorState = function() {
    delete localStorage._error_state
}



Utils.noError = function() {
    return !localStorage._error_state;
}


Utils.isChrome = function() {
    return (typeof browser === "undefined");
}

Utils.shuffle = function(array) {
    console.log("Array of servers", array);

    // var currentIndex = array.length,
    //     temporaryValue, randomIndex;

    // // While there remain elements to shuffle...
    // while (0 !== currentIndex) {

    //     // Pick a remaining element...
    //     randomIndex = Math.floor(Math.random() * currentIndex);
    //     currentIndex -= 1;

    //     // And swap it with the current element.
    //     temporaryValue = array[currentIndex];
    //     array[currentIndex] = array[randomIndex];
    //     array[randomIndex] = temporaryValue;
    // }

    return array;
}