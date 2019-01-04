(function () {
    'use strict';
    angular.module("dizzy").controller('ResearchAssignmentCtrl', function ($rootScope, $sce, $scope, $state, $stateParams, $timeout, $window, $q, globals, dataApi) {
        var vm = this;
        vm.isSmallWidth = globals.isSmallWidth;
        vm.guidEmpty = globals.guids.guidEmpty;
        vm.arMedia = globals.guids.arMedia;
        vm.newperson = new shuri_person();
        vm.newtag = new shuri_tag();

        vm.refreshData = function (showSpinner) {
            vm.showWork = !showSpinner;
            var workitem = { subId: globals.guids.empty, workType: "ResearchAssignment" };
            dataApi.setDatabaseIds(workitem).then(function () {
                $q.all({
                    dOrg: dataApi.getOrg($stateParams.entityId),
                    dTouch: dataApi.getTouch($stateParams.touchId, globals.guids.arDB, true, true),
                    dUTsTags: dataApi.getAllTags(globals.guids.arMedia)
                }).then(function (d) {
                    vm.org = d.dOrg;
                    vm.touch = d.dTouch;
                    var theDoc = null;


                    vm.touch.documents.forEach(function (dc) {
                        if (dc.userType_Id === globals.guids.utResearchAssignment) theDoc = dc;
                    });

                    vm.isNotResearch = (vm.touch.location_Id === globals.guids.system);
                    //console.log(globals.guids.system, vm.touch.location_Id);

                    if (theDoc == null) {
                        globals.showAlert("No research doc found", "Contact support");
                        vm.showWork = true;
                    }
                    else {
                        //get the fully hydrated doc
                        dataApi.getEntity('Document', theDoc.id).then(function (data) {
                            vm.doc = data;
                            vm.doc.collection_Id = globals.guids.arDB;
                            vm.rssUrl = $sce.trustAsResourceUrl(vm.doc.name);
                            vm.rssItem = angular.fromJson(vm.doc.value);
                            vm.rssItem.linkname = vm.rssItem.link;
                            if (vm.isSmallWidth && vm.rssItem.linkname.length > 40) vm.rssItem.linkname = vm.rssItem.link.substring(0, 35) + '...';
                            else if (globals.isMediumWidth && vm.rssItem.linkname.length > 60) vm.rssItem.linkname = vm.rssItem.link.substring(0, 55) + '...';
                            vm.date = moment(new Date(vm.rssItem.date)).format('ll');
                            vm.description = $sce.trustAsHtml(vm.rssItem.description);
                            vm.showWork = true;
                            //console.log(vm.doc.id);
                        });
                    }


                    vm.uts = [];
                    //var utChoose = new shuri_userType();
                    //utChoose.name = "(choose Tag Set...)";
                    //vm.uts.push(utChoose);
                    d.dUTsTags.forEach(function (ut) {
                        if (!ArrayContainsById(vm.uts, ut.id)) vm.uts.push(ut);
                    });

                    vm.newtag.userType_Id = vm.uts[0].id;


                    //console.log(vm.newtag.userType_Id, utChoose.id);
                });

            });
        }

        vm.addNew = function (entityType) {
            switch (entityType) {
                case 4:
                    //person
                    vm.newperson.changeType = 1;
                    vm.newperson.collection_Id = globals.guids.arDB;
                    vm.org.changeType = 1;
                    if (!vm.newperson.groups) vm.newperson.groups = [vm.org];
                    else vm.newperson.groups.push(vm.org);
                    //console.log(vm.newperson, globals.guids.arDB);
                    dataApi.postEntity("People", "person", vm.newperson, globals.guids.arDB).then(function (data) {
                        vm.newperson = new shuri_person();
                        vm.openAddPerson = false;
                        if (vm.doc.id) {
                            dataApi.addRelation(4, data, 1, vm.doc.id).then(function (data) {
                                vm.refreshData(true);
                            });
                        }
                    });
                    break;
                case 5:
                    //tag
                    vm.newtag.changeType = 1;
                    vm.newtag.collection_Id = globals.guids.arMedia;
                    //console.log(vm.newtag, globals.guids.arDB);
                    dataApi.postEntity("Tags", "tag", vm.newtag, globals.guids.arMedia).then(function (data) {
                        vm.newtag = new shuri_tag();
                        vm.openAddTag = false;
                        if (vm.doc.id) {
                            dataApi.addRelation(5, data, 1, vm.doc.id).then(function () {
                                vm.refreshData(true);
                            });
                        }
                    });
                    break;
            }
        }

        vm.notResearch = function () {
            vm.isNotResearch = !vm.isNotResearch;
            if (vm.isNotResearch) vm.touch.location_Id = globals.guids.system;
            else vm.touch.location_Id = globals.guids.guidEmpty;

            dataApi.updateTouchLocation(vm.touch.id, vm.touch.location_Id);

            
        }

        vm.openUrl = function (url) {
            var win = $window.open(url, 'workWindow');
        }

        //$rootScope.$on('AssociatePersonToDoc', function (event, personId, docId) {
        //    if (vm.doc && docId === vm.doc.id) {
        //        $q.all(
        //            dataApi.addRelation(4, personId, 1, docId),
        //            dataApi.addRelation(4, personId, 6, vm.touch.id),
        //        ).then(function (data) {
        //            console.log(personId, docId);
        //            vm.refreshData(false);
        //        });
        //    }
        //});

 
        if (!($stateParams.entityId) || !($stateParams.touchId) || $stateParams.entityId == "" || $stateParams.touchId == "") globals.showAlert("Error", "Error - Missing Ids");
        else {
            vm.refreshData(true);
        }

    });

})();
