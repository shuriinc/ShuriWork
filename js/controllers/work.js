(function () {
    'use strict';

    angular.module("dizzy").controller('WorkMasterCtrl', ['$scope', '$window', 'globals', 'dataApi', WorkMasterCtrl]);

    function WorkMasterCtrl($scope, $window, globals, dataApi) {
        var vmMaster = this;

        vmMaster.wordFor = function (word) { return globals.wordFor(word); };

    }

    angular.module("dizzy").controller('WorkQueueCtrl', ['$scope', '$state', '$stateParams', '$window', '$timeout', 'globals', 'dataApi', WorkQueueCtrl]);

    function WorkQueueCtrl($scope, $state, $stateParams, $window, $timeout, globals, dataApi) {
        var vm = this;
        vm.isSmallWidth = globals.isSmallWidth;
        vm.placeholderAdd = "OrgAdd";
        vm.workerOrgAddRate = 0;
        vm.guidEmpty = _guidEmpty;
        vm.siteName = _siteName;
        document.title = "Work Queue";

        if (localStorage.getItem("workcont")) vm.workcont = true;

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.workOn = function (item, reviewType) {
            //console.log(item);

            if (item.name.indexOf("ResearchAssignment") > -1) item.subId = globals.guids.arMedia;
            //special case:  rejected OrgAdds
            if (reviewType == 0 && item.touch.typename == "OrgAdd" && item.workerProcessStatus == shuri_enums.workerprocessstatus.rejected) globals.showAlert("OrgAdd", "Sorry, OrgAdds may not be edited, only reviewed.");
            else {
                //prevent continuous
                if (localStorage.getItem("workcont")) {
                    localStorage.removeItem("workcont");
                    vm.workcont = false;
                }


                dataApi.checkoutWorkItem(item.touch.id, item.touch.typename, reviewType).then(
                    function (data) {
                        //console.log(data);
                        vm.workQueueItem = data;
                        if (vm.workQueueItem.touch.id == _guidEmpty) globals.showAlert("Unable to checkout item", "An error occurred");
                        else {
                            //console.log(item);
                            dataApi.setDatabaseIds(vm.workQueueItem);
                            var newstate = "master." + vm.workQueueItem.workType;
                            $state.go(newstate, {
                                subId: item.subId, touchId: vm.workQueueItem.touch.id, entityId: vm.workQueueItem.entityId, entityType: vm.workQueueItem.entityType, reviewType: reviewType
                            });
                        }
                    },
                    function (data) { console.log('error'); });
            }
        };

        vm.getNext = function (item, reviewType) {
           // console.log(item);
            var workerId = _guidEmpty;
            if (reviewType > 0) workerId = item.workerId;
            if (item.name.indexOf("ResearchAssignment") > -1) item.subId = globals.guids.arDB;

            dataApi.checkoutWorkItem(_guidEmpty, item.name, reviewType, workerId).then(
                function (data) {
                    vm.workQueueItem = data;
                    if (vm.workQueueItem.touch.id == _guidEmpty) globals.showAlert("Unable to checkout item", "An error occurred");
                    else {
                        dataApi.setDatabaseIds(item);
                        var newstate = "master." + vm.workQueueItem.workType;
                        $state.go(newstate, {
                            subId: item.subId, touchId: vm.workQueueItem.touch.id, entityId: vm.workQueueItem.entityId,
                            entityType: vm.workQueueItem.entityType, reviewType: reviewType, workerId: workerId
                        });
                    }
                },
                function (data) { console.log('error'); });
        };

        function setDBs(workitem) {

        }

        vm.payMeNow = function () {
            vm.isPaying = true;
            dataApi.payMeNow().then(function (data) {
                vm.isPaying = false;
                $window.alert(data);
                vm.refreshEarnings();
            }
                //errored
                , function (data) {
                    $window.alert("Error Occurred. " + data);
                    vm.isPaying = false;

                });

        }

        vm.refreshQueue = function () {
            vm.showWork = false;
            dataApi.resetWorkQueue();
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                //console.log(vm.appUser);
                if (!vm.appUser.isUser) {
                    globals.showAlert("Unauthenticated", "You must login to access this page.  Please contact Support.");
                }
                else if (vm.appUser.isWorker || vm.appUser.isReviewer) {

                    dataApi.getWorkQueue().then(function (data) {
                        vm.theQ = data;
                        //console.log(data);
                        assignUI();
                        vm.showWork = true;

                        if (vm.workerOrgAddRate == 0) {
                            //try to find the rate
                            for (var i = 0; i < vm.theQ.workTypes.length; i++) {
                                //console.log(vm.theQ.workTypes[i].typeName)
                                if (vm.theQ.workTypes[i].typeName == "OrgAdd") {
                                    vm.workerOrgAddRate = vm.theQ.workTypes[i].workerRates.worker;
                                    vm.placeholderAdd = String.format("{0}  (${1:0.00})", "OrgAdd", vm.workerOrgAddRate);
                                    break;
                                }
                            }

                            if (vm.workerOrgAddRate == 0) {
                                for (var i = 0; i < vm.theQ.workItems.length; i++) {
                                    //console.log(vm.theQ.workTypes[i].typeName)
                                    if (vm.theQ.workItems[i].touch.typename == "OrgAdd") {
                                        vm.workerOrgAddRate = vm.theQ.workItems[i].workerRates.worker;
                                        vm.placeholderAdd = String.format("{0}  (${1:0.00})", "OrgAdd", vm.workerOrgAddRate);
                                        break;
                                    }
                                }

                            }
                        }
                        //console.log(vm.theQ.workTypes);
                        //calc the QueueSummary

                        vm.uiItemSummary = [];
                        for (var i = 0; i < vm.theQ.workTypes.length; i++) {
                            var item = vm.theQ.workTypes[i];
                            var idx = ItemSummAt(item);
                            if (idx == -1) {
                                vm.uiItemSummary.push(item);
                            }
                            else {
                                vm.uiItemSummary[idx].count += item.count;
                            }
                        }

                        dataApi.getWorkerPaySummary().then(function (data) {
                            vm.earnings = data;
                        });

                    });
                }
                else vm.showWork = true;
            });
        }

        var ItemSummAt = function (item) {
            var result = -1;
            for (var i = 0; i < vm.uiItemSummary.length; i++) {
                if (vm.uiItemSummary[i].typeName == item.typeName && vm.uiItemSummary[i].reviewType == item.reviewType) {
                    result = i;
                    break;
                }
            }

            return result;
        }

        vm.refreshEarnings = function () {
            dataApi.clearCacheItem("workerPaySummary");
            vm.refreshQueue();
        }
        vm.viewQueueDetail = function (typename, reviewType, subId) {
            $state.go("master.workdetail", { typeName: typename, reviewType: reviewType, subId: subId });
        }

        vm.toggleWorkCont = function () {
            if (vm.workcont) localStorage.setItem("workcont", "true");
            else localStorage.removeItem("workcont");
        }
        //vm.createWorkTask = function () {
        //    if (vm.taskname.name != "Choose")
        //    {
        //        dataApi.createWorkTask(_guidEmpty, _guidEmpty, vm.taskname.name).then(function (data) {
        //            globals.showAlert(vm.taskname.name, "Created OK");
        //            vm.taskname = vm.tasknames[0];

        //            vm.refreshQueue();
        //        });
        //    }
        //}
        function assignUI() {
            vm.uiItems = [];
            var sect = "";
            var reward = 0;
            document.title = "Workers Home";

            //assign to one of 6 sections:  workerWork, workerPendRej,  ... 
            vm.pendingwork = false; vm.pendingreview = false; vm.readywork = false; vm.readyreview = false; vm.pendingexpert = false; vm.readyexpert = false;

            for (var i = 0; i < vm.theQ.workTypes.length; i++) {
                sect = "readywork";
                switch (vm.theQ.workTypes[i].reviewType) {
                    case shuri_enums.reviewtype.none:
                        sect = "readywork";
                        reward = vm.theQ.workTypes[i].workerRates.worker;
                        vm.readywork = true;
                        break;
                    case shuri_enums.reviewtype.regular:
                        sect = "readyreview";
                        reward = vm.theQ.workTypes[i].workerRates.reviewer;
                        vm.readyreview = true;
                        break;
                    case shuri_enums.reviewtype.expert:
                        sect = "readyexpert";
                        reward = 'n/a';
                        vm.readyexpert = true;
                        break;
                }


                var uiItem = {
                    name: vm.theQ.workTypes[i].typeName, subId: vm.theQ.workTypes[i].subId, subname: '',
                    count: vm.theQ.workTypes[i].count, reward: reward, section: sect,
                    workerId: vm.theQ.workTypes[i].workerId, workerName: vm.theQ.workTypes[i].workerName
                };
                vm.uiItems.push(uiItem);
            }

            //console.log(vm.theQ.workTypes);

            for (var i = 0; i < vm.theQ.workItems.length; i++) {
                var item = vm.theQ.workItems[i];
                switch (item.workerProcessStatus) {
                    case shuri_enums.workerprocessstatus.rejected:
                        if (vm.appUser.id == item.touch.createdBy_Id) {
                            vm.uiItems.push({ name: "Rejected: " + item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.worker, section: "pendingwork", touch: item.touch });
                            vm.pendingwork = true;
                        }
                        else if (vm.appUser.id == item.touch.modifiedBy_Id) {
                            vm.uiItems.push({ name: "Rejected: " + item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.reviewer, section: "historyreview", touch: item.touch });
                            vm.historyreview = true;
                        }
                        break;
                    case shuri_enums.workerprocessstatus.rejectedreview:
                        if (vm.appUser.id == item.touch.modifiedBy_Id) {
                            vm.uiItems.push({ name: "Rejected: " + item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.reviewer, section: "pendingreview", touch: item.touch });
                            vm.pendingreview = true;
                        }
                        else if (vm.appUser.id == item.touch.ownedBy_Id) {
                            vm.uiItems.push({ name: "Rejected: " + item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: 0, section: "historyexpert", touch: item.touch });
                            vm.historyexpert = true;
                        }
                        break;
                    case shuri_enums.workerprocessstatus.inwork:
                        if (vm.appUser.id == item.touch.createdBy_Id || item.touch.createdBy_Id == _guidEmpty) {
                            vm.uiItems.push({ name: item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.worker, section: "pendingwork", touch: item.touch });
                            vm.pendingwork = true;
                        }
                        break;
                    case shuri_enums.workerprocessstatus.inreview:
                        if (vm.appUser.id == item.touch.modifiedBy_Id || item.touch.modifiedBy_Id == _guidEmpty) {
                            vm.uiItems.push({ name: item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.reviewer, section: "pendingreview", touch: item.touch });
                            vm.pendingreview = true;
                        }
                        break;
                    case shuri_enums.workerprocessstatus.inexpert:
                        vm.uiItems.push({ name: item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: 'n/a', section: "pendingexpert", touch: item.touch });
                        vm.pendingexpert = true;
                        break;

                    //should not get approved or paid 
                    //case shuri_enums.workerprocessstatus.approved:
                    //    if (vm.appUser.id == item.touch.createdBy_Id) {
                    //        vm.uiItems.push({ name: item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.worker, section: "historywork", touch: item.touch });
                    //        vm.historywork = true;
                    //        vm.workhistcount++;
                    //    }
                    //    if (vm.appUser.id == item.touch.modifiedBy_Id) {
                    //        vm.uiItems.push({ name: item.touch.typename, subId: item.subId, subname: item.entityName, count: 1, reward: item.workerRates.reviewer, section: "historyreview", touch: item.touch });
                    //        vm.historyreview = true;
                    //        vm.reviewhistcount++;
                    //    }
                    //    break;
                }
            }
            //console.log(vm.uiItems);

            vm.hasWork = (vm.pendingwork || vm.readywork || vm.historywork);
            vm.hasReview = (vm.pendingreview || vm.readyreview || vm.historyreview);

            //vm.colPendingwork = 'col-xs-6';
            //vm.colReadywork = 'col-xs-6';
            //vm.colHistorywork = 'col-xs-4';
            //vm.colPendingreview = 'col-xs-6';
            //vm.colReadyreview = 'col-xs-6';
            //vm.colHistoryreview = 'col-xs-6';

            //vm.colPendingexpert = 'col-xs-6';
            //vm.colReadyexpert = 'col-xs-6';

            //if (vm.hasWork) {
            //    if (!vm.pendingwork) {
            //        vm.colReadywork = 'col-xs-6';
            //        vm.colHistorywork = 'col-xs-6';
            //    }
            //    else if (!vm.historywork) {
            //        vm.colPendingwork = 'col-xs-6';
            //        vm.colReadywork = 'col-xs-6';
            //    }
            //}
            //if (vm.hasReview) {
            //    if (!vm.pendingreview) {
            //        vm.colReadyreview = 'col-xs-6';
            //        vm.colHistoryreview = 'col-xs-6';
            //    }
            //    else if (!vm.historyreview) {
            //        vm.colPendingreview = 'col-xs-6';
            //        vm.colReadyreview = 'col-xs-6';
            //    }
            //}

        }

        //#region OrgAdd

        //vm.orgadd = function () {
        //    if (!vm.orgAddName || vm.orgAddName == "") {
        //        globals.showAlert("Nothing Entered", "Please enter the name of a new organization to add.");

        //    }
        //    else {
        //        vm.sub = vm.queues[0];  //AR hard coded
        //        if (confirm("Add " + vm.orgAddName + " as a new organization in the " + vm.sub.name + " collection?"))
        //        {
        //             dataApi.editOrgAdd(vm.orgAddName, vm.sub.id).then(function (data) {
        //                vm.orgAddName = "";
        //                globals.showAlert('Thank You!', 'Your new org has been submitted for review.');
        //                vm.refreshQueue();
        //            });
        //        }
        //    }

        //};


        //#endregion

        //#region Toggle
        vm.editHistoryOpen = false;
        vm.revHistoryOpen = false;

        //get from localStorage
        if (localStorage.getItem("editHistoryOpen") == "true") vm.editHistoryOpen = true;
        if (localStorage.getItem("revHistoryOpen") == "true") vm.revHistoryOpen = true;

        vm.toggleDiv = function (divName) {
            switch (divName) {
                case "edit":
                    vm.editHistoryOpen = !vm.editHistoryOpen;
                    localStorage.setItem("editHistoryOpen", vm.editHistoryOpen);
                    break;
                case "rev":
                    vm.revHistoryOpen = !vm.revHistoryOpen;
                    localStorage.setItem("revHistoryOpen", vm.revHistoryOpen);
                    break;
            }
        };
        //#endregion

        vm.tasknames = [{ name: "Choose" }, { name: "AddPeopleToOrg" }, { name: "OrgDedupe" }, { name: "OrgUpdate" }, { name: "PersonDedupe" }, { name: "PersonUpdate" }];
        vm.taskname = vm.tasknames[0];


        vm.refreshQueue();


    }


    angular.module("dizzy").controller('WorkQueueDetailCtrl', ['$scope', '$state', '$stateParams', '$window', '$timeout', 'globals', 'dataApi', WorkQueueDetailCtrl]);

    function WorkQueueDetailCtrl($scope, $state, $stateParams, $window, $timeout, globals, dataApi) {
        var vm = this;
        vm.guidEmpty = _guidEmpty;
        vm.isSmallWidth = globals.isSmallWidth;

        vm.wordFor = function (word) { return globals.wordFor(word); };

        if (!$stateParams.typeName || !$stateParams.reviewType || !$stateParams.subId) globals.showAlert("Error", "Missing stateParams - contact your developer.");
        else {
            vm.typeName = $stateParams.typeName;
            vm.reviewType = $stateParams.reviewType;
            vm.subId = $stateParams.subId;
        }

        vm.workOn = function (item) {
            var reviewType = $stateParams.reviewType;
            //console.log(item);
            if (reviewType == 0 && item.typeName == "OrgAdd" && item.workerProcessStatus == shuri_enums.workerprocessstatus.rejected) globals.showAlert("OrgAdd", "Sorry, OrgAdds may not be edited, only reviewed.");
            else {
                //prevent continuous
                if (localStorage.getItem("workcont")) {
                    localStorage.removeItem("workcont");
                    vm.workcont = false;
                }


                dataApi.checkoutWorkItem(item.id, vm.typeName, vm.reviewType).then(
                    function (data) {
                        //console.log(data);
                        vm.workQueueItem = data;
                        if (vm.workQueueItem.touch.id == _guidEmpty) globals.showAlert("Unable to checkout item", "An error occurred");
                        else {
                            dataApi.setDatabaseIds(vm.workQueueItem);
                            var newstate = "master." + vm.workQueueItem.workType;
                            $state.go(newstate, {
                                subId: $stateParams.subId, touchId: vm.workQueueItem.touch.id, entityId: vm.workQueueItem.entityId, entityType: vm.workQueueItem.entityType, reviewType: reviewType
                            });
                        }
                    },
                    function (data) { console.log('error'); });
            }
        };

        vm.refreshData = function () {
            vm.showWork = false;
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                //console.log(vm.appUser);
                if (!vm.appUser.isReviewer) {
                    globals.showAlert("Unauthenticated", "You must login to access this page.  Please contact Support.");
                }
                else {
                    dataApi.getWorkQueueDetail($stateParams.typeName, $stateParams.reviewType).then(function (data) {
                        vm.touches = data;
                        console.log(data);
                        vm.showWork = true;

                    });
                }
            });
        }

        vm.refreshData();


    }

    angular.module("dizzy").controller('OrgAddCtrl', ['$scope', '$state', '$stateParams', '$window', 'globals', 'dataApi', OrgAddCtrl]);

    function OrgAddCtrl($scope, $state, $stateParams, $window, globals, dataApi) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };


        if (!($stateParams.entityId) || !($stateParams.touchId) || !($stateParams.subId) || $stateParams.entityId == "" || $stateParams.touchId == "" || $stateParams.subId == "") globals.showAlert("Error", "Error - Missing Ids");
        else {
            vm.subId = $stateParams.subId;
            dataApi.getOrg($stateParams.entityId)
                .then(function (data) {
                    vm.org = data;
                    //console.log(vm.org.people);
                },
                function (data) { console.log('error'); });
        }


    }

    //#region AddPeopleToOrgCtrl
    angular.module("dizzy").controller('AddPeopleToOrgCtrl', ['$scope', '$state', '$stateParams', '$timeout', '$window', 'globals', 'dataApi', AddPeopleToOrgCtrl]);

    function AddPeopleToOrgCtrl($scope, $state, $stateParams, $timeout, $window, globals, dataApi) {
        var vm = this;
        vm.showSpinner = true;
        vm.spinnerText = "Loading";
        vm.isTechInvest = ($state.current.name.toLowerCase().indexOf("-ti") > 0);


        //#region Init & Get Org
        if (!($stateParams.entityId) || !($stateParams.touchId) || !($stateParams.subId) || $stateParams.entityId == "" || $stateParams.touchId == "" || $stateParams.subId == "") globals.showAlert("Error", "Error - Missing Ids");
        else {

            vm.dbId = $stateParams.subId;
            if ($stateParams.reviewType) {
                vm.reviewType = $stateParams.reviewType;
            }
            //dataApi.getOrg('8B6CF200-3887-46F0-A83A-4B8733A91322')
            //console.log($stateParams.entityId, vm.dbId);
            dataApi.getOrgForWorker($stateParams.entityId, vm.dbId)
                .then(function (data) {
                    vm.org = data;
                    //console.log(vm.org.people);
                    //fix people names for entityPeople
                    vm.showSpinner = false;
                    for (var i = 0; i < vm.org.people.length; i++) {
                        var p = vm.org.people[i];
                        p.name = String.format("{0}, {1} {2}", p.lastname, p.firstname, p.middlename);
                    }

                    //search for Employee List Url
                    dataApi.getUTConstants().then(function (data) {
                        var utConstants = data;
                        //console.log(utConstants);
                        for (var i = 0; i < vm.org.contactPoints.length; i++) {
                            var cp = vm.org.contactPoints[i];
                            if (cp.userType_Id == utConstants.cp_employeeUrl) {
                                vm.org.employeeUrl = cp.name;
                                break;
                            }
                        }
                    });

                });
        }


        //#endregion

        vm.showBrowser = function () {
            var url = "https://www.google.com/#q=employee+list+" + encodeURIComponent(vm.org.name);

            //look for employee url in CPs
            dataApi.getUTConstants().then(function (data) {
                var utConstants = data;
                //CPs
                for (var i = 0; i < vm.org.contactPoints.length; i++) {
                    var cp = vm.org.contactPoints[i];
                    if (cp.userType_Id == utConstants.cp_employeeUrl && cp.name != "") {
                        url = cp.name;
                        break;
                    }
                }

                var win = window.open(url, 'workWindow');


            });

        }

        vm.saveOnly = function () {

            dataApi.postWork(vm.org, $stateParams.subId, $stateParams.entityType, $stateParams.entityId, $stateParams.touchId, vm.reviewType, 0, "", false, true).then(function (data) {
                $state.go("master.work");
            });

        }


    }
    //#endregion

    angular.module("dizzy").controller('DedupeCtrl', ['$scope', '$state', '$stateParams', '$window', 'globals', 'dataApi', DedupeCtrl]);

    function DedupeCtrl($scope, $state, $stateParams, $window, globals, dataApi) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.noRecs = 20;
        //console.log($state);


        if (!($stateParams.entityId) || !($stateParams.touchId) || !($stateParams.subId) || $stateParams.entityId == "" || $stateParams.entityType == "" || $stateParams.touchId == "" || $stateParams.subId == "") globals.showAlert("Error", "Error - Missing Ids");
        else {
            vm.subId = $stateParams.subId;
            if ($stateParams.reviewType) {
                vm.reviewType = $stateParams.reviewType;
            }

            dataApi.getDedupesForEntity($stateParams.entityId, $stateParams.entityType, vm.noRecs)
                .then(function (data) {
                    vm.dupes = data;
                    console.log(data);
                    vm.dupes.push({ name: '{ NONE of the above }', id: _guidEmpty });
                    if ($stateParams.entityType == SEnums('entitytypes', 'group')) {
                        dataApi.getOrg($stateParams.entityId)
                            .then(function (data) {
                                vm.entity = data;
                                vm.isPerson = false;
                                assignUI();
                            });
                    }
                    else if ($stateParams.entityType == SEnums('entitytypes', 'person')) {
                        dataApi.getPerson($stateParams.entityId)
                            .then(function (data) {
                                vm.entity = data;
                                vm.isPerson = true;
                                assignUI();
                            });
                    }
                    else globals.showAlert("Invalid EntityType", $stateParams.entityType);
                });
        }


        vm.liClass = function (dupe) {
            //console.log(String.format("dupe.id: {0}  vm.dupeId: {1}", dupe.id, vm.dupeId));

            var cls = "list-group-item list-group-item-warning";
            if (dupe.id == vm.dupeId) cls = 'list-group-item list-group-item-info ';
            else if (dupe.name.substring(0, 1) == "{" && vm.reviewType == shuri_enums.reviewtype.none) cls = 'list-group-item list-group-item-danger ';
            return cls;

        }

        vm.answer = function (id) {
            if (vm.reviewType == shuri_enums.reviewtype.none) vm.dupeId = id;
        }

        vm.showBrowser = function (url) {
            var win = window.open(url, 'workWindow');
        }

        function assignUI() {
            //reviewer sees the worker's answer, but cannot change it, only approve or reject
            if (vm.reviewType != shuri_enums.reviewtype.none) {
                //get the worker's answer from touch's location_Id
                dataApi.getWorkTouch($stateParams.touchId).then(function (data) {
                    vm.touch = data;
                    vm.dupeId = vm.touch.location_Id;
                    //console.log(vm.touch);
                    if (vm.dupeId == _guidEmpty) vm.answerText = 'None of the above.';
                    else {
                        vm.answer = 'Invalid touch.location_Id';
                        for (var i = 0; i < vm.dupes.length; i++) {
                            if (vm.dupes[i].id == vm.dupeId) {
                                vm.answerText = vm.dupes[i].name;
                                break;
                            }
                        }
                    }

                })
            }


            dataApi.getUTConstants().then(function (data) {
                var utConstants = data;
                //CPs
                for (var i = 0; i < vm.entity.contactPoints.length; i++) {
                    var cp = vm.entity.contactPoints[i];
                    if (cp.userType_Id == utConstants.cp_homePageUrl) { vm.entity.searchUrl = cp.name; break; }
                    else if (cp.userType_Id == utConstants.cp_twitterUsername) { vm.entity.searchUrl; }

                }

            });
            vm.showWork = true;

            //console.log(scope.entity.documents);

        }

    }

    angular.module("dizzy").controller('TwNameCatCtrl', ['$scope', '$state', '$stateParams', '$window', 'globals', 'dataApi', TwNameCatCtrl]);

    function TwNameCatCtrl($scope, $state, $stateParams, $window, globals, dataApi) {
        var vm = this;
        vm.wordFor = function (word) { return globals.wordFor(word); };
        vm.noRecs = 20;
        //console.log($state);

        dataApi.getWorkTouch($stateParams.touchId)
            .then(function (data) {
                vm.touch = data;

                //find the subject entity
                if (vm.touch.people.length == 1) {
                    vm.entityPartial = vm.touch.people[0];
                    vm.entityType = SEnums('entitytypes', 'person');
                }
                else {
                    for (var i = 0; i < vm.touch.groups.length; i++) {
                        if (vm.touch.groups[i].grpType == SEnums('grouptype', 'organization')) {
                            vm.entityPartial = vm.touch.groups[i];
                            vm.entityType = SEnums('entitytypes', 'group');
                            break;
                        }
                    }
                }

                console.log(data);

                if (vm.entityPartial) {
                    //get the full entity
                    if (vm.entityType == SEnums('entitytypes', 'person')) {
                        vm.isPerson = true;
                        dataApi.getPerson(vm.entityPartial.id).then(function (data) {
                            vm.entity = data;
                            assignUI();
                        });
                    }
                    else if (vm.entityType == SEnums('entitytypes', 'group')) {
                        vm.isPerson = false;
                        dataApi.getOrg(vm.entityPartial.id).then(function (data) {
                            vm.entity = data;
                            assignUI();
                        });
                    }
                }
            });


        vm.showBrowser = function (sn) {
            var url = 'https://twitter.com/' + sn;
            var win = window.open(url, 'workWindow');
        }

        function assignUI() {
            dataApi.getUTConstants().then(function (data) {
                var utConstants = data;
                //CPs
                for (var i = 0; i < vm.entity.contactPoints.length; i++) {
                    var cp = vm.entity.contactPoints[i];
                    var itype = 'text';
                    var sect = 'known';

                    var url = "";
                    var listener;
                    if (cp.userType_Id == utConstants.cp_twitterUsername) { vm.entity.screenname = cp.name; }
                    else if (cp.userType_Id == utConstants.cp_websiteTwitter) { vm.entity.twitterWebUrl = cp.name; }

                }

                //Docs
                for (var d = 0; d < vm.entity.documents.length; d++) {
                    var doc = vm.entity.documents[d];

                    if (doc.userType_Id == utConstants.doc_bioTwitter) { vm.entity.twitterBio = doc.value; }
                    else if (doc.userType_Id == utConstants.doc_twitterFollowers) { vm.entity.followers = doc.value; }
                    else if (doc.userType_Id == utConstants.doc_twitterAvatar) { vm.entity.twitterImageUrl = doc.value; }


                }
            });

            console.log(vm.entity);
        }

    }


    angular.module("dizzy").controller('WorkerPerformanceCtrl', ['$scope', '$window', '$stateParams', 'globals', 'dataApi', WorkerPerformanceCtrl]);

    function WorkerPerformanceCtrl($scope, $window, $stateParams, globals, dataApi) {
        var vm = this;
        vm.isSmallWidth = (window.innerWidth <= globals.isMediumWidth);

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.toggleDetail = function (tblname, entity) {
            if (tblname == 'tblWorker') {
                entity.showDetail = !entity.showDetail;
                for (var i = 0; i < vm.data.tblWorker.length; i++) {
                    if (vm.data.tblWorker[i].person_Id == entity.person_Id && vm.data.tblWorker[i].task != ' Total') vm.data.tblWorker[i].showme = entity.showDetail;
                }
            }
            if (tblname == 'tblReviewer') {
                entity.showDetail = !entity.showDetail;
                for (var i = 0; i < vm.data.tblReviewer.length; i++) {
                    if (vm.data.tblReviewer[i].person_Id == entity.person_Id && vm.data.tblReviewer[i].task != ' Total') vm.data.tblReviewer[i].showme = entity.showDetail;
                }
            }
            if (tblname == 'tblTask') {
                entity.showDetail = !entity.showDetail;
                for (var i = 0; i < vm.data.tblTask.length; i++) {
                    //console.log(entity, vm.data.tblTask[i].userType_Id, entity.userType_Id);
                    if (vm.data.tblTask[i].userType_Id == entity.userType_Id && vm.data.tblTask[i].worker != ' Total') vm.data.tblTask[i].showme = entity.showDetail;
                }
            }
        }


        vm.requestExpert = function (person_Id, task_Id) {
            dataApi.requestExpertTaskReviewer(task_Id, person_Id, 10).then(function (data) {
                globals.showAlert("Success", "Tasks have been moved to Expert Queue");
            })
        }


        dataApi.rptWorkerPerformance().then(function (data) {
            vm.data = JSON.parse(data);
            //console.log(vm.data);
            vm.showRpt = true;
        });

    }

    angular.module("dizzy").controller('idvWorkerPerformanceCtrl', ['$scope', '$window', '$stateParams', '$state', 'globals', 'dataApi', idvWorkerPerformanceCtrl]);

    function idvWorkerPerformanceCtrl($scope, $window, $stateParams, $state, globals, dataApi) {
        var vm = this;
        vm.isSmallWidth = (window.innerWidth <= globals.mediumWidth);
        //console.log(vm.isSmallWidth);

        vm.wordFor = function (word) { return globals.wordFor(word); };
        //console.log($state);

        vm.dtEnd1 = vm.dtEnd2 = RoundDate(moment().toDate(), 1);
        vm.dtStart1 = vm.dtStart2 = RoundDate(moment().subtract(1, "month").toDate(), 1);

        vm.workerId = $stateParams.workerId;
        vm.workerName = $stateParams.workerName;
        vm.reviewType = $stateParams.reviewType;
        if (!vm.workerId || !vm.reviewType) globals.showAlert("Missing parameters", "Tell your developer");

        vm.reviewerWord = "Worker";
        if (vm.reviewType == 1) vm.reviewerWord = "Reviewer";
        else if (vm.reviewType == 2) vm.reviewerWord = "Expert";

        vm.refreshData = function () {
            var sDtStart1 = vm.dtStart1.toISOString();
            var sDtStart2 = vm.dtStart2.toISOString();
            var sDtEnd1 = vm.dtEnd1.toISOString();
            var sDtEnd2 = vm.dtEnd2.toISOString();
            dataApi.rptIdvWorkerPerformance(vm.workerId, vm.reviewType
                , sDtStart1, sDtEnd1, sDtStart2, sDtEnd2).then(function (data) {
                    vm.data = JSON.parse(data);
                    for (var i = 0; i < vm.data.tbl.length; i++) {
                        var avgsec1 = 0;
                        if (vm.data.tbl[i].tasksCount1 > 0) avgsec1 = vm.data.tbl[i].totalSeconds1 / vm.data.tbl[i].tasksCount1;
                        //console.log(avgsec1);
                        var min = 0;
                        var sec = 0
                        if (avgsec1 < 59.5) sec = avgsec1;
                        else {
                            min = parseInt(avgsec1 / 60);
                            sec = parseInt(avgsec1 % 60);
                        }
                        vm.data.tbl[i].avemin1 = min;
                        vm.data.tbl[i].avesec1 = sec;

                        var avgsec2 = 0;
                        if (vm.data.tbl[i].tasksCount2 > 0) avgsec2 = vm.data.tbl[i].totalSeconds2 / vm.data.tbl[i].tasksCount2;
                        //console.log(avgsec2);
                        min = 0;
                        sec = 0
                        if (avgsec2 < 59.5) sec = avgsec2;
                        else {
                            min = parseInt(avgsec2 / 60);
                            sec = parseInt(avgsec2 % 60);
                        }
                        vm.data.tbl[i].avemin2 = min;
                        vm.data.tbl[i].avesec2 = sec;

                    }
                    //console.log(vm.data);
                    vm.showRpt = true;
                });
        }

        vm.return = function () {
            if ($stateParams.returnState) $state.go($stateParams.returnState);
            else $window.history.back();
        }

        vm.validHourly = function (tsk) {
            return true;//
            //(tsk.task.indexOf('PersonUpdate') > -1
            //   || tsk.task.indexOf('Total') > -1);
        }

        vm.openCal = function () {
            vm.openCals.start1 = true;
        }

        vm.refreshData();
    }


})();














