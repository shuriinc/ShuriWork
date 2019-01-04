(function () {
    'use strict';

    angular.module("dizzy").controller('WorkUpdatesCtrl', ['$scope', '$state', '$stateParams', '$window', 'globals', 'dataApi', '$http', WorkUpdatesCtrl]);

    function WorkUpdatesCtrl($scope, $state, $stateParams, $window, globals, dataApi, $http) {
        var vm = this;
        vm.forExpert = false; //todo
        vm.prefixes = ["Mr.", "Ms.", "Dr.", "Mrs.", "Hon."];
        //vm.orgLinks = [];
        vm.orgName = "";
        vm.entitytype = 'org';

        vm.wordFor = function (word) { return globals.wordFor(word); };

        //#region Init & Get Org
        vm.imageUrl = "";
        vm.isTechInvest = ($state.current.name.toLowerCase().indexOf("-ti") > 0);
        //console.log($stateParams);

        if (!($stateParams.entityId) || !($stateParams.touchId) || !($stateParams.subId) || !($stateParams.entityType)
               || $stateParams.entityId == "" || $stateParams.touchId == "" || $stateParams.subId == "" || $stateParams.entityType == "") globals.showAlert("Error", "Error - Missing Ids");
        else {
            if ($stateParams.reviewType) {
                vm.reviewType = $stateParams.reviewType;
                vm.forExpert = (vm.reviewType == shuri_enums.reviewtype.expert);
            }
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                vm.dbId = $stateParams.subId;
                if ($stateParams.entityType == SEnums('entitytypes', 'person')) {
                    //dataApi.getPerson('372C69EA-52E0-42DD-9E44-331DB5BDA89E').then(function (data) {
                    dataApi.getPerson($stateParams.entityId).then(function (data) {

                        vm.entity = data;
                        vm.subheaderColor = "bar-energized";
                        vm.title = "UpdatePerson";
                        vm.isPerson = true;
                        vm.entitytype = 'person';
                        vm.realEntityType = 4;
                        dataApi.getOrgForPerson(vm.entity.id).then(function (data) {
                            vm.orgName = data.name;
                        });
                        FinishInit();
                    },
                        function (data) {
                            console.error(data);
                            FinishInit();
                        });
                }
                else if ($stateParams.entityType == SEnums('entitytypes', 'group')) {
                    dataApi.getOrg($stateParams.entityId, $stateParams.subId, 2).then(function (data) {
                        vm.entity = data;
                        vm.realEntityType = 9;
                        vm.subheaderColor = "bar-calm";
                        vm.title = "UpdateOrg";
                        FinishInit();
                    },
                        function (data) {
                            console.error(data);
                            FinishInit();
                        }
                    );
                }

            })

        }

 
        function FinishInit() {
            document.title = vm.entity.name;
            vm.imageUrl = vm.entity.imageUrl;
            vm.showWork = true;
        }

        //vm.orgLink = function (type, id){
        //    var url = null;
        //    for(var i = 0; i < vm.orgLinks.length; i++){
        //        if (vm.orgLinks[i].id == id && vm.orgLinks[i].type == type.toLowerCase()){
        //            url = vm.orgLinks[i].url;
        //            break;
        //        }
        //    }
        //    return url;
        //}

   
        //#endregion

        //#region Date Pops
        vm.today = function () {
            vm.dt = new Date();
        };
        vm.today();

        vm.clear = function () {
            vm.dt = null;
        };

        vm.isCalOpen = function () { return (vm.calOpen); };

        vm.openCal1 = function ($event) {
            if ($event) {
                $event.preventDefault();
                $event.stopPropagation();
            }
            vm.calOpen = true;
            console.log(vm.calOpen);
        };

        vm.dateOptions = {
            formatYear: 'yy',
            startingDay: 1
        };

        //#endregion

        vm.imageUrlSync = function () {
            if (vm.imageUrl && vm.imageUrl.trim() != "") {
                if (vm.imageUrl.toLowerCase().indexOf("http") == -1) globals.showAlert("Invalid Entry", "Url should be prefixed with either 'http' or 'https'");
                else vm.entity.imageUrl = vm.imageUrl;
            }
        }

 
        vm.getImage = function () {
            var url = "https://www.google.com/search?site=imghp&tbm=isch&source=hp&q=" + encodeURIComponent(vm.entity.name);
            var win = window.open(url, 'workWindow');
        }

        vm.showUrl = function (url, windowName) {
            var winName = 'workWindow';
            //if (windowName) winName = windowName;

            //console.log(url, windowName, vm.org);

            if (url == "searchhomepage") {
                url = "https://www.google.com/#q=" + encodeURIComponent(vm.entity.name);
                if (vm.org && vm.org.name) url += "+" + encodeURIComponent(vm.org.name);
            }
            else if (url == "searchcontactus") url = "https://www.google.com/#q=contact+us+" + encodeURIComponent(vm.entity.name);
            else if (url == "searchentityorg") url = "https://www.google.com/#q=" + encodeURIComponent(vm.entity.org.name);

            var win = window.open(url, winName);
        }

        vm.google = function (s) {
            var url = "https://www.google.com/#q=" + encodeURIComponent(s);
            vm.showUrl(url);
        }
    }

})();