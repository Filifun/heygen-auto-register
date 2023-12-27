function monitorLinkClicks() {
    $("a").click(function(event) {
        event.preventDefault();
        var location = $(this).attr('href');
        chrome.tabs.create({ active: true, url: location });
    })
}



document.addEventListener('DOMContentLoaded', function() {
    Localization.resetI18n(Localization.localizeHtmlPage);
    chrome.i18n._setL10nData();
    monitorLinkClicks();
});





chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
}, function(tabs) {
    var tab = tabs[0];
    var id = tab.id;

    chrome.tabs.create({ active: false, url: "https://www.youtube.com/", openerTabId: id }, setCreatedTabId);

});




function setCreatedTabId(newTab) {
    localStorage._created_tab_id = newTab.id;
}


chrome.runtime.onMessage.addListener(function(message) {
    if (message.status != "_quic_info")
        return;

    if (localStorage._quic_info.search('quic') === -1) {
        $('.privacy_quic').removeClass("privacy_not_ok").addClass("privacy_ok");
        $('.privacy_quic .desc').text(chrome.i18n.getMessage("quick_disabled_message"));
    }

    if (!Privacy.webRTCDisabled()) {
        $('.privacy_webrtc').removeClass("privacy_ok").addClass("privacy_not_ok");
        $('.privacy_webrtc .desc').text(chrome.i18n.getMessage("webrtc_enabled_message"));
    }

    $(".privacy_state .row").show();
});


function emptyElement(myNode) {
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
}