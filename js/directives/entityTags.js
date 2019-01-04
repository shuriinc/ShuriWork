(function () {
    'use strict';

    angular.module("dizzy").directive('entityTags', ['globals', 'dataApi',
        function (globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    entity: '=',
                    entitytype: '=',
                    databaseid: '=',
                    forupdate: '@'
                },
                templateUrl: "templates/directives/entityTags.html",
                link: function (scope, element, attrs) {
                    scope.wordFor = function (word) { return globals.wordFor(word); };
                    scope.forUpdate = false;
                    scope.isSmallWidth = globals.isSmallWidth;
                    scope.isMediumWidth = globals.isMediumWidth;
                    //console.log("loaded");
                    var watcherE = scope.$watch('entity', function () {
                        if (scope.entity === undefined) return;
                        loadTags();
                    })

                    var watcherD = scope.$watch('databaseid', function () {
                        if (scope.databaseid === undefined) return;
                        loadTags();
                    })

                    var watcherT = scope.$watch('entitytype', function () {
                        if (scope.entitytype === undefined) return;
                        loadTags();
                    })

                    var watcherU = scope.$watch('forupdate', function () {
                        if (scope.forupdate === undefined) return;

                        scope.isUpdate = (scope.forupdate == "true");
                        scope.editTags = scope.isUpdate;
                        // delete watcher if appropriate
                        watcherU();
                    })


                    function loadTags() {
                        //console.log(scope.entitytype, scope.entity, scope.databaseid);
                        if (scope.entitytype && scope.entity && scope.databaseid) {
                            //var subIds = [];
                            //for (var g = 0; g < scope.entity.groups.length; g++) {
                            //    var grp = scope.entity.groups[g];
                            //    if (grp.grpType == shuri_enums.grouptype.subscription) subIds.push(grp.id);
                            //}

                            var forPeople = false;
                            var forOrgs = false;
                            var forTouches = false;
                            var etype = 0;
                            switch (scope.entitytype.toLowerCase()) {
                                case "person":
                                    forPeople = true;
                                    etype = 4;
                                    break;
                                case "org":
                                case "organization":
                                    forOrgs = true;
                                    etype = 2;
                                    break;
                                case "touch":
                                    forTouches = true;
                                    etype = 6;
                                    break;

                            }
                            dataApi.getTagsForEntityAndDB(scope.databaseid, etype).then(function (data) {
                                scope.utTags = data;
                                //console.log(data);
                                //open all the Tab Types
                                //for (var u = 0; u < data.length; u++) {
                                //    var ut = data[u];
                                //    //console.log(ut, forPeople, forOrgs, forTouches);
                                //    if ((forPeople && ut.forPeople) || (forOrgs && ut.forOrgs) || (forTouches && ut.forTouches)) {
                                //        ut.showTags = true;
                                //        scope.utTags.push(ut);
                                //    }
                                //}

                                // syncTags
                                scope.utTags.forEach(function (ut) {
                                    ut.tags.forEach(function (tg) {
                                        tg.isTag = false;
                                        tg.cssClass = "";
                                        scope.entity.tags.forEach(function (eTag) {
                                            if (eTag.id == tg.id) {
                                                tg.isTag = true;
                                                tg.cssClass = "text-primary bold";
                                            }
                                        });
                                    });
                                })

                                //
                                //console.log(scope.utTags, scope.entity.tags);
                            });

                        }
                    }

                    scope.tagChange = function (tag) {
                        tag.changeType = 1;
                        if (!tag.isTag) tag.changeType = 2;
                        tag.cssClass = (tag.changeType == 1) ? "text-primary bold" : "";

                        //sync entity
                        var foundTag = false;
                        scope.entity.tags.forEach(function (eachTag) {
                            if (tag.id.toLowerCase() == eachTag.id.toLowerCase()) {
                                eachTag.changeType = tag.changeType;
                                foundTag = true;
                            }
                        });
                        if (!foundTag) scope.entity.tags.push(tag);
                        //console.log(scope.entity.tags, tag);
                    };

                    scope.toggleEdit = function () {
                        scope.editTags = !scope.editTags;
                    }

                    scope.tagClass = function (tag) {
                        var cls = "";
                        if (tag.isTag) cls += " text-primary bold";
                        return cls;
                    }

                    scope.removeTag = function (tag) {
                        for (var i = 0; i < scope.entity.tags.length; i++) {
                            if (tag.id == scope.entity.tags[i].id) {
                                scope.entity.tags.splice(i, 1);
                                //$scope.$apply();
                                globals.syncTags(scope.utTags, scope.entity.tags);
                                break;
                            }
                        }
                    };

                    //function syncTags(allTags, entityTags) {
                    //    for (var u = 0; u < allTags.length; u++) {
                    //        for (var t = 0; t < allTags[u].tags.length; t++) {
                    //            allTags[u].tags[t].isTag = false;
                    //            for (var i = 0; i < entityTags.length; i++) {
                    //                if (allTags[u].tags[t].id == entityTags[i].id) {
                    //                    allTags[u].tags[t].isTag = true;
                    //                    break;
                    //                }
                    //            }
                    //        }
                    //    }
                    //}


                    //#region Toggle
                    scope.closeTags = false;

                    //get from localStorage
                    if (localStorage.getItem("closeTags") == "true") scope.closeTags = true;

                    scope.toggleDiv = function (div) {
                        scope.closeTags = (!scope.closeTags);
                        localStorage.setItem("closeTags", scope.closeTags);
                    };
                    //#endregion


                }



            }
        }]);

})();