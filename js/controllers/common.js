(function () {
    'use strict';

    angular.module("dizzy").controller('MasterCtrl', function ($rootScope, $scope, $state, $timeout, globals, dataApi) {
        var vm = this;
        vm.sitename = _siteName;
        vm.serverType = "Development";
        vm.version = _appVersion;
        vm.year = (new Date()).getFullYear();
        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.themeChange = function (newTheme) {
            //globals.showAlert('Theme', vm.themeUrl);
            //console.log(newTheme);
            $rootScope.$broadcast("themeChange", { theme: newTheme });

        };

        vm.logout = function () {
            dataApi.logout().then(function () {
                vm.appUser = null;
                vm.isLoggedIn = false;
                globals.showAlert('Log Out', 'You have been logged out');
                //stash the pending state
                localStorage.setItem("pendingState", $state.current.name);
                $state.go('master.login');
            });
        }

        vm.refreshData = function () {
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;
                //console.log(vm.appUser);
                vm.isLoggedIn = (vm.appUser.id != _guidEmpty);
                vm.dataSource = dataApi.currentDS();

            });
        }
        $scope.$on('$viewContentLoaded', function () {
            vm.refreshData();
        });

        
     });

    angular.module("dizzy").controller('HomeCtrl', function ($rootScope,$scope, dataApi) {
        var vm = this;
        
        vm.showApp = function () {
            return (_appUser && _appUser.isUser);
        }

        document.title = "Shuri";

        //$rootScope.$on('appUserLoaded', function () {
        //    dataApi.getAppUser().then(function (data) {
        //        vm.appUser = data;
        //        console.log(vm.appUser, _appUser);
        //        //$scope.$apply()
        //        //vm.isLoggedIn = (vm.appUser.id != _guidEmpty);
        //    });
        //});

    });


    angular.module("dizzy").controller('HeadCtrl', function ($scope, $rootScope, dataApi) {
        var vm = this;

        vm.bootTheme = "lib/bootstrap/dist/css/bootstrap.min.css";
        if (localStorage.getItem("myTheme") && (localStorage.getItem("myTheme") != "default")) {
            vm.bootTheme = "css/bootThemes/" + localStorage.getItem("myTheme") + ".bootstrap.min.css";
        }

        $rootScope.$on('themeChange',
            function (event, args) {
                if (args.theme && args.theme != 'default') {
                    vm.bootTheme = "css/bootThemes/" + args.theme + ".bootstrap.min.css";
                }
                else if (args.theme && args.theme == 'default') vm.bootTheme = "lib/bootstrap/dist/css/bootstrap.min.css";
                localStorage.setItem("myTheme", args.theme);
            });



    });

 
})();
