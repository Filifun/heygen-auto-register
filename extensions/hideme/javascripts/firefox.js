if ((typeof browser !== "undefined")) {
    var isAllowed = browser.extension.isAllowedIncognitoAccess();
    isAllowed.then(function(answer){
        if (!answer) {
            document.querySelector('.firefox-notification').classList.remove('hidden');
        }
    });
}