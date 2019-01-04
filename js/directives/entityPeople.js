(function () {
    'use strict';
    angular.module("dizzy").directive('entityPeople', ['$compile', '$timeout', '$window', '$filter', '$sce', 'globals', 'dataApi',
        function ($compile, $timeout, $window, $filter, $sce, globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    dbId: '=',
                    forupdate: '@',
                    showavatar: '@'
                },
                templateUrl: "templates/directives/entityPeople.html",
                link: function (scope, elem, attrs) {
                    scope.wordFor = function (word) { return globals.wordFor(word); };
                    scope.closePeople = false;
                    scope.orderByField = 'name';

                    var watcherP = scope.$watch('entity', function () {
                        if (scope.entity === undefined || !scope.entity.people) return;

                        // at this point it is defined, do work
                        var now = UTCNow();
                        scope.entity.people.forEach(function (per) {
                            per.status = 'existing';
                            per.tenureMsg = per.title;
                            if (per.endDt != null && per.endDt.indexOf("T") > 0) {
                                per.jsEndDt = SQLDate2JS(per.endDt);
                                if (now > per.jsEndDt) {
                                    per.tenureOver = true;
                                    per.tenureMsg = "Former as of " + $filter('date')(per.jsEndDt, 'shortDate');
                                }
                            }
                            //console.log(per.endDt, now, per.name);
                        });

                        var inputAdd = GetInputByName("inputAdd");
                        if (inputAdd === undefined) return;
                        $compile(inputAdd)(scope);
                        inputAdd.onkeyup = scope.keyPressedAdd;
                        // delete watcher if appropriate
                        watcherP();
                    })

                    var watcherU = scope.$watch('forupdate', function () {
                        if (scope.forupdate === undefined) return;

                        scope.isUpdate = (scope.forupdate == "true");
                        scope.isUpdateSet = true;
                        // delete watcher if appropriate
                        watcherU();
                    })

                    var watcherS = scope.$watch('showavatar', function () {
                        if (scope.showavatar === undefined) return;

                        scope.showImageUrl = (scope.showavatar == "true");
                        // delete watcher if appropriate
                        watcherS();
                    })

                     function GetInputByName(name) {
                        var inputs = elem.find('input');
                        for (var i = 0; i < inputs.length; i++) {
                            if (inputs[i].name == name) return inputs[i];
                        }
                    }

                     scope.syncAddString = function () { 
                         //console.log(scope.theAddString); 
                     }

                    //#region Toggle
                    scope.closePeople = false;

                    //get from localStorage
                    if (localStorage.getItem("closePeople") == "true") scope.closePeople = true;

                    scope.toggleDiv = function () {
                        scope.closePeople = (!scope.closePeople);
                        localStorage.setItem("closePeople", scope.closePeople);
                    };
                    //#endregion


                    //#region Autocomplete ------------------------------------------------

                    scope.pause = 400;
                    scope.minLength = 2;
                    scope.addShow = false;
                    scope.addString = "";
                    scope.addStringLast = null;
                    scope.addTimer = null;
                    scope.hideTimer = null;
                    scope.searching = false;
                    scope.showResults = false;
                    scope.newperson = { lastname: "", firstname: "", middlename: "" };

                    scope.hideResults = function () {
                        scope.hideTimer = $timeout(function () {
                            scope.showResults = false;
                        }, scope.pause);
                    };

 
                    scope.keyPressedAdd = function (event, elem) {
                        //console.log(elem.addString);
                        var p = new shuri_person();
                        if (elem.addString) {
                            var name = elem.addString;
                            var names = name.split(" ");
                            var lastfirst = (name.indexOf(",") > 0);

                            if (names.length == 1) p.lastname = name;
                            else if (names.length == 2) {
                                p.firstname = (lastfirst) ? names[1] : names[0];
                                p.lastname = (lastfirst) ? names[0] : names[1];
                                p.lastname = p.lastname.replace(",", "");
                                p.name = p.lastname + ', ' + p.firstname;
                            }
                            else if (names.length == 3) {
                                p.firstname = (lastfirst) ? names[1] : names[0];
                                p.middlename = (lastfirst) ? names[2] : names[1];
                                p.lastname = (lastfirst) ? names[0] : names[2];
                                p.lastname = p.lastname.replace(",", "");
                                p.name = p.lastname + ', ' + p.firstname + ' ' + p.middlename;
                            }
                        }
                    
                        scope.newperson = p;

                        if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                            if (!elem.addString || elem.addString == "") {
                                scope.showResults = false;
                                scope.addStringLast = null;
                                scope.showLookup = false;
                            } else if (isNewSearchNeeded(elem.addString, scope.addStringLast, scope.minLength)) {
                                scope.addStringLast = elem.addString;
                                scope.showResults = true;
                                scope.results = [];

                                if (scope.addTimer) {
                                    $timeout.cancel(scope.addTimer);
                                }

                                scope.searching = true;

                                scope.addTimer = $timeout(function () {
                                    scope.timerAddComplete(elem.addString);
                                }, scope.pause);
                            }
                        } else {
                            event.preventDefault();
                        }
                    };

                    scope.processResults = function (responseData, str) {
                        scope.results = [];

                        if (responseData && responseData.length > 0) {
                            for (var i = 0; i < responseData.length; i++) {
                                scope.results.push(
                                    {
                                        htmlname: $sce.trustAsHtml(responseData[i].name),
                                        name: responseData[i].name.replace("<b>", "").replace("</b>", "").replace("<strong>", "").replace("</strong>", ""),
                                        id: responseData[i].id,
                                        imageUrl: responseData[i].imageUrlThumb,
                                        cssClass: (isIdInPeople(responseData[i].id)) ? 'list-group-item list-group-item-success' : 'list-group-item',
                                        sorter: responseData[i].sorter
                                    });
                            }

                        }
                    };

                    scope.getLGIClass = function (result) {
                        if (!result.hover) return result.lgiClass;
                        else return 'list-group-item list-group-item-info';
                    }

                    scope.resetHideResults = function (mode) {
                        if (scope.hideTimer) {
                            $timeout.cancel(scope.hideTimer);
                        };
                    };

                    scope.lookup = function (personId) {
                        //console.log(personId);
                        dataApi.getPerson(personId).then(function (data) {
                            scope.person = data;
                            scope.person.groups.forEach(function (org) {
                                org.jsStartDt = SQLDate2JS(org.startDt);
                                if (org.endDt != null) org.jsEndDt = SQLDate2JS(org.endDt);

                            })
                            scope.showLookup = true;
                            console.log(scope.person);
                        });
                    }
                    scope.closeLookup = function () {
                        scope.showLookup = false;
                    }

                    function isIdInPeople(id) {
                        var res = false;
                        for (var i = 0; i < scope.entity.people.length; i++){
                            if (scope.entity.people[i].id === id) {
                                res = true;
                                break;
                            }
                        }
                       // console.log(cls);
                        return res;
                        
                    }


                    function parseToPerson(name) {
                        var p = new shuri_person();
                        var names = name.split(" ");
                        var lastfirst = (name.indexOf(",") > 0);
                        var error = false;
                        if (names.length < 2) p.name = "Error Need at least a first and last name.";
                        else if (names.length > 3) p.name = "Error Unable to parse name, too many parts";
                        else {
                            if (names.length == 2) {
                                p.firstname = (lastfirst) ? names[1] : names[0];
                                p.lastname = (lastfirst) ? names[0] : names[1];
                                p.lastname = p.lastname.replace(",", "");
                                p.name = p.lastname + ', ' + p.firstname;
                            }
                            else {
                                p.firstname = (lastfirst) ? names[1] : names[0];
                                p.middlename = (lastfirst) ? names[2] : names[1];
                                p.lastname = (lastfirst) ? names[0] : names[2];
                                p.lastname = p.lastname.replace(",", "");
                                p.name = p.lastname + ', ' + p.firstname + ' ' + p.middlename;
                            }
                        }
                        return p;
                    }

                    scope.itemSelected = function (result) {
                        var contains = false;
                        for (var i = 0; i < scope.entity.people.length; i++) {
                            if (scope.entity.people[i].id == result.id) {
                                contains = true;
                                scope.entity.people[i].status = 'verified';
                                break;
                            }
                        }
                        if (!contains) {
                            var person = new shuri_person();
                            person.id = result.id;
                            person.name = result.name;
                            person.status = 'addnew';
                            scope.entity.people.push(person);
                            //console.log(scope.entity.people);
                            //scope.$apply();
                        }
                        scope.hideResults();
                        scope.newperson.firstname = scope.newperson.lastname = scope.newperson.middlename = scope.addString = scope.addStringLast = "";
                        document.getElementById("inputAdd").value = "";
                    };

                    function isNewSearchNeeded(newTerm, oldTerm, minLength) {
                        return newTerm.length >= minLength && newTerm != oldTerm;
                    }

                    scope.timerAddComplete = function (str) {
                        // Begin the search
                        if (str.length >= scope.minLength) {
                            //console.log(scope.dbId);
                            dataApi.getAutocompleteDB(SEnums("entitytypes", "person"), str, 10, scope.dbId)
                                .then(function (responseData, str) {
                                    scope.searching = false;
                                    scope.processResults(responseData, str);
                                });
                        }
                    };



                    scope.toggleAddInput = function () {
                        if (scope.allowAdd()) scope.addShow = !scope.addShow;
                    };

                     //#endregion


                    //#region Person Add & Verification
                    scope.addNew = function () {

                        var s = "";
                        if (scope.newperson.lastname == "" || scope.newperson.firstname == "") {
                            $window.alert("Please enter both a first and last name");
                        }
                        else {
                            var p = new shuri_person();
                            p.firstname = scope.newperson.firstname.trim().replace(' - ', '-');
                            p.lastname = scope.newperson.lastname.trim().replace(' - ', '-');
                            p.middlename = scope.newperson.middlename.trim().replace(' - ', '-');
                            p.changetype = shuri_enums.changetype.update;
                            p.status = "addnew";
                            if (p.firstname && p.firstname.length > 0 && p.firstname.substr(0, 1) != p.firstname.substr(0, 1).toUpperCase()) p.firstname = p.firstname.toProperCase();
                            if (p.lastname && p.lastname.length > 0 && p.lastname.substr(0, 1) != p.lastname.substr(0, 1).toUpperCase()) p.lastname = p.lastname.toProperCase();
                            if (p.middlename && p.middlename.length > 0 && p.middlename.substr(0, 1) != p.middlename.substr(0, 1).toUpperCase()) p.middlename = p.middlename.toProperCase();

                            p.name = (p.lastname + ', ' + p.firstname + ' ' + p.middlename).trim();
                            scope.entity.people.push(p);
                            scope.newperson.firstname = scope.newperson.lastname = scope.newperson.middlename = scope.addString = "";
                        }
                    }

                    scope.removePerson = function (person) {
                        for (var i = 0; i < scope.entity.people.length; i++) {
                            if (person.id == _guidEmpty ) {
                                if (scope.entity.people[i].name == person.name) {
                                    scope.entity.people.splice(i, 1);
                                    break;
                                }
                            }
                            else {
                                if (scope.entity.people[i].id == person.id) {
                                    person.status = 'deleted';
                                    person.changeType = shuri_enums.changetype.remove;
                                    break;
                                }
                            }
                        }

                     };

                    scope.resetPerson = function (person) {

                        for (var i = 0; i < scope.entity.people.length; i++) {
                            if (person.id == _guidEmpty || person.status == 'addnew') {
                                if (scope.entity.people[i].name == person.name) {
                                    scope.entity.people.splice(i, 1);
                                    break;
                                }
                            }
                            else {
                                if (scope.entity.people[i].id == person.id) {
                                    person.status = 'existing';
                                    person.changeType = shuri_enums.changetype.none;
                                    break;
                                }
                            }
                        }

                    }

                    scope.setOrderBy = function (orderBy) { scope.orderByField = orderBy; }
                    //#endregion

                    scope.deletePerson = function (person) {
                        if ($window.confirm("Permanently delete " + person.name + " from the database?  This is immediate and there is no un-do!")) {
                            dataApi.deleteEntity(person, shuri_enums.entitytypes.person).then(function (data) {
                                for (var i = 0; i < scope.entity.people.length; i++) {
                                    var p = scope.entity.people[i];
                                    if (p.id == person.id) {
                                        scope.entity.people.splice(i, 1);
                                        break;
                                    }
                                }
                            });
                        }
                    }
                }
            };
        }]);

})();