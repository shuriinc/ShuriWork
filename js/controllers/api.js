(function () {
    'use strict';
    angular.module("dizzy").controller('ApiHomeCtrl', function ($rootScope, $scope, $state, $timeout, globals, dataApi) {
        var vm = this;
    });

})();
(function () {
    'use strict';
    angular.module("dizzy").controller('ApiKeyCtrl', function ($rootScope, $scope, $state, $timeout, globals, dataApi) {
        var vm = this;
        vm.req = { key: "" };
        vm.terms = function () {
            return globals.showAlert("Terms and Conditions", "TODO");
        }

        dataApi.getAppUser().then(function (data) {
            vm.user = data;
        });

        vm.requestKey = function () {
            //var err = "";
            //if (vm.req.uri.toLowerCase().indexOf("http") == -1) err += "Origin must include http/s protocol.";
            //else if (vm.req.uri.toLowerCase().indexOf("https") == -1 && vm.req.uri.toLowerCase().indexOf("localhost") == -1) err += "Origin must be https protocol, unless localhost.";

            //if (err != "") globals.showAlert("Unable to Request API Key", err);
            //else {
            dataApi.requestApiKey(vm.req).then(function (data) {
                vm.haskey = true;
                vm.req = data;
            }, function () {
                globals.showAlert("Error: Unable to get key");
            });
            //}
        };
    });

})();


(function () {
    'use strict';
    angular.module("dizzy").controller('ApiDocsCtrl', function ($rootScope, $scope, $state, $timeout, $http, globals, dataApi) {
        var vm = this;
        vm.touchtypeId = "",
        vm.subId = "";
        vm.fullRecord = false;
        vm.nameBegins = "";
        vm.wordFor = function (word) { return globals.wordFor(word); };

        //load supporting data
        vm.refreshData = function () {
            dataApi.getAppUser().then(function (data) {
                vm.user = data;
                dataApi.getMyGroups().then(
                    function (data) {
                        vm.mygroups = [];
                        for (var i = 0; i < data.length; i++) {
                            vm.mygroups.push(data[i].group);
                        }

                        dataApi.getUserTypes()
                            .then(function (data) {
                                vm.userTypes = data;
                                vm.utsTouch = [];
                                for (var i = 0; i < vm.userTypes.length; i++) {
                                    if (vm.userTypes[i].entityType == SEnums("entityTypes", "touch")) {
                                        vm.utsTouch.push(vm.userTypes[i]);
                                    }
                                }

                                vm.subsAvailableUrl = "subscriptionsAvailable";
                                dataApi.getResource(vm.subsAvailableUrl).then(function (data) {
                                    vm.subsAvailable = data;

                                    dataApi.getResource("myteams").then(function (data) {
                                        vm.myTeams = data;

                                        dataApi.getResource("groups?grpType=private").then(function (data) {
                                            vm.myPrivate = data;

                                            //finally
                                            vm.loadComplete = true;
                                        });

                                    });
                                });

                            });

                    });
            });

        };


        vm.getResource = function (entity) {
            vm.loadingDemo = true;

            if (!vm.resourceUrl) vm.refreshResourceUrl(entity);

            dataApi.getResource(vm.resourceUrl).then(function (data) {
                vm.results = JSON.stringify(data, null, 2);
                console.log(data);
                vm.loadingDemo = false;
            });
        };

        vm.refreshResourceUrl = function (entity) {
            switch (entity.toLowerCase()) {
                case "people":
                    vm.resourceUrl = String.format("{3}?groups={0}&tags=&touches=&nameBegins={1}&fullRecord={2}&page=1&pageSize=5",
                                vm.subId, vm.nameBegins, vm.fullRecord, entity);
                    break;
                case "touches":
                    vm.resourceUrl = String.format("touches?groups={0}&usertypes={1}&tags=&fullRecord={2}&page=1&pageSize=5",
                                vm.subId, vm.touchtypeId, vm.fullRecord);
                    break;
                case "organizations":
                    vm.resourceUrl = String.format("organizations?groups={0}&tags=&touches=&nameBegins={1}&fullRecord={2}&page=1&pageSize=5",
                                vm.subId, vm.nameBegins, vm.fullRecord);
                    break;
            }

        }

        vm.showModelText = function () {
            if (!vm.modelText) {
                var url = "www/js/shuriModels.js";
                console.log(document.location);
                $http.get(url)
                    .success(function (data) {
                        vm.modelText = data;
                    });
            }
            else vm.modelText = null;


        }

        vm.refreshData();

    });
})();
