(function () {
    'use strict';

    angular.module("dizzy").directive('tagPicker', ['$rootScope', '$filter', '$q', '$timeout', '$window', 'globals', 'dataApi', tagPicker]);

    function tagPicker($rootScope, $filter, $q, $timeout, $window, globals, dataApi) {
        return {
            restrict: "E",
            scope: {
                databaseId: "=",
                documentId: '='
            },
            templateUrl: "templates/directives/tagPicker.html",
            link: function (scope, elem, attrs) {
                scope.isNarrow = (window.innerWidth <= globals.widthSmall);
                //#region Watchers & AssignUI

                var watcher1 = scope.$watch('documentId', function () {
                    if (typeof scope.documentId === "undefined") return;
                    scope.refreshData();
                });

                //#endregion
                scope.refreshData = function () {
                    if (scope.documentId) {
                        dataApi.getEntity('Document', scope.documentId).then(function (data) {
                            var doc = data;
                            scope.tags = doc.tags;
                        });
                    }

                }

                scope.resetSearch = function (reload) {
                    scope.showSearchResults = false;
                    scope.searcher.searchString = scope.addStringLast = "";
                }


                scope.toggle = function (persist) {
                    scope.isOpen = !scope.isOpen;
                    //console.log("toggled", scope.isAddMode);

                }

                scope.remove = function (event, entity) {
                    if (event) event.stopPropagation();

                    if (scope.documentId) {
                        //researchAssignment
                        dataApi.deleteRelation(5, entity.id, 1, scope.documentId).then(function (data) {
                            scope.refreshData();
                        });
                    }
                }

                scope.itemSelected = function (result) {
                    //console.log(result);
                    scope.showSearchResults = false;
                    scope.resetSearch();
                    if (scope.documentId) {
                        //researchAssignment
                        dataApi.addRelation(5, result.id, 1, scope.documentId).then(function (data) {
                            scope.refreshData();
                        });
                    }

                }

                //#region Autocomplete ------------------------------------------------
                scope.pause = 400;
                scope.minLength = 2;
                scope.searcher = { addString: "" };
                scope.addStringLast = null;
                scope.addTimer = null;
                scope.hideTimer = null;
                scope.searching = false;

                scope.keyPressedAdd = function (event, childscope) {
                    // console.log(event.which, scope.searcher.searchString);
                    scope.childscope = childscope;
                    if (!(event.which == 38 || event.which == 40 || event.which == 13)) {
                        if (!scope.searcher.searchString || scope.searcher.searchString == "") {
                            //user just cleared the search bar
                            scope.addStringLast = null;
                            scope.resetSearch();
                            if (scope.addTimer) $timeout.cancel(scope.addTimer);
                            scope.searching = false;
                        }
                        else if (isNewSearchNeeded(scope.searcher.searchString, scope.addStringLast, scope.minLength)) {
                            scope.addStringLast = scope.searcher.searchString;

                            if (scope.addTimer) {
                                $timeout.cancel(scope.addTimer);
                            }
                            scope.searching = true;

                            scope.addTimer = $timeout(function () {
                                scope.timerAddComplete(scope.searcher.searchString);
                            }, scope.pause);
                        }
                    } else {
                        event.preventDefault();
                    }
                };

                scope.resetHideResults = function (mode) {
                    if (scope.hideTimer) {
                        $timeout.cancel(scope.hideTimer);
                    };
                };

                scope.hideResults = function () {
                    scope.hideTimer = $timeout(function () {
                        scope.resetSearch(true);
                        //console.log("hideResults");
                    }, scope.pause);
                };

                scope.timerAddComplete = function (str) {
                    if (str.length >= scope.minLength) {
                        //console.log(scope.databaseId);
                        dataApi.getAutocompleteByEntity(shuri_enums.entitytypes.tag, str, 10, shuri_enums.entitytypes.tag ).then(function (data) {
                            scope.results = $filter("filter")(data, function (d) { return d.id != globals.guids.utLooseTags; });
                            scope.searching = false;
                            scope.showSearchResults = true;
                        });
                    }
                    else if (str.length == 0) {
                        scope.resetSearch(true);
                    }

                };

                function isNewSearchNeeded(newTerm, oldTerm, minLength) {
                    return newTerm.length >= minLength && newTerm != oldTerm;
                }

                //#endregion

            }
        };
    }

})();
