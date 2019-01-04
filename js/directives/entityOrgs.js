(function () {
    'use strict';

    angular.module("dizzy").directive('entityOrgs', ['$state', '$compile', '$timeout', '$window', 'globals', 'dataApi',
        function ($state, $compile, $timeout, $window, globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    dbId: '=',
                    deletable: '=',
                    forupdate: '@',
                    showavatar: '@'
                },
                templateUrl: "templates/directives/entityOrgs.html",
                link: function (scope, elem, attrs) {
                    scope.wordFor = function (word) { return globals.wordFor(word); };

                    var watcherP = scope.$watch('entity', function () {
                        if (scope.entity === undefined || scope.entity.groups === undefined) return;

                        for (var i = 0; i < scope.entity.groups.length; i++) {
                            if (scope.entity.groups[i].grpType == shuri_enums.grouptype.organization) {
                                scope.entity.groups[i].changeType = 0;
                                scope.entity.groups[i].jsStartDt = SQLDate2JS(scope.entity.groups[i].startDt);
                                scope.entity.groups[i].jsEndDt = null;
                                scope.entity.groups[i].tenureOver = false;
                                if (scope.entity.groups[i].endDt && scope.entity.groups[i].endDt != "") {
                                    scope.entity.groups[i].jsEndDt = SQLDate2JS(scope.entity.groups[i].endDt);
                                    scope.entity.groups[i].tenureOver = (new Date()) > scope.entity.groups[i].jsEndDt;
                                }
                                scope.entity.groups[i].sorter = scope.entity.groups[i].tenureOver.toString() + scope.entity.groups[i].name;
                                scope.entity.groups[i].openEdit = (!scope.entity.groups[i].title || scope.entity.groups[i].title == "")
                                //console.log(scope.entity.groups[i].sorter);
                            }
                        }
                        //console.log(scope.entity.groups);
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
                        if (scope.itemClasses && scope.showImageUrl && scope.itemClasses.indexOf("avatar") == -1) scope.itemClasses += " item-avatar-left ";
                        // delete watcher if appropriate
                        watcherS();
                    })

                     function GetInputByName(name) {
                        var inputs = elem.find('input');
                        for (var i = 0; i < inputs.length; i++) {
                            if (inputs[i].name == name) return inputs[i];
                        }
                     }
                     function DateTZO(date) {
                         var d = new Date()
                         var tzoffset = d.getTimezoneOffset() * 60000;
                         return (new Date(date - tzoffset).toISOString());;
                     }

                     scope.tenureUpdated = function (group, changeType) {
                         group.changeType = changeType;
                         //console.log(group);
                     }

                     scope.deleteAssociation = function (org) {
                         var msg = String.format("Confirm Delete - remove the association between {0} and {1}?", scope.entity.name, org.name);
                         if ($window.confirm(msg)) {
                             dataApi.deleteRelation(shuri_enums.entitytypes.person, scope.entity.id, shuri_enums.entitytypes.group, org.id).then(function (data) {
                                 for (var i = scope.entity.groups.length - 1; i >= 0; i--) {
                                     if (scope.entity.groups[i].id == org.id) {
                                         scope.entity.groups.splice(i, 1);
                                         break;
                                     }
                                 }

                             });
                         }
                     }

                     scope.dateUpdated = function (group, whichDt) {
                         group.changeType = 1;
                         if (whichDt == 0 && group.jsStartDt) group.startDt = DateTZO(group.jsStartDt);
                         else if (whichDt == 1 && group.jsEndDt) group.endDt = DateTZO(group.jsEndDt);
                         else if (whichDt == 1 && !group.jsEndDt) group.endDt = null;
                     }

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

                    scope.hideResults = function () {
                        scope.hideTimer = $timeout(function () {
                            scope.showResults = false;
                        }, scope.pause);
                    };

                    scope.addNew = function () {
                        var thegroup = new shuri_group();
                        thegroup.changeType = 1;
                        thegroup.name = scope.addString;
                        //make it a tenured group
                        thegroup.title = "";
                        thegroup.startDt = new Date();
                        thegroup.grpType = shuri_enums.grouptype.organization;
                        scope.entity.groups.push(thegroup);
                        scope.isdirty = true;
                        scope.addString = "";
                        console.log(scope.entity);
                    }

                    scope.keyPressedAdd = function (event, childscope) {
                        scope.addString = childscope.addString;
                        //console.log(scope.addString);
                        if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                            if (!scope.addString || scope.addString == "") {
                                scope.showResults = false;
                                scope.addStringLast = null;
                            } else if (isNewSearchNeeded(scope.addString, scope.addStringLast, scope.minLength)) {
                                scope.addStringLast = scope.addString;
                                scope.showResults = true;
                                scope.results = [];

                                if (scope.addTimer) {
                                    $timeout.cancel(scope.addTimer);
                                }

                                scope.searching = true;

                                scope.addTimer = $timeout(function () {
                                    scope.timerAddComplete(scope.addString);
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
                                        name: (responseData[i].name).trim().replace("<b>", "").replace("</b>", "").replace("<strong>", "").replace("</strong>", ""),
                                        id: responseData[i].id,
                                        imageUrl: responseData[i].imageUrl,
                                        sorter: responseData[i].sorter
                            });

                            }

                        }
                    };

                    scope.resetHideResults = function (mode) {
                        if (scope.hideTimer) {
                            $timeout.cancel(scope.hideTimer);
                        };
                    };

                    scope.selectAddResult = function (result) {
                        // console.log(result);
                        var contains = false;
                        for (var i = 0; i < scope.entity.groups.length; i++) {
                            if (scope.entity.groups[i].id == result.id) {
                                contains = true;
                                break;
                            }
                        }
                        if (!contains) {
                            var thegroup = new shuri_group();
                            thegroup.changeType = 1;
                            thegroup.id = result.id;
                            thegroup.name = result.name;
                            thegroup.title = "";
                            thegroup.startDt = new Date();
                            thegroup.grpType = shuri_enums.grouptype.organization;
                            scope.entity.groups.push(thegroup);
                            scope.isdirty = true;
                        }
                        console.log(scope.entity);
                        scope.addString = scope.addStringLast = "";

                    };

                    function isNewSearchNeeded(newTerm, oldTerm, minLength) {
                        return newTerm.length >= minLength && newTerm != oldTerm;
                    }

                    scope.timerAddComplete = function (str) {
                        // Begin the search
                        if (str.length >= scope.minLength) {
                            dataApi.getAutocompleteDB(shuri_enums.entitytypes.organization, str, 20, scope.dbId)
                                .then(function (responseData, str) {
                                    scope.searching = false;
                                    scope.processResults(responseData, str);
                                });
                        }
                    };

                    scope.toggleAddInput = function () {
                        if (scope.allowAdd()) scope.addShow = !scope.addShow;
                    };

                    var newDelete = true;
                    var entityGroupsClone = [];
                    scope.removeItem = function (item, index) {
                        item.changeType = 2;
                        if (newDelete === true) {
                            for (var i = 0; i < scope.entity.groups.length; i++) {
                                entityGroupsClone.push(scope.entity.groups[i]);
                            }
                            newDelete = false;
                            scope.entity.groupsClone = entityGroupsClone;
                        }
                        scope.entity.id == _guidEmpty ? scope.entity.groups.splice(index, 1) : scope.entity.groups.splice(index + 1, 1);
                        scope.isdirty = true;
                    };

                    //#endregion

                }
            };
        }]);

})();
