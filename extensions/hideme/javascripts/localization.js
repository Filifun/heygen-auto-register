'use strict'

let Localization = {};

Localization.localizeHtmlPage = function() {
    var data = document.querySelectorAll('[data-localize]');

    for (var i in data)
        if (data.hasOwnProperty(i)) {
            var obj = data[i];
            var tag = obj.getAttribute('data-localize').toString();
            Localization.replace_i18n(obj, tag);
        }
}


Localization.replace_i18n = function(obj, tag) {
    var msg = tag.replace(/__MSG_(\w+)__/g, function(match, v1) {
        return v1 ? chrome.i18n.getMessage(v1) : '';
    });

    if (msg != tag) obj.innerHTML = msg;
}


Localization.setLocale = function(locale) {
    localStorage._locale = locale;
}


Localization.resetI18n = function(mainCallback) {

    // TODO: test this method 
    chrome.i18n = (function() {
        function asyncFetch(file, locale, fn) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", chrome.extension.getURL(file), true);
            xhr.onreadystatechange = function() {
                if (this.readyState == 4 && this.responseText != "") {
                    fn(locale, this.responseText);
                }
            };
            try {
                xhr.send();
            } catch (e) {
                // File not found, perhaps
            }
        }

        // Insert substitution args into a localized string.
        function parseString(msgData, args) {
            // If no substitution, just turn $$ into $ and short-circuit.
            if (msgData.placeholders == undefined && args == undefined)
                return msgData.message.replace(/\$\$/g, '$');

            // Substitute a regex while understanding that $$ should be untouched
            function safesub(txt, re, replacement) {
                var dollaRegex = /\$\$/g,
                    dollaSub = "~~~I18N~~:";
                txt = txt.replace(dollaRegex, dollaSub);
                txt = txt.replace(re, replacement);
                // Put back in "$$" ("$$$$" somehow escapes down to "$$")
                var undollaRegex = /~~~I18N~~:/g,
                    undollaSub = "$$$$";
                txt = txt.replace(undollaRegex, undollaSub);
                return txt;
            }

            var $n_re = /\$([1-9])/g;
            var $n_subber = function(_, num) { return args[num - 1]; };

            var placeholders = {};
            // Fill in $N in placeholders
            for (var name in msgData.placeholders) {
                var content = msgData.placeholders[name].content;
                placeholders[name.toLowerCase()] = safesub(content, $n_re, $n_subber);
            }
            // Fill in $N in message
            var message = safesub(msgData.message, $n_re, $n_subber);
            // Fill in $Place_Holder1$ in message
            message = safesub(message, /\$(\w+?)\$/g, function(full, name) {
                var lowered = name.toLowerCase();
                if (lowered in placeholders)
                    return placeholders[lowered];
                return full; // e.g. '$FoO$' instead of 'foo'
            });
            // Replace $$ with $
            message = message.replace(/\$\$/g, '$');

            return message;
        }

        var l10nData = undefined;

        var theI18nObject = {
            // chrome.i18n.getMessage() may be used in any extension resource page
            // without any preparation.  But if you want to use it from a content
            // script in Safari, the content script must first run code like this:
            //
            //   get_localization_data_from_global_page_async(function(data) {
            //     chrome.i18n._setL10nData(data);
            //     // now I can call chrome.i18n.getMessage()
            //   });
            //   // I cannot call getMessage() here because the above call
            //   // is asynchronous.
            //
            // The global page will need to receive your request message, call
            // chrome.i18n._getL10nData(), and return its result.
            //
            // We can't avoid this, because the content script can't load
            // l10n data for itself, because it's not allowed to make the xhr
            // call to load the message files from disk.  Sorry :(
            _getL10nData: function(mainCallback) {
                var result = { locales: [] };
                // SETS DEFAULT LOCALE
                if (!localStorage._locale || localStorage._locale.length == 0) {
                    localStorage._locale = navigator.language.substring(0, 2);
                }
                result.locales.push(localStorage._locale);
                // == Find all locales we might need to pull messages from, in order
                // 1: The user's current locale, converted to match the format of
                //    the _locales directories (e.g. "en-US" becomes "en_US"
                // result.locales.push(navigator.language.replace('-', '_'));
                // 2: Perhaps a region-agnostic version of the current locale
                // 3: Set English 'en' as default locale
                if (result.locales.indexOf("en") == -1)
                    result.locales.push("en");
                // Load all locale files that exist in that list
                result.messages = {};
                for (var i = 0; i < result.locales.length; i++) {
                    var locale = result.locales[i];

                    var file = "_locales/" + locale + "/messages.json";
                    // Doesn't call the callback if file doesn't exist
                    asyncFetch(file, locale, function(locale, text) {
                        result.messages[locale] = JSON.parse(text);
                        mainCallback();
                    });
                }
                return result;
            },

            // Manually set the localization data.  You only need to call this
            // if using chrome.i18n.getMessage() from a content script, before
            // the first call.  You must pass the value of _getL10nData(),
            // which can only be called by the global page.
            _setL10nData: function() {
                l10nData = chrome.i18n._getL10nData(mainCallback);
            },

            _resetL10nData: function() {
                l10nData = undefined;
            },

            getMessage: function(messageID, args) {

                if (!l10nData) {
                    chrome.i18n._setL10nData(function(){
                        if (typeof args == "string") {
                            args = [args];
                        }
    
                        for (var i = 0; i < l10nData.locales.length; i++) {
                            var map = l10nData.messages[l10nData.locales[i]];
                            // We must have the locale, and the locale must have the message
                            if (map && messageID in map)
                                return parseString(map[messageID], args);
                        }
    
                        return "";
                    });
                } else {

                    if (typeof args == "string") {
                        args = [args];
                    }

                    for (var i = 0; i < l10nData.locales.length; i++) {
                        var map = l10nData.messages[l10nData.locales[i]];
                        // We must have the locale, and the locale must have the message
                        if (map && messageID in map) {
                            return parseString(map[messageID], args);
                        }
                    }

                    return "";
                }

            }
        };

        return theI18nObject;
    })()
}