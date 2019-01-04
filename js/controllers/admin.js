(function () {
    'use strict';

    //angular.module("dizzy").controller('SubscriptionsCtrl', function ($scope, $filter, dataApi, globals) {
    //    var vm = this;

    //    vm.wordFor = function (word) { return globals.wordFor(word); };

    //    vm.refreshData = function () {
    //        vm.loadComplete = false;
    //        dataApi.getSubscriptionsAvailable().then(
    //        function (data) {
    //            vm.subscriptions = data;
    //            for (var i = 0; i < vm.subscriptions.length; i++) {

    //            }
    //            vm.loadComplete = true;
    //            //console.log(vm.subscriptions);
    //        },
    //        function (data) {
    //            globals.showAlert(data);
    //            vm.loadComplete = true;
    //        }
    //        );
    //    };

    //    vm.togglesubscribe = function (sub) {
    //        dataApi.clearCache();
    //        if (sub.isSubscribed) {
    //            dataApi.unsubscribe(sub.id).then(function (data) {
    //                globals.showAlert("Unsubscribe Complete", "You will no longer be charged for a subscription to " + sub.name);
    //                vm.refreshData();
    //            });
    //        }
    //        else {
    //            var viewIds = dataApi.currViewSubIds();
    //            if (viewIds != "") {
    //                viewIds += sub.id + ",";
    //                dataApi.setCurrViewSubIds(viewIds);
    //            }

    //            dataApi.subscribe(sub.id).then(function (data) {
    //                var tit, msg;
    //                if (sub.subscriptionTypename.toLowerCase() == "demo") {
    //                    tit = "You have Subscribed";
    //                    msg = "To the free demo subscription:  " + sub.name;

    //                }
    //                else {
    //                    var chg = $filter('currency')(sub.value);
    //                    tit = "You have Subscribed";
    //                    msg = "You will charged " + chg + " " + sub.subscriptionTypename + " for a subscription to " + sub.name;
    //                }
    //                globals.showAlert(tit, msg);
    //                vm.refreshData();
    //            });
    //        }

    //    }
    //    vm.refreshData();
    //});


    angular.module("dizzy").controller('AccountCtrl', function ($scope, dataApi, globals) {
        var vm = this;

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.refreshData = function () {
            vm.loadComplete = false;
            dataApi.getAppUser().then(function (data) {
                vm.appUser = data;

                dataApi.getAPIKeys().then(function (data) {
                    vm.apikeys = data;
                    if (vm.appUser.primaryCP_Id && vm.appUser.primaryCP_Id != _guidEmpty) {
                        dataApi.getEntity("contactPoint", vm.appUser.primaryCP_Id).then(function (data) {
                            vm.primaryCP = data;
                        });

                    }
                    vm.loadComplete = true;
                });
            });
        };


        vm.makeDirty = function (x) {
            if (x == "person") vm.dirtyPerson = true;
            else vm.dirtyEmail = true;

            vm.isDirty = true;
        };

        vm.saveChanges = function () {
            vm.saveChangesMsg = "";
            //save the person & email
            if (vm.dirtyPerson) {
                vm.inSave = true;
                dataApi.getPerson(vm.appUser.id).then(function (data) {
                    var person = data;
                    person.prefix = vm.appUser.prefix;
                    person.firstname = vm.appUser.firstname;
                    person.middlename = vm.appUser.middlename;
                    person.lastname = vm.appUser.lastname;
                    person.suffix = vm.appUser.suffix;
                    console.log(person);
                    dataApi.postEntity("people", "person", person, vm.appUser.privateSubscription_Id).then(function (data) {
                        vm.saveChangesMsg += "Saved name OK.  ";
                        if (vm.dirtyEmail) {
                            dataApi.postEntity("contactPoints", "contactPoint", vm.primaryCP, vm.appUser.privateSubscription_Id).then(function (data) {
                                vm.showSaveChangesMsg = true;
                                vm.saveChangesMsg += "Updated email OK.  ";
                                dataApi.clearCacheItem("appUser");
                            });
                        }
                        vm.showSaveChangesMsg = true;
                        dataApi.clearCacheItem("appUser");
                        vm.inSave = false;

                    });

                });
            }

 
        }
        vm.deleteAPIKey = function (id) {
            dataApi.deleteApiKey(id).then(function () {
                vm.refreshData();

            });
        }

        vm.refreshData();

    });

    angular.module("dizzy").controller('LoginCtrl', function ($scope, $state, $stateParams, $window, $http, globals, dataApi) {
        var vm = this;
        vm.user = { username: localStorage.getItem("username"), password: "", rememberMe: localStorage.getItem("rememberMe"), daysRemember: 3 };
        vm.reg = { firstname: "", middlename: "", lastname: "", email: "", phone: "", username: "", password: "", confirmpassword: "" };
        vm.user.rememberMe = true;
        vm.apiUrl = dataApi.currentDS().apiUrl;
        vm.cordova = (window.cordova) ? true : false;
        vm.showPWReset = false;
        vm.showRegister = false;
        vm.cardHeaderClasses = "item item-divider item-positive";
        vm.cardFooterClasses = "item item-divider";
        vm.subtitle = "Please Login"
        vm.footerButtonText = "New Users - Register";
        vm.footerButtonClasses = "button button-energized";

        //console.log($state);

        vm.checkUsername = function () {
            dataApi.usernameOK(vm.reg.username).then(function (data) {
                vm.usernameOK = data;
                vm.usernameChecked = true;
            });
        }

        vm.toggleViews = function () {
            if (vm.showRegister) {
                vm.showRegister = false;
                vm.cardHeaderClasses = "item item-divider item-positive";
                vm.subtitle = "Please Login";
                vm.footerButtonText = "Register New User";
                vm.footerButtonClasses = "button button-energized";
            }
            else {
                vm.showRegister = true;
                vm.cardHeaderClasses = "item item-divider item-energized";
                vm.subtitle = "Please Register";
                vm.footerButtonText = "Return to Login";
                vm.footerButtonClasses = "button button-positive";
                if (vm.showPWReset) vm.togglePWReset();
                // console.log(vm.showPWReset);
            }
            //console.log("showRegister changed to: " + vm.showRegister);
        }

        vm.togglePWReset = function (event) {
            vm.showPWReset = !(vm.showPWReset);
            if (vm.showPWReset) {
                vm.subtitle = "Reset Your Password";
                vm.user.password = vm.confirmpassword = "";
            }
            else {
                vm.subtitle = "Please Login";

            }
            event.preventDefault();
        }

        vm.resetPW = function () {
            var tit = "", msg = "";

            if (vm.user.password != vm.confirmpassword) {
                tit += "Passwords do not match ";
                msg += "Please enter the same new password in both boxes. ";
                vm.user.password = vm.confirmpassword = "";
            }
            else if (!dataApi.goodPassword(vm.user.password)) {
                tit += "Weak Password ";
                msg += "Your password must be at least 6 characters long. ";
                vm.user.password = vm.confirmpassword = "";
            }
            else if (vm.user.username.trim() == "") {
                tit += "No Username ";
                msg += "Please provide a username. ";
            }

            if (tit != "") {
                $window.alert(tit + " \n\n" + msg);
            }
            else {
                tit = "Reset Password";
                msg = "This will reset your password and send a notification the email address on record for this username.  "
                        + " \n\nAre you sure you want to reset the password for " + vm.user.username + "?";
                if ($window.confirm(tit + " \n\n" + msg)) {
                    var loginUrl = vm.dsSelected.apiUrl + "resetPassword";
                    var postdata = {
                        username: vm.user.username,
                        newpassword: vm.user.password,
                        confirmpassword: vm.confirmpassword
                    };
                    var result = $http({
                        method: "POST",
                        url: loginUrl,
                        contentType: "application/json",
                        data: JSON.stringify(postdata)
                    })
                        .success(function (data) {
                            tit = "Password Reset Success";
                            msg = 'You may now login with your new password.';
                            $window.alert(tit + " \n\n" + msg);
                            vm.showPWReset = false;
                            vm.confirmpassword = "";
                        })
                        .error(function (data) {
                            tit = "Password Reset Failed";
                            msg = 'An error occurred: ' + data;
                            $window.alert(tit + " \n\n" + msg);
                            vm.showPWReset = false;
                            vm.confirmpassword = vm.user.password = "";
                        });

                } else {
                    vm.showPWReset = false;
                    vm.confirmpassword = "";

                }
            }
        }

          
        vm.login = function () {
            var s = "";
            if (vm.user.username == "") s += "Please provide your username.\n";
            if (vm.user.password == "") s += "Please provide your password.\n";
            if (!vm.dsSelected) s += "Please select a data source.\n";
            if (s != "") {
                $window.alert('Unable to Login. \n\n' + s);
            }
            else {
                var loginUrl = vm.dsSelected.apiUrl + "login";
                vm.spinnerText = 'Logging in ...'
                vm.showSpinner = true;

                var result = $http({
                    method: "POST",
                    url: loginUrl,
                    contentType: "application/json",
                    data: JSON.stringify(vm.user)
                })
                    .success(function (data) {
                        var token = data.replace(/\"/g, "");
                        localStorage.setItem("appAuthToken", token);
                        localStorage.setItem("username", vm.user.username);
                        localStorage.setItem("rememberMe", vm.user.rememberMe);
                        dataApi.setDS(vm.dsSelected);

                        //init the user
                        dataApi.getAppUser().then(function (data) {
                            vm.showSpinner = false;
                            if (localStorage.getItem("pendingState") && (localStorage.getItem("pendingState").toString().indexOf("login") != -1)) {
                                localStorage.removeItem("pendingState");
                                $state.go("master.home");
                            }
                            else if (localStorage.getItem("pendingState")) {
                                //console.log(localStorage.getItem("pendingState"));
                                var newstate = localStorage.getItem("pendingState");
                                localStorage.removeItem("pendingState");
                                $state.go(newstate);
                            }
                            else $state.go("master.home");

                        });

                    })
                    .error(function (data) {
                        var s = "";
                        //internet?  server down?
                        if (!data) s = "Connection issues to " + vm.dsSelected.apiUrl + "?";
                        else if (data.message) s = data.message;
                        else s = "Result:\n " + data;
                        vm.showSpinner = false;
                        $window.alert('Unable to Login. \n\n' + s);
                    });
            }
        };

        vm.register = function () {
            var s = "";
            if (vm.reg.firstname == "") s += "Please provide your first name.\r\n";
            if (vm.reg.lastname == "") s += "Please provide your last name.\r\n";
            if (vm.reg.username == "") s += "Please provide a username.\r\n";
            if (!dataApi.goodPassword(vm.reg.password)) s += "Password is not good enough.\r\n";

            if (s != "") $window.alert(s);
            else {
                vm.spinnerText = 'Registering ...'
                vm.showSpinner = true;
                dataApi.register(vm.reg).then(function (data) {
                    $window.alert("Sign Up Successful.  \n\nYou may login now, but you may not have access to all your subscriptions yet.  \n\nPlease check your email for additional information.");
                    vm.user.username = vm.reg.username;
                    vm.user.password = vm.reg.password;
                    vm.toggleViews(vm.user.username);
                    vm.showSpinner = false;
                    vm.hideRegistration = true;
                },
                function (data) {
                    //failed
                    //console.log(data);
                    vm.showSpinner = false;
                    globals.showAlert('Unable to Sign Up', data.message);

                });
            }
        };

        vm.regUsernameClasses = function () {
            var cls = " ";
            if (vm.usernameChecked) {
                if (vm.usernameOK) cls += "has-success";
                else cls += "has-error";
            }
            //console.log(cls);
            return cls;
        }

        function GetDataSources() {
            vm.dataSources = dataApi.dataSources;
            vm.dsSelected = dataApi.currentDS();
            vm.showDSDDL = false;
            //console.log(vm.dsSelected);
            var env = "";
            if (window.location.href.toLowerCase().indexOf("workstage") >= 0) env = "Staging";
            else if (window.location.href.toLowerCase().indexOf("localhost") >= 0) env = "Development";

            if (env != "") {
                vm.showDSDDL = true;
                if (!localStorage.getItem("currentDS")) {
                    //new login
                    vm.dataSources.forEach(function (ds) {
                        if (ds.name == env) vm.dsSelected = ds;
                    });
                }
            }
            //hookup the ds ddl
            for (var i = 0; i < vm.dataSources.length; i++) {
                if (vm.dataSources[i].name == vm.dsSelected.name) {
                    vm.dsSelected = vm.dataSources[i];
                    break;
                }
            }


        }


        vm.pwRecover = function () {
            vm.showPWReset = true;

        }
        GetDataSources();

    });


    angular.module("dizzy").controller('UsersCtrl', function ($scope, $window, dataApi, globals) {
        var vm = this;
        vm.roles = [
            { name: "Registered", icon: "glyphicon-warning-sign", sortorder: 0 },
            { name: "User", icon: "glyphicon-user", sortorder: 1 },
            { name: "Worker", icon: "glyphicon-pencil", sortorder: 2 },
            { name: "Reviewer", icon: "glyphicon-ok", sortorder: 3 },
            { name: "Dev", icon: "glyphicon-headphones", sortorder: 4 },
            { name: "System Admin", icon: "glyphicon-lock", sortorder: 5 },
        ]

        vm.default = vm.roles[0];

        vm.wordFor = function (word) { return globals.wordFor(word); };

        vm.refreshData = function () {
            //dataApi.getAppUsers().then(function (data) {
            //    vm.users = data;
            //    for (var i = 0; i < vm.users.length; i++) {
            //        var user = vm.users[i];
            //        user.roleIndex = 0;
            //        if (user.isSysAdmin) {
            //            user.roleIndex = 5;
            //        }
            //        else if (user.isDev) {
            //            user.roleIndex = 4;
            //        }
            //        else if (user.isReviewer) {
            //            user.roleIndex = 3;
            //        }
            //        else if (user.isWorker) {
            //            user.roleIndex = 2;
            //        }
            //        else if (user.isUser) {
            //            user.roleIndex = 1;
            //        }

            //        user.role = vm.roles[user.roleIndex];
            //    }
            //    //console.log(vm.users);
            //});
        }


        vm.manageUser = function (id) {
            globals.alert("Manage User", "TODO");
        }

        vm.promoteRole = function (user, role) {
            console.log(user, role);
            dataApi.promoteRole(role.name, user.id).then(function (data) {
                vm.refreshData();

            });
        }

         vm.deleteUser = function (user) {

            if ($window.confirm("Delete " + user.name + " permanently?")){
                dataApi.deleteAppUser(user.id).then(function (data) {
                    vm.refreshData();

                });
            }
        }

        dataApi.getAppUser().then(function (data) {
            vm.appUser = data;
            if (!vm.appUser.isSysAdmin) $window.alert("Unauthorized for this page.");
            else vm.refreshData();
        });
        

    });


})();
