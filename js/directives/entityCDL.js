(function () {
    'use strict';


    angular.module("dizzy").directive('entityCdl', ['$state', '$stateParams', '$window', 'globals', 'dataApi',
        function ($state, $stateParams, $window, globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    forupdate: '@',
                    orgName: '='
                },
                templateUrl: "templates/directives/entityCDL.html",
                link: function (scope, element, attrs) {
                    scope.wordFor = function (word) { return globals.wordFor(word); };
                    scope.closeCPs = false;
                    scope.closeDocs = false;
                    scope.closeLoc = false;
                    scope.showLocEdit = false;
                    scope.hasmap = false;
                    scope.forExpert = false;  //todo
                    scope.hasOrg = false;
                    scope.geocoder = new google.maps.Geocoder();

                    scope.mapHeight = "320px";
                    scope.userAddress = "";
                    scope.isoLangs = globals.isoLangs();
                    dataApi.getTimezones().then(function (data) {
                        scope.timezones = data;
                        dataApi.getUTConstants().then(function (data) {
                            scope.utConstants = data;
                        });
                    });

                    var watcherO = scope.$watch('orgName', function () {
                        if (scope.orgName === undefined) return;

                        if (scope.orgName != null)
                        {
                            scope.hasOrg = true;
                            scope.hasOrgSet = true;
                        }
                        //console.log(scope.org);
                        AssignUI();

                        //watcherO();
                    });
                    var watcherE = scope.$watch('entity', function () {
                        if (scope.entity === undefined) return;

                        AssignUI();
                        //console.log(scope.entity);

                        // delete watcher if appropriate
                        //watcherE();
                    });

                    var watcherU = scope.$watch('forupdate', function () {
                        if (scope.forupdate === undefined) return;

                        scope.isUpdate = (scope.forupdate == "true");
                        scope.isUpdateSet = true;
                        AssignUI();
                        //console.log("isUpdate set");
                        //console.log(scope.isUpdate);

                        // delete watcher if appropriate
                        //watcherU();
                    });

                    scope.goto = function (data) {
                        globals.showAlert("To Do", "Go to " + data + " for " + scope.entity.name);

                    };

                    scope.requestUpdate = function (data) {
                        globals.showAlert("To Do", "Request Update for " + scope.entity.name);

                    };

                    scope.getTwitter = function (screenname) { $window.alert("TODO:  Get Twitter for @" + screenname); };


                    //#region Toggle
                    scope.closeCPs = false;
                    scope.closeDocs = false;
                    scope.closeLocs = false;

                    //get from localStorage
                    if (localStorage.getItem("closeCPs") == "true") scope.closeCPs = true;
                    if (localStorage.getItem("closeDocs") == "true") scope.closeDocs = true;
                    if (localStorage.getItem("closeLocs") == "true") scope.closeLocs = true;

                    scope.toggleDiv = function (div) {
                        if (div == "cps") {
                            scope.closeCPs = (!scope.closeCPs);
                            localStorage.setItem("closeCPs", scope.closeCPs);
                        }
                        else if (div == "docs") {
                            scope.closeDocs = (!scope.closeDocs);
                            localStorage.setItem("closeDocs", scope.closeDocs);
                            //console.log("get here");
                        }
                        else if (div == "locs") {
                            scope.closeLocs = (!scope.closeLocs);
                            localStorage.setItem("closeLocs", scope.closeLocs);
                        }
                    };
                    //#endregion

                    //#region Locations----------------------------------------------
                    scope.getAddress = function (theAddress) {

                        if (scope.geocoder) {
                            //console.log(theAddress);
                            //scope.userAddress = userAddress;
                            if (theAddress != "") {
                                scope.geocoder.geocode({ 'address': theAddress }, function (results, status) {
                                    scope.googleLoc = results[0];
                                    if (status == google.maps.GeocoderStatus.OK) {
                                        var lat = results[0].geometry.location.lat()
                                        var lng = results[0].geometry.location.lng();
                                        var theLatlng = new google.maps.LatLng(lat, lng);
                                        var mapOptions = {
                                            center: theLatlng,
                                            zoom: 13,
                                            mapTypeId: google.maps.MapTypeId.ROADMAP
                                        };

                                        scope.locSummary = scope.googleLoc.formatted_address;// + " (Google Place ID: " +scope.googleLoc.place_id + ")"

                                        scope.hasmap = true;
                                        scope.theMap = new google.maps.Map(document.getElementById('mapcanvas'), mapOptions);

                                        //var theLoc = new google.maps.Marker({
                                        //    position: theLatlng,
                                        //    map: scope.theMap,
                                        //    title: "Location"
                                        //});
                                        scope.modeladdress = "";

                                        scope.$apply();
                                        //console.log(canvas, theMap, theLoc);

                                        //navigator.geolocation.getCurrentPosition(function (pos) {
                                        //    map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
                                        //    var myLocation = new google.maps.Marker({
                                        //        position: new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
                                        //        map: map,
                                        //        title: "My Location"
                                        //    });
                                        //});
                                        //19 twilight dr, wheat ridge, co

                                        //create a new loc


                                    }
                                    else {
                                        var tmplt = String.format("Status: {0}<br />Results: {1}", status, results);
                                        $window.alert('Geocoding failed.  ' + tmplt);
                                    }
                                });
                            }
                        }
                        else {
                            globals.handleError("Unable to access Google Maps");
                            scope.hasmap = false;
                        }
                    }

                    scope.userAddressChanged = function (m) { scope.hasmap = false; scope.userAddress = m; };

                    scope.cancelLoc = function () {
                        scope.hasmap = false;
                        scope.userAddress = "";
                        scope.modeladdress = "";
                        scope.theMap = null;
                        document.getElementById('mapcanvas').innerHTML = "";
                    }

                    scope.saveLoc = function () {
                        if (!scope.googleLoc) $window.alert("Error - no google location has been retrieved.");
                        else {
                            var loc = new shuri_location();

                            loc.address = scope.googleLoc.formatted_address;
                            loc.latitude = scope.googleLoc.geometry.location.lat();
                            loc.longitude = scope.googleLoc.geometry.location.lng();
                            loc.place_Id = scope.googleLoc.place_id;
                            loc.userType_Id = scope.utConstants.loc_business;

                            for (var i = 0; i < scope.googleLoc.address_components.length; i++) {
                                var ac = scope.googleLoc.address_components[i];
                                for (var t = 0; t < ac.types.length; t++) {
                                    switch (ac.types[t]) {
                                        case "country":
                                            loc.country = ac.long_name;
                                            break;
                                        case "postal_code":
                                            loc.postal = ac.long_name;
                                            break;
                                    }
                                }
                            }
                            scope.entity.locations.push(loc);
                            //console.log(loc, scope.entity.locations);
                            scope.cancelLoc();
                        }
                    }

                    scope.isNewEntity = function (entity) {
                        return (entity.id == _guidEmpty);
                    }

                    scope.editLoc = function (loc) {


                        if (loc) scope.locBeingEdited = loc;
                        else scope.locBeingEdited = new shuri_location();

                        scope.showLocEdit = !scope.showLocEdit;
                    }

                    scope.deleteLoc = function (loc) {
                            if ($window.confirm("Delete " + loc.address + " ?")) {
                                for (var i = 0; i < scope.entity.locations.length; i++) {
                                    if (scope.entity.locations[i].address == loc.address) {
                                        scope.entity.locations[i].changeType = 2;
                                        break;
                                    }
                                }

                            }
                    }
                    //#endregion


                    scope.isSearchable = function (typename) {
                        var result = false;
                        switch (typename.toLowerCase()) {
                            case "linkedin url":
                            case "website: twitter":
                            case "employee url":
                            case "facebook username":
                            case "twitter username":
                            case "twitter":
                            case "home page url":
                                result = "true";
                                break;
                        }
                        return result;
                    }

                    scope.showBrowser = function (typename) {
                        if (typename == 'location') {
                            //get user's current location
                            globals.showAlert("Get Current Location", "TODO - get the user's current location");
                        }
                        else {
                            var url = "";
                            var win = window.open(url, 'workWindow', 'location=yes', '');
                        }
                    }

                    scope.showUrl = function (url) {
                        //console.log(url);
                        //if email no new window
                        if (url.toLowerCase().indexOf("http") >= 0) {
                            var win = window.open(url, 'workWindow');
                        }
                        else window.location.href = url;

                    }


                    function AssignUI() {
                        if (!scope.entity || !scope.isUpdateSet || !scope.hasOrgSet || scope.assignUIOnce) return;

                        //scope.assignUIOnce = true;

                        dataApi.getUTConstants().then(function (data) {
                            var utConstants = data;
                            //CPs
                            for (var i = 0; i < scope.entity.contactPoints.length; i++) {
                                var cp = scope.entity.contactPoints[i];
                                var itype = 'text';
                                var sect = 'known';

                                //UI help
                                cp.url = "";
                                cp.urlTitle = "";
                                cp.searchUrl = "";
                                cp.searchUrl2 = "";
                                cp.searchTitle = "";
                                cp.hasUrl = false;
                                cp.canSearch = false;
                                if ((cp.primitivename.toLowerCase() == 'url') && cp.name != '') {
                                    cp.hasUrl = true;
                                    cp.url = cp.name;
                                    cp.urlTitle = "Open " + cp.url;
                                }
                                switch (cp.typename.toLowerCase()) {
                                    case "blog":
                                        if (scope.orgName) {
                                            cp.searchUrl = "https://www.google.com/#q=blog+" + encodeURIComponent(scope.entity.name) + "+" + encodeURIComponent(scope.orgName.replace(" ", "+"));
                                        }
                                        else cp.searchUrl = "https://www.google.com/#q=blog+" + encodeURIComponent(scope.entity.name);
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google Blog for + " + encodeURIComponent(scope.entity.name);
                                        break;
                                    case "linkedin url":
                                        if (scope.orgName) {
                                            cp.searchUrl = String.format("https://www.linkedin.com/vsearch/p?type=people&keywords={0}&pageKey=voltron_people_search_internal_jsp&search=Search"
                                                , encodeURIComponent(scope.entity.name.replace(" ", "+")), encodeURIComponent(scope.orgName.replace(" ", "+")));
                                            cp.searchUrl2 = "https://www.google.com/#q=LinkedIn+" + encodeURIComponent(scope.entity.name) + "+" + encodeURIComponent(scope.orgName.replace(" ", "+"));
                                        }
                                        else cp.searchUrl = "https://www.google.com/#q=LinkedIn+" + encodeURIComponent(scope.entity.name);
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google LinkedIn + " + encodeURIComponent(scope.entity.name);
                                        break;
                                    case "website: twitter":
                                        cp.searchUrl = "https://www.google.com/#q=Twitter+" + encodeURIComponent(scope.entity.name) + "+profile+website";
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google Twitter + " + encodeURIComponent(scope.entity.name);
                                        break;
                                    case "employee url":
                                        cp.searchUrl = "https://www.google.com/#q=employee+list+about+us+" + encodeURIComponent(scope.entity.name);
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google 'About Us' + " + encodeURIComponent(scope.entity.name);
                                        sect = 'AATop';
                                        break;
                                    case "facebook username":
                                        if (scope.orgName) {
                                            cp.searchUrl = String.format("https://www.facebook.com/search/str/{0}/keywords_users"
                                                , encodeURIComponent(scope.entity.name.replace(" ", "+")), encodeURIComponent(scope.orgName.replace(" ", "+")));
                                            cp.searchUrl2 = "https://www.google.com/#q=Facebook+" + encodeURIComponent(scope.entity.name) + "+" + encodeURIComponent(scope.orgName.replace(" ", "+"));
                                        }
                                        else cp.searchUrl = "https://www.google.com/#q=Facebook+" + encodeURIComponent(scope.entity.name);
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google Facebook + " + encodeURIComponent(scope.entity.name);
                                        //console.log("Entity", scope.entity);
                                        //console.log("FB", cp);
                                        break;
                                    case "twitter username":
                                        if (scope.orgName) {
                                            cp.searchUrl = String.format("https://twitter.com/search?src=typd&q={0}"
                                                , encodeURIComponent(scope.entity.name.replace(" ", "+")), encodeURIComponent(scope.orgName.replace(" ", "+")));
                                            cp.searchUrl2 = "https://www.google.com/#q=Twitter+" + encodeURIComponent(scope.entity.name) + "+" + encodeURIComponent(scope.orgName.replace(" ", "+"));
                                        }
                                        else cp.searchUrl = "https://www.google.com/#q=Twitter+" + encodeURIComponent(scope.entity.name) ;
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google Twitter + " + encodeURIComponent(scope.entity.name);
                                        //console.log("TW", cp);
                                        break;
                                    case "home page url":
                                        cp.searchUrl = "https://www.google.com/#q=home+page+" + encodeURIComponent(scope.entity.name);
                                        cp.canSearch = true;
                                        cp.searchTitle = "Google home page + " + encodeURIComponent(scope.entity.name);
                                        if (cp.name != "") scope.entity.homePageUrl = cp.name;  //this is used back in parent template
                                        break;
                                }


                                //customize
                                if (cp.userType_Id == utConstants.cp_websiteTwitter) { scope.entity.twitterWebUrl = cp.name; if (!scope.isUpdate) sect = 'omit'; }
                                else if (cp.userType_Id == utConstants.cp_linkedInUrl) { scope.entity.linkedInUrl = cp.name; if (!scope.isUpdate) sect = 'omit'; }
                                else {
                                    if (cp.primitivename) {
                                        switch (cp.primitivename.toLowerCase()) {
                                            case "email":
                                                itype = "email";
                                                if (cp.name.trim() != "") {
                                                    cp.url = "mailto:" + cp.name;
                                                    cp.hasUrl = true;
                                                    cp.urlTitle = "Send email to " + cp.name;
                                                }

                                                break;
                                            case "phone":
                                                itype = "tel";
                                                if (cp.name.trim() != "") {
                                                    cp.url = "tel:" + cp.name;
                                                    cp.hasUrl = true;
                                                    cp.urlTitle = "Call " + cp.name + " (If your device supports it)";
                                                }
                                                break;
                                            case "url":
                                                itype = "text";
                                                  break;
                                            default:

                                                switch (cp.typename.toLowerCase()) {
                                                    case "facebook username":
                                                        if (cp.name.trim() != "") {
                                                            if (cp.name.indexOf("http") == -1) cp.url = "https://www.facebook.com/" + encodeURIComponent(cp.name);
                                                            else cp.url = cp.name;
                                                            cp.hasUrl = true;
                                                            cp.urlTitle = "Facebook for " + cp.name;
                                                        }
                                                        break;
                                                    case "twitter username":
                                                        if (cp.name.trim() != "") {
                                                            if (cp.name.indexOf("http") == -1) cp.url = "https://www.twitter.com/" + encodeURIComponent(cp.name);
                                                            else cp.url = cp.name;
                                                            cp.hasUrl = true;
                                                            cp.urlTitle = "Twitter for " + cp.name;
                                                            scope.entity.screenname = cp.name;
                                                            if (!scope.isUpdate) sect = 'omit';
                                                        }
                                                        break;
                                                }
                                                break;
                                        }
                                    }
                                }

                                if (!scope.isUpdate && cp.name == "" && sect == 'known') sect = 'omit';

                                cp.inputType = itype;
                                cp.uiSection = sect;

                            }

                            //Docs
                            for (var d = 0; d < scope.entity.documents.length; d++) {
                                var doc = scope.entity.documents[d];
                                doc.uiSection = 'textprimitives';
                                //if (!scope.isUpdate && doc.value == "") doc.uiSection = 'omit';

                                if (doc.userType_Id == utConstants.doc_bioTwitter) { scope.entity.twitterBio = doc.value; doc.uiSection = 'omit'; }
                                else if (doc.userType_Id == utConstants.doc_twitterFollowers) { scope.entity.followers = doc.value; doc.uiSection = 'omit'; }
                                else if (doc.userType_Id == utConstants.doc_twitterAvatar) { scope.entity.twitterImageUrl = doc.value; doc.uiSection = 'omit'; }
                                else if (doc.userType_Id == utConstants.doc_language) { doc.uiSection = 'unique'; }
                                else if (doc.userType_Id == utConstants.doc_timeZone) { doc.uiSection = 'unique'; }
                                else if (doc.primitivename == 'CustomLongText' || doc.primitivename == 'CustomInteger' || doc.primitivename == 'Rating0to5' || doc.primitivename == 'Rating0to100') { doc.uiSection = 'otherprimitives'; }


                            }
                        });

                        //console.log(scope.entity.documents);
                    }

                    scope.showEntity = function () {
                        //console.log(scope.entity)
                    }
                }
            };
        }]);


})();