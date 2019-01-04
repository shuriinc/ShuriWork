(function () {
    'use strict';

    angular.module("dizzy").factory('globals',  ['$window', globals]);

    function globals($window) {
        var vm = this;
        vm.smallWidth = 480;
        vm.isSmallWidth = (window.innerWidth <= vm.smallWidth);
        vm.mediumWidth = 640;
        vm.isMediumWidth = (window.innerWidth <= vm.mediumWidth);
        //console.log(vm.isSmallWidth);

        function showAlert(title, message) {
            $window.alert(title + "\r\n" + message);
        }

        function getNamedUserTypes(usertypes) {
            var uts = [];
            for (var i = 0; i < usertypes.length; i++) {
                var ut = usertypes[i];
                var utName = ""
                if (ut.entityType == SEnums('entitytypes','contactpoint')) utName +="cp_";
                else if (ut.entityType == SEnums('entitytypes','document')) utName +="doc_";
                utName += ut.name.toLowerCase().replaceAll(" ", "").replaceAll(":", "");
                var code = 'uts.' + utName + ' = ut;'
                //console.log(code);
                eval(code);
            }

            return uts;
        }

        function handleError(data) {
            var s = "Error.  ";
            if (data) {
                s += JSON.stringify(data);
            }
            if (window.cordova) $window.alert(s);
            else console.log(s);
        }


        vm.guids = {
            utResearchAssignment: 'AC0D805E-50A0-4080-BA0C-A7FC25F84BB2'.toLowerCase(),
            empty: '00000000-0000-0000-0000-000000000000',
            favorites: '00000000-0000-0000-0000-000000000000'.replaceAll('0', '6'),
            system: '00000000-0000-0000-0000-000000000000'.replaceAll('0', 'f'),
            adminDB: 'c462dfbe-7b92-4d90-b449-57ccbaa69c86',
            arDB: 'E2DB0148-2A04-4727-8316-4071E6F83D18'.toLowerCase(),
            arMedia: '6911F89D-BB3D-495C-A377-0F43DDE421D7'.toLowerCase(),
            utLooseTags: 'A2E53FB1-8120-4A90-9422-0D5A3B3C959D'.toLowerCase()
        }

        //#region UI Helpers

        function synchTwitterTimezones(docs, timezones) {
            //check to see if org's timezone is in list or can be found - original tzs were imported from twitter --   remove this eventually
            var inList = false;
            var orgTZId = "";
            for (var i = 0; i < docs.length; i++) {
                if (docs[i].userType_Id == utConstant.doc_timeZone) {
                    orgTZId = docs[i].value;
                    break;
                }
            }

            if (orgTZId != "") {
                for (var i = 0; i < timezones.length; i++) {
                    if (timezones[i].Id == orgTZId) {
                        inList = true;
                        //console.log("Found by ID");
                        break;
                    }
                    else if (timezones[i].Id.toLowerCase().indexOf(orgTZId.toLowerCase()) >= 0) {
                        //console.log("Found by Partial ID");
                        //fix the org
                        for (var i = 0; i < docs.length; i++) {
                            if (docs[i].userType_Id == utConstant.doc_timeZone) {
                                docs[i].value = timezones[i].Id;
                                break;
                            }
                        }

                        inList = true;
                        break;
                    }
                    else if (timezones[i].DisplayName.toLowerCase().indexOf(orgTZId.toLowerCase()) >= 0) {
                        //fix the org
                        var newId = timezones[i].Id
                        //console.log(timezones[i].DisplayName);
                        for (var i = 0; i < docs.length; i++) {
                            if (docs[i].userType_Id == utConstant.doc_timeZone) {
                                docs[i].value = newId;
                                break;
                            }
                        }

                        inList = true;
                        break;
                    }
                }
            }

            if (!inList && orgTZId != "") {
                timezones.push({
                    Id: orgTZId,
                    DisplayName: orgTZId
                })
            }


        }


        //#endregion

        //#region wordFor
        //hook for localization
        function wordFor (s) {
            switch (s.toLowerCase()) {
                //other
                case "copyright":
                    s = "©2015 Shuri, Inc.  All rights reserved."
                    break;
                    //entity names
                case "user type":
                case "usertype":
                    s = "Type";
                    break;
                case "user types":
                case "usertypes":
                    s = "Types";
                    break;
                case "org":
                    s = "Organization";
                    break;

                case "group":
                case "groups":
                case "person":
                case "people":
                case "organization":
                case "organizations":
                case "tag":
                case "tags":
                case "team":
                case "teams":
                case "touch":
                case "touches":
                case "subscription":
                case "subscriptions":
                case "contact point":
                case "contact points":
                case "document":
                case "documents":
                case "location":
                case "locations":

                    //other vocabulary
                case "add":
                case "add new":
                case "address":
                case "all":
                case "and":
                case "approved":
                case "are":
                case "cancel":
                case "choose":
                case "client inquiry email":
                case "codename":
                case "comments":
                case "created":
                case "date":
                case "data source":
                case "delete":
                case "description":
                case "earnings":
                case "edit":
                case "editor":
                case "employee list":
                case "enter address":
                case "entity":
                case "expert":
                case "favorites":
                case "fax":
                case "filter":
                case "first name":
                case "found":
                case "for":
                case "general email":
                case "history":
                case "home page":
                case "icon":
                case "id":
                case "info":
                case "is":
                case "language":
                case "last modified":
                case "last name":
                case "login":
                case "logo":
                case "logout":
                case "manage":
                case "middle name":
                case "name":
                case "new":
                case "nickname":
                case "no":
                case "no results found":
                case "no work available":
                case "ok":
                case "optional":
                case "owned by":
                case "pending":
                case "phone":
                case "photo":
                case "prefix":
                case "primitive":
                case "private":
                case "queue":
                case "queues":
                case "recent items":
                case "rejected":
                case "remove":
                case "required":
                case "review":
                case "reviewer":
                case "save changes":
                case "search":
                case "searching":
                case "settings":
                case "show":
                case "show public":
                case "start date":
                case "subscribe":
                case "suffix":
                case "time zone":
                case "twitter screenname":
                case "type":
                case "tmi":
                case "unsubscribe":
                case "update":
                case "value":
                case "view these":
                case "work":
                case "worker":
                case "your next pay":
                case "you've been paid":
                    break;

                default:
                    console.log("Unhandled string: " + s);
                    break;
            }

            return s;
        }
        //#endregion

        //https://en.wikipedia.org/wiki/Language_localisation   
        //#region Languages
        function isoLangs() {

            var x = [
                 {
                    "id": "en",
                    "name": "English",
                    "nativeName": "English"
                },
                  {
                      "id": "fr",
                      "name": "French",
                      "nativeName": "français, langue française"
                  },
                {
                    "id": "de",
                    "name": "German",
                    "nativeName": "Deutsch"
                },
                 {
                    "id": "ja",
                    "name": "Japanese",
                    "nativeName": "日本語 (にほんご／にっぽんご)"
                },
                {
                    "id": "ko",
                    "name": "Korean",
                    "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"
                },
                {
                    "id": "es",
                    "name": "Spanish",
                    "nativeName": "español, castellano"
                },
               {
                   "id": "ru",
                   "name": "Russion",
                   "nativeName": "Русский"
               },
               {
                   "id": "zh",
                   "name": "Chinese",
                   "nativeName": "中文 (Zhōngwén), 汉语, 漢語"
               },
                {
                    "id": "pt",
                    "name": "Portugese",
                    "nativeName": "português"
                },
               {
                   "id": "pl",
                   "name": "Polish",
                   "nativeName": "język polski, polszczyzna"
               },
               {
                   "id": "it",
                   "name": "Italian",
                   "nativeName": "italiano"
               },


            ];
            return x;
        }
    
        //#region All Languages
        //from  http://stackoverflow.com/questions/3217492/list-of-language-codes-in-yaml-or-json
        function isoLangsAll() {

            return {
                "af": {
                    "name": "Afrikaans",
                    "nativeName": "Afrikaans"
                },
                "sq": {
                    "name": "Albanian",
                    "nativeName": "Shqip"
                },
                "ar": {
                    "name": "Arabic",
                    "nativeName": "العربية"
                },
                "az": {
                    "name": "Azerbaijani",
                    "nativeName": "azərbaycan dili"
                },
                "bg": {
                    "name": "Bulgarian",
                    "nativeName": "български език"
                },
                "zh": {
                    "name": "Chinese",
                    "nativeName": "中文 (Zhōngwén), 汉语, 漢語"
                },
                "hr": {
                    "name": "Croatian",
                    "nativeName": "hrvatski"
                },
                "cs": {
                    "name": "Czech",
                    "nativeName": "česky, čeština"
                },
                "da": {
                    "name": "Danish",
                    "nativeName": "dansk"
                },
                "nl": {
                    "name": "Dutch",
                    "nativeName": "Nederlands, Vlaams"
                },
                "en": {
                    "name": "English",
                    "nativeName": "English"
                },
                "fi": {
                    "name": "Finnish",
                    "nativeName": "suomi, suomen kieli"
                },
                "fr": {
                    "name": "French",
                    "nativeName": "français, langue française"
                },
                "de": {
                    "name": "German",
                    "nativeName": "Deutsch"
                },
                "el": {
                    "name": "Greek, Modern",
                    "nativeName": "Ελληνικά"
                },
                "he": {
                    "name": "Hebrew (modern)",
                    "nativeName": "עברית"
                },
                "hi": {
                    "name": "Hindi",
                    "nativeName": "हिन्दी, हिंदी"
                },
                "hu": {
                    "name": "Hungarian",
                    "nativeName": "Magyar"
                },
                "it": {
                    "name": "Italian",
                    "nativeName": "Italiano"
                },
                "ja": {
                    "name": "Japanese",
                    "nativeName": "日本語 (にほんご／にっぽんご)"
                },
                "ko": {
                    "name": "Korean",
                    "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"
                },
                "no": {
                    "name": "Norwegian",
                    "nativeName": "Norsk"
                },
                "fa": {
                    "name": "Persian",
                    "nativeName": "فارسی"
                },
                "pl": {
                    "name": "Polish",
                    "nativeName": "polski"
                },
                "ps": {
                    "name": "Pashto, Pushto",
                    "nativeName": "پښتو"
                },
                "pt": {
                    "name": "Portuguese",
                    "nativeName": "Português"
                },
                "ro": {
                    "name": "Romanian, Moldavian, Moldovan",
                    "nativeName": "română"
                },
                "ru": {
                    "name": "Russian",
                    "nativeName": "русский язык"
                },
                "sk": {
                    "name": "Slovak",
                    "nativeName": "slovenčina"
                },
                "es":{
                    "name":"Spanish; Castilian",
                    "nativeName":"español, castellano"
                },

                "sv": {
                    "name": "Swedish",
                    "nativeName": "svenska"
                },
                "th": {
                    "name": "Thai",
                    "nativeName": "ไทย"
                },
                "tr": {
                    "name": "Turkish",
                    "nativeName": "Türkçe"
                },
                "uk": {
                    "name": "Ukrainian",
                    "nativeName": "українська"
                },
                "vi": {
                    "name": "Vietnamese",
                    "nativeName": "Tiếng Việt"
                },
            };
            //#endregion
        }
        //#endregion


        return {
            getNamedUserTypes: getNamedUserTypes,
            guids: vm.guids,
            handleError: handleError,
            isoLangs: isoLangs,
            isMediumWidth: vm.isMediumWidth,
            isSmallWidth: vm.isSmallWidth,
            showAlert: showAlert,
            synchTwitterTimezones: synchTwitterTimezones,
            mediumWidth: vm.mediumWidth,
            smallWidth: vm.smallWidth,
            wordFor: wordFor
        }


    }



})();
