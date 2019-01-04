(function () {
    'use strict';

    angular.module("dizzy").factory('dataApi', ['$rootScope', '$state', '$http', '$q', '$timeout', '$cacheFactory', '$location', '$window', 'globals', dataApi]);
    function dataApi($rootScope, $state, $http, $q, $timeout, $cacheFactory, $location, $window, globals) {
        var vm = this;
        localStorage.removeItem("loginInProgress");  //in case of error during previous login
        vm.guids = {
            utResearchAssignment: 'AC0D805E-50A0-4080-BA0C-A7FC25F84BB2'.toLowerCase(),
            empty: '00000000-0000-0000-0000-000000000000',
            favorites: '00000000-0000-0000-0000-000000000000'.replaceAll('0', '6'),
            system: '00000000-0000-0000-0000-000000000000'.replaceAll('0', 'F'),
            arDB: 'E2DB0148-2A04-4727-8316-4071E6F83D18'.toLowerCase(),
            utLooseTags: 'A2E53FB1-8120-4A90-9422-0D5A3B3C959D'.toLowerCase()
        }

        //#region Cache
        vm.cache = $cacheFactory('dataCache', { capacity: 512 });

        function clearCache() {
            vm.cache.removeAll();
            localStorage.removeItem("loginInProgress");
            //console.log("Cleared cache.");

        }

        function clearCacheItem(key) {
            vm.cache.remove(key);
            //console.log("Cleared cached item: " + key);
        }

        //#endregion

        //#region Login, Admin & Datasources
        vm.dataSources = [
                { name: "Production", apiUrl: "https://api.shuri.com/api/", apiKey: "7C8CCCB1-6AC7-4F77-B599-ADA8E1558C6F" },
                { name: "Staging", apiUrl: "https://apistage.shuri.com/api/", apiKey: "DDA2F592-1C6C-43DD-8FE3-EC4F22AD7C16" },
                { name: "Development", apiUrl: "http://localhost:64000/api/", apiKey: "262835E3-D190-476E-861C-AF192269ECEF" }
        ];

        function login() {
            var key = "login";

            var deferred = $q.defer();

            if (vm.cache.get(key)) deferred.resolve();
            else if (!vm.cache.get(key) && localStorage.getItem("loginInProgress")) {
                $timeout(function () {
                    //console.log("pause");
                    login().then(function () { deferred.resolve(); });
                }, 3000);
            }
            else {
                //go check auth and login if needed
                localStorage.setItem("loginInProgress", true);

                //console.log(currentDS());

                //check for a token in local storage & test it if found
                var authToken = localStorage.getItem("appAuthToken");

                if (authToken == null || authToken.length < 10) {
                    if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress")
                    clearCacheItem(key);
                    localStorage.setItem("pendingState", $state.current.name);
                    deferred.reject("Needs login");
                    $state.go("master.login");
                }
                else {
                    $http.defaults.headers.common.Authorization = "Bearer " + authToken;
                    $http.defaults.headers.common["x-api-key"] = currentDS().apiKey;
                    $http.get(currentDS().apiUrl + "checkAuth")
                        .success(function (data) {
                            //good to go
                            //console.log("login ok authToken:" + authToken);
                            vm.cache.put(key, "true");
                            if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress")
                            deferred.resolve();
                        })
                        .error(function () {
                            //console.log("login checkauth error");
                            if (localStorage.getItem("appAuthToken")) localStorage.removeItem("appAuthToken")
                            if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress")
                            clearCacheItem(key);
                            localStorage.setItem("pendingState", $state.current.name);
                            deferred.reject("Login checkauth failed");
                            $state.go("master.login");
                        });
                }
            }
            return deferred.promise;
        }

        function logout() {
            var deferred = $q.defer();
            $http.post(currentDS().apiUrl + "logout")
               .success(function (data) {
                   clearCache();
                   $http.defaults.headers.common.Authorization = null;
                   if (localStorage.getItem("appAuthToken")) localStorage.removeItem("appAuthToken")
                   if (localStorage.getItem("loginInProgress")) localStorage.removeItem("loginInProgress")
                   deferred.resolve();
               })
               .error(function () {
                   console.log("Logout failed");
                   deferred.reject();
               });
            return deferred.promise;
        }

        function currentDS() {
            var key = "currentDS";
            //default
            var ds = vm.dataSources[0];

            if (document.location.href.indexOf("stage.shuri") != -1) ds = vm.dataSources[1];
            else if (document.location.href.indexOf("shuri.com") != -1) ds = vm.dataSources[0];
            else {
                if (vm.cache.get(key)) ds = vm.cache.get(key);
                else if (localStorage.getItem(key)) {
                    ds = JSON.parse(localStorage.getItem(key));
                    vm.cache.put(key, ds);
                }
            }
            return ds;
        }

        function setDS(dsToSet) {
            var key = "currentDS";
            vm.cache.put(key, dsToSet);
            localStorage.setItem(key, angular.toJson(dsToSet));
            
        }

 
        //forces a login
        function getAppUser() {
            var key = "appUser";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                var appUser = vm.cache.get(key);
                //console.log("From cache");
                //console.log(appUser);
                //var pAppUser = JSON.parse(appUser);
                deferred.resolve(appUser);
            }
            else {
                //get the user
                login().then(function () {
                    var appUserUrl = currentDS().apiUrl + "appUser";
                    $http.get(appUserUrl)
                        .success(function (data) {
                            var appUser = data;
                            appUser.subsMayEdit = [];
                            for (var i = 0; i < appUser.subscriptions.length; i++) {
                                var sub = appUser.subscriptions[i];
                                if (!sub.isPrivateSubscription && sub.group_Id != "00000000-0000-0000-0000-000000000000" && sub.updatableGroup) appUser.subsMayEdit.push(sub);
                            }
                            //vm.cache.put(key, angular.toJson(appUser));
                            vm.cache.put(key, appUser);
                            _appUser = data;
                            $rootScope.$emit('appUserLoaded');
                            $rootScope.$broadcast('appUserLoaded');
                            //console.log("From server at " + appUserUrl);
                            //console.log(appUser);
                            deferred.resolve(appUser);

                        })
                        .error(function (e) {
                            handleError("appUser", e);
                            deferred.reject();
                        });
                }, function (reason) {
                    deferred.reject(reason);
                    console.log("failed login " + reason);
                });

            }
            return deferred.promise;
        }

        function deleteAppUser(id) {
            var deferred = $q.defer();
            login().then(function () {
                var appUserUrl = currentDS().apiUrl + "appUser?id=" + id;
                $http.delete(appUserUrl)
                    .success(function (data) {
                        clearCacheItem("appUsers");
                        deferred.resolve();
                    })
                    .error(function (e) {
                        handleError("deleteAppUser", e);
                        deferred.reject();
                    });
            }, function (reason) {
                deferred.reject(reason);
                console.log("failed login " + reason);
            });
            return deferred.promise;

        }

        function register(regmodel) {
            var deferred = $q.defer();

            $http({
                method: 'POST',
                url: currentDS().apiUrl + "register",
                data: regmodel,
                headers: { 'Content-Type': 'text/json' }
            })
                   .success(function (data) {
                       clearCache();
                       deferred.resolve(data);
                   })
                   .error(function (data, status, headers, config) {
                       //handleError("register", data, status, headers, config);
                       deferred.reject(data);
                   });

            return deferred.promise;
        }

        function promoteRole(role, id) {
            var deferred = $q.defer();

            $http({
                method: 'PUT',
                url: currentDS().apiUrl + "promoteRole?role=" + role + "&id=" + id,
                headers: { 'Content-Type': 'text/json' }
            })
                   .success(function (data) {
                       clearCacheItem("appUsers");
                       deferred.resolve(data);
                   })
                   .error(function (data, status, headers, config) {
                       //handleError("register", data, status, headers, config);
                       deferred.reject(data);
                   });

            return deferred.promise;
        }

        function usernameOK(username) {
            if (username == null) $window.alert("Bad username");
            else {
                var deferred = $q.defer();

                $http({
                    method: 'GET',
                    url: currentDS().apiUrl + "usernameOK?username=" + encodeURIComponent(username),
                    headers: { 'Content-Type': 'text/json' }
                })
                       .success(function (data) {
                           deferred.resolve(data);
                       })
                       .error(function (data, status, headers, config) {
                           handleError("usernameOK", data, status, headers, config);
                           deferred.reject();
                       });

                return deferred.promise;
            }
        }

        function getAPIKeys() {
            var key = "apikeys";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                login().then(function () {
                    var appUserUrl = currentDS().apiUrl + "APIKeys";
                    $http.get(appUserUrl)
                        .success(function (data) {
                            vm.cache.put(key, data);
                            deferred.resolve(data);

                        })
                        .error(function (e) {
                            handleError("getAPIKeys", e);
                            deferred.reject();
                        });
                }, function (reason) {
                    deferred.reject(reason);
                    console.log("failed login " + reason);
                });

            }
            return deferred.promise;
        }

        function requestApiKey(reqObject) {
            var deferred = $q.defer();
            login().then(function () {

                $http({
                    method: 'POST',
                    url: currentDS().apiUrl + "requestAPIKey",
                    data: reqObject,
                    headers: { 'Content-Type': 'text/json' }
                })
                       .success(function (data) {
                           clearCache();
                           deferred.resolve(data);
                       })
                       .error(function (data, status, headers, config) {
                           deferred.reject(data);
                       });
            });

            return deferred.promise;
        }

        function deleteApiKey(id) {
            var deferred = $q.defer();
            login().then(function () {

                $http({
                    method: 'DELETE',
                    url: currentDS().apiUrl + "APIKey?id=" + id,
                    headers: { 'Content-Type': 'text/json' }
                })
                       .success(function (data) {
                           clearCache();
                           deferred.resolve(data);
                       })
                       .error(function (data, status, headers, config) {
                           deferred.reject(data);
                       });
            });

            return deferred.promise;
        }

        function getAppUsers() {
            var key = "appUsers";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                login().then(function () {
                    var appUserUrl = currentDS().apiUrl + "appUsers";
                    $http.get(appUserUrl)
                        .success(function (data) {
                            vm.cache.put(key, data);
                            deferred.resolve(data);

                        })
                        .error(function (e) {
                            handleError("appUsers", e);
                            deferred.reject();
                        });
                }, function (reason) {
                    deferred.reject(reason);
                    console.log("failed login " + reason);
                });

            }
            return deferred.promise;
        }

        function getServerType() {
            var key = "serverType";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                login().then(function () {
                    var appUserUrl = currentDS().apiUrl + "serverType";
                    $http.get(appUserUrl)
                        .success(function (data) {
                            vm.cache.put(key, data);
                            deferred.resolve(data);

                        })
                        .error(function (e) {
                            handleError("serverType", e);
                            deferred.reject();
                        });
                }, function (reason) {
                    deferred.reject(reason);
                    console.log("failed login " + reason);
                });

            }
            return deferred.promise;
        }
        //#endregion

        //#region Currently Viewing SubIDs
        //function currViewSubIds() {
        //    var key = "currViewSubIds";
        //    if (vm.cache.get(key)) { return vm.cache.get(key); }
        //    else if (localStorage.getItem(key)) { return localStorage.getItem(key); }
        //    else return "";
        //}

        //function setCurrViewSubIds(subIds) {
        //    var key = "currViewSubIds";
        //        //console.log("currViewSubIds set to: " + subIds)
        //    if (subIds && subIds != _guidEmpty && subIds != "undefined") {
        //        vm.cache.put(key, subIds);
        //        localStorage.setItem(key, subIds);
        //    }
        //}
        function setDatabaseIds(workitem) {
            if (!workitem) console.error("missing workitem");
            var deferred = $q.defer();
            var list = [globals.guids.adminDB];
            if (workitem.subId != globals.guids.empty) list.push(workitem.subId);
            if (!ArrayContainsById(list, globals.guids.arDB)) list.push(globals.guids.arDB);
            if (workitem.workType === "ResearchAssignment") list.push(globals.guids.arMedia);
            //console.log(list, workitem);

            this.login().then(function () {
                var dataPost = angular.toJson(list);
                $http({
                    method: 'PUT',
                    url: currentDS().apiUrl + "subscriptionIds",
                    data: dataPost,
                    headers: { 'Content-Type': 'text/json' }
                })
                    .success(function (data) {
                        clearCache();
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        //handleError("register", data, status, headers, config);
                        deferred.reject(data);
                    });
            });
            return deferred.promise;

        }


        //#endregion

        //#region Misc Private Methods

        function handleError(source, data, status, headers, config) {
            var s = String.format("Error in dataApi: {0}.  Data.message: {1}", source, (data) ? data.message : "");
            if (window.cordova) $window.alert(s);
            else console.log(s);

            //$window.alert(s);
            if (data && data.message && data.message.indexOf("Authorization has been denied") > -1) {
                $http.defaults.headers.common.Authorization = null;
                localStorage.removeItem("appAuthToken");
                clearCache();
                console.log("Authorization denied.  Cache cleared.");
                $state.go("master.login");
            }
        }

        function goodPassword(pw) { return (pw.length >= 6); }

        //#endregion

        //#region Common:  Relations, Autocomplete, & Multi-entity
        function getAutocompleteByEntity(entityType, prefix, noRecs, forEntityType) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = String.format("{0}AutocompleteByEntity?entityType={1}&prefix={2}&noRecs={3}&forEntityType={4}"
                    , currentDS().apiUrl, entityType, prefix, noRecs, forEntityType);
                //console.log(url);
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("AutocompleteByEntity", data, status, headers, config);
                        deferred.reject();
                    });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function getAutocompleteDB(entityType, prefix, noRecs, dbId) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = String.format("{0}AutocompleteDB?entityType={1}&prefix={2}&noRecs={3}&dbId={4}"
                    , currentDS().apiUrl, entityType, prefix, noRecs, dbId);
                //console.log(url);
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getAutocompleteDB", data, status, headers, config);
                        deferred.reject();
                    });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function autocompleteByEntityId(entityType, prefix, noRecs, forEntityType, forEntityId) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = String.format("{0}autocompleteByEntityId?entityType={1}&prefix={2}&noRecs={3}&forEntityType={4}&forEntityId={5}"
                    , currentDS().apiUrl, entityType, prefix, noRecs, forEntityType, forEntityId);

                //console.log(url);
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("autocompleteByEntityId", data, status, headers, config);
                        deferred.reject();
                    });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }


        function addRelation(entityType1, entityId1, entityType2, entityId2) {
            var deferred = $q.defer();

            this.login().then(function () {
                var d = angular.toJson({ entityType1: entityType1, entityId1: entityId1, entityType2: entityType2, entityId2: entityId2 });
                var resurl = currentDS().apiUrl + "Relationship";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                     .success(function (data) {
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("addRelation", data, status, headers, config);
                         deferred.reject();
                     });
            }, function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function getEntity(entityName, id) {
            //var key = String.format("{0}{1}", entityName, id);
            var deferred = $q.defer();
            //if (vm.cache.get(key)) {
            //    deferred.resolve(vm.cache.get(key));
           // }
           // else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + entityName+ "?id=" + id
                    $http.get(url)
                        .success(function (data) {
                           // vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getEntity", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            //}
            return deferred.promise;
        }

        function getResource(resourceUrl) {
            var deferred = $q.defer();

            this.login().then(
                function () {
                    var url = currentDS().apiUrl + resourceUrl;
                    $http.get(url)
                        .success(function (data) {
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getResource: " + resourceUrl, data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) }
            );

            return deferred.promise;
        }

        function postEntity(posturl, entityName, entity, subId) {
            var deferred = $q.defer();
            this.login().then(function () {
                //de-cache
                var key = entityName + entity.id;
                vm.cache.remove(key);
                entity.subId = subId;
                //var postdata = { entity: entity, subId: subId }
                var d = angular.toJson(entity);
                var resurl = currentDS().apiUrl + posturl;
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                     .success(function (data) {
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("postEntity", data, status, headers, config);
                         deferred.reject(data);
                     });
            }, function (reason) { deferred.reject(reason) }); return deferred.promise;
        }

        function deleteEntity(entity, entityType) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = currentDS().apiUrl;
                switch (entityType) {
                    case SEnums('entitytypes', 'group'):
                        url += "group";
                        break;
                    case SEnums('entitytypes', 'location'):
                        url += "location";
                        break;
                    case SEnums('entitytypes', 'person'):
                        url += "person";
                        break;
                    case SEnums('entitytypes', 'org'):
                        url += "group";
                        break;
                    case SEnums('entitytypes', 'touch'):
                        url += "touch";
                        break;
                    case SEnums('entitytypes', 'tag'):
                        url += "tag";
                        break;
                    case SEnums('entitytypes', 'usertype'):
                        url += "usertype";
                        break;
                }
                url += "?id=" + entity.id;

                $http({
                    method: 'DELETE',
                    url: url,
                    headers: { 'Content-Type': 'text/json' }
                })
                     .success(function (data) {
                         clearCache();
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("deleteEntity", data, status, headers, config);
                         deferred.reject();
                     });
            }, function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function deleteRelation(entityType1, entityId1, entityType2, entityId2) {
            var deferred = $q.defer();

            this.login().then(function () {
                var d = angular.toJson({ entityType1: entityType1, entityId1: entityId1, entityType2: entityType2, entityId2: entityId2 });
                var resurl = currentDS().apiUrl + "Relationship";
                $http({
                    method: 'DELETE',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                     .success(function (data) {
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("deleteRelation", data, status, headers, config);
                         deferred.reject();
                     });
            }, function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function getEntityIdByName(entityType, entityName) {
            var key = "getEntityIdByName" + entityName.replace(" ", "").replace("'", "") + entityType.toString();
            var deferred = $q.defer();

            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = String.format("{0}EntityIdByName?entityType={1}&entityName={2}", currentDS().apiUrl, entityType, entityName);
                    $http.get(url)
                       .success(function (data) {
                           vm.cache.put(key, data)
                           deferred.resolve(data);
                       })
                       .error(function (data, status, headers, config) {
                           handleError("getEntityIdByName", data, status, headers, config);
                           deferred.reject();
                       });
                }, function (reason) { deferred.reject(reason) });
            }

            return deferred.promise;
        }

        function getItems4Entity(itemType, entity4Type, entity4Id, pagesize, page, forceGet) {
            var key = String.format("getItems4Entity{0}{1}-{2}-{3}-{4}"
                , itemType, entity4Type, entity4Id, pagesize, page)
                .replace(",", "");

            var deferred = $q.defer();
            if (vm.cache.get(key) && (!forceGet)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = String.format("{0}items4Entity?itemType={1}&entity4Type={2}&entity4Id={3}&pagesize={4}&page={5}"
                                        , currentDS().apiUrl, itemType, entity4Type, entity4Id, pagesize, page);
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getItems4Entity", data, status, headers, config);
                            deferred.reject();
                        });
                }, function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getTimezones(entityType, entityNam) {
            var key = "timezones";
            var deferred = $q.defer();

            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = String.format("{0}timezones", currentDS().apiUrl);
                    $http.get(url)
                       .success(function (data) {
                           vm.cache.put(key, data)
                           deferred.resolve(data);
                       })
                       .error(function (data, status, headers, config) {
                           handleError("timezones", data, status, headers, config);
                           deferred.reject();
                       });
                }, function (reason) { deferred.reject(reason) });
            }

            return deferred.promise;
        }

        //#endregion

        //#region Groups
        function getMyGroups() {
            var key = "mygroups";
            //console.log(key);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
                //console.log('Got MyGroups from cache');
            }
            else {
                this.login().then(function () {
                    var resurl = currentDS().apiUrl + "MyGroups";
                    $http({
                        method: 'GET',
                        url: resurl,
                        headers: { 'Content-Type': 'text/json' }
                    })
                        .success(function (data) {
                            var groups = data;
                            //float private sub to top of sort order
                            //for (var i = 0; i < groups.length; i++) {
                            //    if (groups[i].group.name.toLowerCase() === "private") {
                            //        groups[i].group.name = " " + groups[i].group.name;
                            //        break;
                            //    }
                            // }
                            //console.log(data);
                            //console.log(groups);
                            vm.cache.put(key, groups)
                            deferred.resolve(groups);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getMyGroups", data, status, headers, config);
                            deferred.reject("Error getting my groups");
                        });
                }, function (reason) { deferred.reject(reason) });
            }
            return deferred.promise;
        }

         function getGroup(id) {
            var key = String.format("group{0}", id);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "group?id=" + id.toString();
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getGroup", data, status, headers, config);
                            deferred.reject();
                        });
                }, function (reason) { deferred.reject(reason) });
            }
            return deferred.promise;
        }

        function getGroupWithPeople(id) {
            var key = String.format("groupWithPeople{0}", id);
            console.log(key);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
                console.log("got groupPeople from cache");
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "groupWithPeople?id=" + id.toString();
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            console.log("got groupPeople from server");
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            console.log("got ERROR from server");
                            handleError("getGroupWithPeople", data, status, headers, config);
                            deferred.reject();
                        });
                }, function (reason) { deferred.reject(reason) });
            }
            return deferred.promise;
        }

        function updateGroup(grp) {
            var deferred = $q.defer();
            this.login().then(function () {
                var key = String.format("group{0}", grp.id);
                vm.cache.remove(key);
                $http({
                    method: 'PUT',
                    url: currentDS().apiUrl + "group",
                    data: grp,
                    headers: { 'Content-Type': 'text/json' }
                })
                     .success(function (data) {
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("updateGroup", data, status, headers, config);
                         deferred.reject();
                     });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        //#endregion 

        //#region Locations
        function getLocation(id) {
            var key = String.format("location{0}", id);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "location" + "?id=" + id
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getLocation", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        //#endregion

        //#region Orgs
        function getOrgs(groups, tags, nameBegins, docTypeId, pagesize, page) {
            var key = String.format("getorgs{0}{1}-{2}-{3}-{4}-{5}"
                , groups, tags, nameBegins, docTypeId, pagesize, page)
                .replace(",", "");
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    //string ids, string groups, string tags, string nameBegins, Guid docTypeId, bool fullRecord, int pageSize, int page
                    var url = String.format("{0}organizations?groups={1}&tags={2}&nameBegins={3}&docTypeId={4}&fullRecord=false&pageSize={5}&page={6}"
                        ,currentDS().apiUrl, groups, tags, nameBegins, docTypeId, pagesize, page);
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getOrgs", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getOrg(id, collectionId, recordType) {
            var deferred = $q.defer();
            this.login().then(function () {
                if (!collectionId) collectionId = vm.guids.arDB;
                if (!recordType) recordType = 0;
                var url = String.format("{0}Organization?id={1}&collectionId={2}&recordType={3}", currentDS().apiUrl, id, collectionId, recordType);
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getOrg", data, status, headers, config);
                        deferred.reject();
                    });
            });
            return deferred.promise;
        }

        function getOrgForWorker(id, curatedDB_Id) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = currentDS().apiUrl + "OrganizationForWorker" + "?id=" + id;
                if (curatedDB_Id) url += "&curatedDB_Id=" + curatedDB_Id;
                else url += "&curatedDB_Id=" + _guidEmpty;
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getOrgForWorker", data, status, headers, config);
                        deferred.reject();
                    });
            });
            return deferred.promise;
        }

        function getOrgForPerson(id) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = currentDS().apiUrl + "OrgForPerson" + "?id=" + id;
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("OrgForPerson", data, status, headers, config);
                        deferred.reject();
                    });
            });
            return deferred.promise;
        }
        
        //#endregion 

        //#region People
        function getPeople(groups, tags, touches, nameBegins, fullRecord, pagesize, page) {
            var key = String.format("getPeople{0}{1}-{2}-{3}-{4}-{5}-{6}"
                , groups, tags, touches, nameBegins, fullRecord, pagesize, page)
                .replace(",", "");

            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "people"
                       + "?groups=" + groups + "&tags=" + tags + "&touches=" + touches + "&nameBegins="
                       + nameBegins + "&fullRecord=" + fullRecord.toString() + "&pageSize=" + pagesize.toString() + "&page=" + page.toString();
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getPeople", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getPerson(id) {
            var key = String.format("person{0}", id);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "person" + "?id=" + id
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getPerson", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        //#endregion 


/*        //#region Subscriptions
        function getSubs() {
            var viewingIds = currViewSubIds();
            var key = "subscriptions" + viewingIds.replace(",", "");
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                //console.log("Groups from cache");
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "Subscriptions";
                    $http({
                        method: 'GET',
                        url: url
                    }).success(function (data) {
                        var subs = data;
                        var viewingIds = currViewSubIds();
                        if (!viewingIds || viewingIds == "") {
                            //view all
                            for (var i = 0; i < subs.length; i++) {
                                subs[i].viewing = true;
                            }
                        }
                        else {
                            for (var i = 0; i < subs.length; i++) {
                                var idx = viewingIds.indexOf(subs[i].group_Id)
                                subs[i].viewing = (idx >= 0);
                            }
                        }
                        //console.log(subs);
                        vm.cache.put(key, subs)
                        deferred.resolve(subs);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getSubs", data, status, headers, config);
                        deferred.reject();
                    });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getSubscriptionsAvailable() {
            var viewingIds = currViewSubIds();
            var key = "subscriptionsAvailable";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                //console.log("Subs from cache");
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "subscriptionsAvailable";
                    $http({
                        method: 'GET',
                        url: url
                    }).success(function (data) {
                        var subs = data;
                        vm.cache.put(key, subs)
                        deferred.resolve(subs);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getSubscriptionsAvailable", data, status, headers, config);
                        deferred.reject();
                    });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function subscriptionId4AddNew() {
            var key = "subscriptionId4AddNew";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    //todo fix this - just get private sub for now
                    getSubs().then(function (subs) {
                        for (var i = 0; i < subs.length; i++) {
                            if (subs[i].name == 'Private') {
                                vm.cache.put(key, subs[i].id);
                                deferred.resolve(subs[i].id);
                                break;
                            }
                        }
                    })
                    .error(function (data, status, headers, config) {
                        handleError("subscriptionId4AddNew", data, status, headers, config);
                        deferred.reject();
                    });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        //returns the subId if success
        function subscribe(subId) {
            var deferred = $q.defer();
            this.login().then(function () {
                var resurl = currentDS().apiUrl + "subscribe";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: { subId: subId },
                    headers: { 'Content-Type': 'text/json' }
                })
                .success(function (data) {
                    clearCache();
                    deferred.resolve(data);
                })
                .error(function (data, status, headers, config) {
                    handleError("subscribe", data, status, headers, config);
                    deferred.reject();
                });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function unsubscribe(subId) {
            var deferred = $q.defer();
            this.login().then(function () {
                var resurl = currentDS().apiUrl + "unsubscribe";
                var d = angular.toJson({ subId: subId });
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                     .success(function (data) {
                         clearCache();
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("unsubscribe", data, status, headers, config);
                         deferred.reject();
                     });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }
        //#endregion 
*/

        //#region Tags
        function getTags(groupids, usertypeids, nameBegins) {
            var key = String.format("tags{0}{1}-{2}"
                            , groupids, usertypeids, nameBegins)
                            .replace(",", "");

            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "Tags"
                       + "?groupIds=" + groupids + "&userTypeIds=" + usertypeids + "&nameBegins=" + nameBegins;
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getTags", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getAllTags(databaseId) {
            var key = "AllTags" + databaseId;

            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                var d = this;
                this.login().then(function () {
                    d.getUserTypes()
                    .then(function (data) {
                        //console.log(data);
                        var utTags = [];
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].entityName == "Tag" && data[i].tags.length > 0 && (data[i].collection_Id == databaseId || !databaseId)) {
                                utTags.push(data[i]);
                            }
                        }
                        //console.log(utTags);
                        vm.cache.put(key, utTags)
                        deferred.resolve(utTags);
                    }, function (reason) { deferred.reject(reason) });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getTagsForEntityAndDB(databaseId, entityType) {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = String.format("{0}TagsForEntityAndDB?databaseId={1}&entityType={2}", currentDS().apiUrl, databaseId, entityType);
                $http.get(url)
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getTagsForEntityAndDB", data, status, headers, config);
                        deferred.reject();
                    });
            }
            , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function getLanguages() {
            var key = "Languages";

            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                var d = this;
                this.login().then(function () {
                    var url = currentDS().apiUrl + "TagsByTypename?name=Language";
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getLanguages", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function getTag(id) {
            var key = String.format("tag{0}", id);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "tag" + "?id=" + id ;
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getTag", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        //#endregion 

        //#region Touches
        function getTouches(groupids, usertypeids, nameBegins, pagesize, page) {
            var key = String.format("touches{0}{1}-{2}-{3}-{4}"
                            , groupids, usertypeids, nameBegins, pagesize, page)
                            .replace(",", "");
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "Touches"
                       + "?groupIds=" + groupids + "&userTypeIds=" + usertypeids + "&nameBegins=" + nameBegins + "&pagesize=" + pagesize.toString() + "&page=" + page.toString();
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getTouches", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }
        //Guid id, Guid collectionId, bool forUpdate, bool fullRecord
        function getTouch(id, dbId, forUpdate, fullRecord) {
            var key = String.format("touch{0}", id);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = String.format("{0}touch?id={1}&collectionId={2}&forUpdate={3}&fullRecord={4}", currentDS().apiUrl, id, dbId, forUpdate, fullRecord);
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getTouch", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        //#endregion 

        //#region UserTypes
        function getUTId(utName, utEntity) {
            getUserTypes().then(function (data) {
                for (var i = 0; i < data.length; i++) {
                    var id;
                    var ut = data[i];
                    if (ut.name.toLowerCase() == utName.toLowerCase() && ut.entityName.toLowerCase() == utEntity.toLowerCase()) {
                        id = ut.id;
                        break;
                    }
                }
                return id;

            });

        }

        function getUserTypes() {
            var key = "kUserTypes";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "userTypesWork";
                    $http.get(url)
                        .success(function (data) {
                            vm.userTypes = data;
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                            //console.log(data);
                            //console.log(url);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getUserTypes", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

 
        function getUTConstants() {
            var deferred = $q.defer();
                var d = this;
                this.login().then(function () {
                    d.getUserTypes().then(function (data) {
                        var uts = data;
                        var UTConstants = {};
                        for (var i = 0; i < uts.length; i++) {
                            var ut = uts[i];
                            var abbrev = "";
                            switch (ut.entityType) {
                                case SEnums('entitytypes', 'contactpoint'):
                                    abbrev = "cp";
                                    break;
                                case SEnums('entitytypes', 'document'):
                                    abbrev = "doc";
                                    break;
                                case SEnums('entitytypes', 'group'):
                                    abbrev = "grp";
                                    break;
                                case SEnums('entitytypes', 'location'):
                                    abbrev = "loc";
                                    break;
                                case SEnums('entitytypes', 'person'):
                                    abbrev = "per";
                                    break;
                                case SEnums('entitytypes', 'touch'):
                                    abbrev = "tch";
                                    break;
                                case SEnums('entitytypes', 'tag'):
                                    abbrev = "tag";
                                    break;
                            }

                            var code = String.format("UTConstants.{0}_{1} = '{2}';", abbrev, ut.codeName, ut.id);
                            eval(code);
                        }
                        deferred.resolve(UTConstants);
                    });
                }
                , function (reason) { deferred.reject(reason) });

                return deferred.promise;
        }

        function getUserType(utId) {
            var key = "userType" + utId;
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "userType?id=" + utId;
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getUserType", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }

        function postUserType(ut) {
            var deferred = $q.defer();
            this.login().then(function () {
                var resurl = currentDS().apiUrl + "UserType";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: ut,
                    headers: { 'Content-Type': 'text/json' }
                })
                .success(function (data) {
                    deferred.resolve();
                })
                .error(function (data, status, headers, config) {
                    handleError("postUserType", data, status, headers, config);
                    deferred.reject();
                });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;

        }

        function getPrimitives(entityType) {
            var key = "primitives" + entityType.toString();
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "primitives?entityType=" + entityType;
                    $http({
                        method: 'GET',
                        url: url,
                        headers: { 'Content-Type': 'text/json' }
                    })
                     .success(function (data) {
                         vm.cache.put(key, data)
                         deferred.resolve(data);
                     })
                     .error(function (data, status, headers, config) {
                         handleError("getPrimitives", data, status, headers, config);
                         deferred.reject();
                     });

                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }
        //#endregion 

        //#region Workers
        function editorPersonAddToOrg(personId, firstname, middlename, lastname, nickname, prefix, suffix, orgId, subId) {
            var deferred = $q.defer();
            this.login().then(function () {
                var postdata = { personId: personId, firstname: firstname, middlename: middlename, lastname: lastname, nickname: nickname, prefix: prefix, suffix: suffix, orgId: orgId, subId: subId };
                var d = angular.toJson(postdata);
                var resurl = currentDS().apiUrl + "EditorPersonAddToOrg";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                .success(function (data) {
                    resetWorkQueue();
                    deferred.resolve("OK");
                })
                .error(function (data, status, headers, config) {
                    handleError("EditorPersonAddToOrg", data, status, headers, config);
                    deferred.reject();
                });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function resetWorkQueue() {
            var key = "workQueue" ;
            if (vm.cache.get(key)) vm.cache.remove(key);
        }

        function getWorkQueue() {
            var key = "workQueue";
            var deferred = $q.defer();

            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                var d = this;
                d.login().then(function () {
                    var theQ = new Object();
                    var url = currentDS().apiUrl + "work";
                    $http.get(url).then(function (obj) {
                        //console.log(obj);
                        theQ.workItems = obj.data.items;
                        theQ.workTypes = obj.data.types;
                        theQ.sub = obj.data.sub;
                        vm.cache.put(key, theQ)
                        deferred.resolve(theQ);
                    });
                });
            }

            return deferred.promise;
        }

        function getWorkQueueDetail(typename, reviewType) {
            var deferred = $q.defer();
            login().then(function () {
                var theQ = new Object();
                var url = currentDS().apiUrl + "workdetail?typename=" + typename + "&reviewType=" + reviewType;
                $http.get(url).then(function (data) {
                    deferred.resolve(data.data);
                });
            });

            return deferred.promise;
        }

        function checkoutWorkItem(touchId, workType, reviewType, workerId) {
            var deferred = $q.defer();
            var d = {
                touchId: touchId,
                workType: workType,
                workerId: workerId,
                reviewType: reviewType
            };

            this.login().then(function () {
                var resurl = currentDS().apiUrl + "WorkItemCheckout";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data, status, headers, config) {
                    handleError("WorkItemCheckout", data, status, headers, config);
                    deferred.reject();
                });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;


        }

        function undoCheckoutWorkItem(touchId, reviewType) {
            var deferred = $q.defer();
            var d = {
                subId: _guidEmpty,
                touchId: touchId,
                workType: "",
                reviewType: reviewType
            };

            this.login().then(function () {
                var resurl = currentDS().apiUrl + "WorkItemUndoCheckout";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                .success(function (data) {
                    deferred.resolve(data);
                })
                .error(function (data, status, headers, config) {
                    handleError("WorkItemUndoCheckout", data, status, headers, config);
                    deferred.reject();
                });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;

        }

        function getWorkTouch(id) {
            var key = String.format("touch{0}", id);
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {
                this.login().then(function () {
                    var url = currentDS().apiUrl + "worktouch" + "?id=" + id
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getWorkTouch", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });

            }
            return deferred.promise;
        }


        //this function caches until key explicitly cleared
        function getWorkerPaySummary() {
            var key = "workerPaySummary";
            var deferred = $q.defer();
            if (vm.cache.get(key)) {
                deferred.resolve(vm.cache.get(key));
            }
            else {

                this.login().then(function () {
                    //console.log("got work pay sum from server");
                    var url = currentDS().apiUrl + "WorkerPaySummary";
                    $http.get(url)
                        .success(function (data) {
                            vm.cache.put(key, data)
                            //console.log(key, vm.cache, vm.cache.get(key));
                            deferred.resolve(data);
                        })
                        .error(function (data, status, headers, config) {
                            handleError("getWorkerPaySummary", data, status, headers, config);
                            deferred.reject();
                        });
                }
                , function (reason) { deferred.reject(reason) });
            }
            return deferred.promise;

        }
        

        function payMeNow() {
            var deferred = $q.defer();

            this.login().then(function () {
                //console.log("got work q from server");
                var url = currentDS().apiUrl + "payMeNow";
                $http.get(url)
                    .success(function (data) {
                        //console.log(data);
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("payMeNow", data, status, headers, config);
                        deferred.reject(data.message);
                    });
            }
            , function (reason) { deferred.reject(reason) });

            return deferred.promise;

        }

        function rptWorkerPerformance() {
            var deferred = $q.defer();

            this.login().then(function () {
                var url = currentDS().apiUrl + "rptWorkerPerformance"//?dt=" + dt;
                $http.get(url)
                    .success(function (data) {
                        //console.log(data);
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("rptWorkerPerformance", data, status, headers, config);
                        deferred.reject(data.message);
                    });
            }
            , function (reason) { deferred.reject(reason) });

            return deferred.promise;

        }

        function rptIdvWorkerPerformance(userId, reviewType, dtStart1, dtEnd1, dtStart2, dtEnd2) {
            var deferred = $q.defer();

            this.login().then(function () {
                var url = String.format("{0}rptIdvWorkerPerformance?userId={1}&reviewType={2}&dtStart1={3}&dtEnd1={4}&dtStart2={5}&dtEnd2={6}"
                    , currentDS().apiUrl, userId, reviewType, dtStart1, dtEnd1, dtStart2, dtEnd2);

                $http.get(url)
                    .success(function (data) {
                        //console.log(data);
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("rptIdvWorkerPerformance", data, status, headers, config);
                        deferred.reject(data.message);
                    });
            }
            , function (reason) { deferred.reject(reason) });

            return deferred.promise;

        }

        function getDedupesForEntity(entityId, entityType, noRecs) {
            var deferred = $q.defer();

            this.login().then(function () {
                var url = String.format("{0}getDedupesForEntity?entityId={1}&entityType={2}&noRecs={3}"
                            , currentDS().apiUrl, entityId, entityType, noRecs);

                $http.get(url)
                    .success(function (data) {
                        //console.log(data);
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("getDedupesForEntity", data, status, headers, config);
                        deferred.reject(data.message);
                    });
            }
            , function (reason) { deferred.reject(reason) });

            return deferred.promise;

        }

        //function createWorkTask(subId, entityId, taskname) {
        //    var deferred = $q.defer();
        //    this.login().then(function () {
        //        var postdata = {
        //            subId: subId,
        //            entityId: entityId,
        //            taskname: taskname
        //        }
        //        //console.log(postdata);
        //        var d = angular.toJson(postdata);
        //        var resurl = currentDS().apiUrl + "createWorkTask"
        //        $http({
        //            method: 'POST',
        //            url: resurl,
        //            data: d,
        //            headers: { 'Content-Type': 'text/json' }
        //        })
        //        .success(function (data) {
        //            //console.log(data);
        //            deferred.resolve(data);
        //        })
        //        .error(function (data, status, headers, config) {
        //            handleError("createWorkTask", data, status, headers, config);
        //            deferred.reject(data);
        //        });
        //    });
        //    return deferred.promise;

        //}

        function postWork(modelObj, collectionId, entityType, entityId, touchId, reviewType, completionSeconds, reviewercomments, reviewResult, saveOnly) {
            var deferred = $q.defer();
            //console.log(modelObj);
            if (!modelObj) {
                deferred.reject("No modelObj passed in");
            }
            else if (!touchId || touchId == _guidEmpty) {
                deferred.reject("Invalid touchId");
            }
            else {
                this.login().then(function () {
                    var postdata = {
                        jsonObj: modelObj,
                        collectionId: collectionId,
                        entityType: entityType,
                        entityId: entityId,
                        touchId: touchId,
                        reviewType: reviewType,
                        completionSeconds: completionSeconds,
                        reviewercomments: reviewercomments,
                        reviewResult: reviewResult,
                        saveOnly: saveOnly
                    }
                    //console.log(postdata);
                    var d = angular.toJson(postdata);
                    var resurl = currentDS().apiUrl + "work";
                    $http({
                        method: 'POST',
                        url: resurl,
                        data: d,
                        headers: { 'Content-Type': 'text/json' }
                    })
                    .success(function (data) {
                        //clear the cache
                        var key = String.format("touch{0}", touchId);
                        clearCacheItem(key);
                        if (entityType == SEnums("entitytypes", "person")) {
                            key = String.format("person{0}", entityId);
                            clearCacheItem(key);
                            //console.log("Cleared person");
                        }
                        else {
                            key = String.format("org{0}", entityId);
                            clearCacheItem(key);
                            //console.log("Cleared org");
                        }
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("postWork", data, status, headers, config);
                        deferred.reject(data);
                    });

                });

            }
            return deferred.promise;
        }



        //function getWorkerSubscriptions() {
        //    var key = "workerSubscriptions";
        //    var deferred = $q.defer();

        //    if (vm.cache.get(key)) {
        //        deferred.resolve(vm.cache.get(key));
        //    }
        //    else {
        //        var d = this;
        //        d.login().then(function () {
        //            var url = currentDS().apiUrl + "workersubscriptions";
        //            $http.get(url).then(function (data) {
        //                vm.cache.put(key, data)
        //                deferred.resolve(data);
        //            });
        //        });
        //    }

        //    return deferred.promise;

        //}

        //#region OrgAdd

        function editOrgAdd(name, subId) {
            var deferred = $q.defer();
            if (!name) {
                deferred.reject("No name passed in");
            }
            else {
                this.login().then(function () {
                    var postdata = {
                        jsonObj: name,
                        subId: subId,
                        entityType:  shuri_enums.entitytypes.group, 
                        entityId: _guidEmpty,
                        touchId: _guidEmpty,
                        reviewType:  shuri_enums.reviewtype.none,
                        completionSeconds: 0,
                        reviewercomments: "",
                        reviewResult: 0,
                        saveOnly: 0
                    }
                    console.log(postdata);
                    var d = angular.toJson(postdata);
                    var resurl = currentDS().apiUrl + "editOrgAdd";
                    $http({
                        method: 'POST',
                        url: resurl,
                        data: d,
                        headers: { 'Content-Type': 'text/json' }
                    })
                    .success(function (data) {
                        deferred.resolve(data);
                    })
                    .error(function (data, status, headers, config) {
                        handleError("postWork", data, status, headers, config);
                        deferred.reject(data);
                    });

                });

            }
            return deferred.promise;
        }


        function reviewOrgAdd(orgId, touchId, subId, approved) {
            var deferred = $q.defer();
            this.login().then(function () {
                var postdata = { orgId: orgId, touchId: touchId, subId: subId, forReview: true, reviewResult: approved };
                var d = angular.toJson(postdata);
                var resurl = currentDS().apiUrl + "reviewOrgAdd";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                    .success(function (data) {
                        resetWorkQueue();
                        deferred.resolve("OK");
                    })
                    .error(function (data, status, headers, config) {
                        handleError("reviewOrgAdd", data, status, headers, config);
                        deferred.reject();
                    });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }
        //#endregion
        
        function updateTouchLocation(touchId, locationId) {
            var deferred = $q.defer();
            this.login().then(function () {
                var postdata = { touchId: touchId, locationId: locationId};
                var d = angular.toJson(postdata);
                var resurl = currentDS().apiUrl + "TouchIdLocationId";
                $http({
                    method: 'POST',
                    url: resurl,
                    data: d,
                    headers: { 'Content-Type': 'text/json' }
                })
                    .success(function (data) {
                        deferred.resolve();
                    })
                    .error(function (data, status, headers, config) {
                        handleError("updateTouchLocation", data, status, headers, config);
                        deferred.reject();
                    });
            }
                , function (reason) { deferred.reject(reason) });

            return deferred.promise;
        }

        function requestExpertTaskReviewer(taskTypeId, reviewerId, noRecs)
            {
            var deferred = $q.defer();
            this.login().then(function () {
                var url = String.format("{0}requestExpertTaskReviewer?taskTypeId={1}&reviewerId={2}&noRecs={3}"
                    , currentDS().apiUrl, taskTypeId, reviewerId, noRecs);

                $http({
                    method: 'GET',
                    url: url,
                    headers: { 'Content-Type': 'text/json' }
                })
                 .success(function (data) {
                     deferred.resolve(data);
                 })
                 .error(function (data, status, headers, config) {
                     handleError("requestExpertTaskReviewer", data, status, headers, config);
                     deferred.reject();
                 });

            }
           , function (reason) { deferred.reject(reason) });
            return deferred.promise;
        }

        //#endregion

        return {
            addRelation: addRelation,
            checkoutWorkItem: checkoutWorkItem,
            clearCache: clearCache,
            clearCacheItem: clearCacheItem,
            //createWorkTask: createWorkTask,
            currentDS: currentDS,
            //currViewSubIds: currViewSubIds,
            dataSources: vm.dataSources,
            deleteApiKey: deleteApiKey,
            deleteAppUser: deleteAppUser,
            deleteEntity: deleteEntity,
            deleteRelation: deleteRelation,
            editOrgAdd: editOrgAdd,
            editorPersonAddToOrg: editorPersonAddToOrg,
            getAllTags: getAllTags,
            getAPIKeys: getAPIKeys,
            getAppUser: getAppUser,
            getAppUsers: getAppUsers,
            getAutocompleteByEntity: getAutocompleteByEntity,
            getAutocompleteDB: getAutocompleteDB,
            autocompleteByEntityId: autocompleteByEntityId,
            getDedupesForEntity: getDedupesForEntity,
            getEntity: getEntity,
            getEntityIdByName: getEntityIdByName,
            getGroup: getGroup,
            getGroupWithPeople: getGroupWithPeople,
            getItems4Entity: getItems4Entity,
            getLanguages: getLanguages,
            getLocation: getLocation,
            getMyGroups: getMyGroups,
            getOrgs: getOrgs,
            getOrg: getOrg,
            getOrgForWorker: getOrgForWorker,
            getOrgForPerson: getOrgForPerson,
            getPeople: getPeople,
            getPerson: getPerson,
            getPrimitives: getPrimitives,
            getResource: getResource,
            getServerType: getServerType,
            //getSubs: getSubs,
            //getSubscriptionsAvailable: getSubscriptionsAvailable,
            getTag: getTag,
            getTags: getTags,
            getTagsForEntityAndDB: getTagsForEntityAndDB,
            getTimezones: getTimezones,
            getTouch: getTouch,
            getTouches: getTouches,
            getUserType: getUserType,
            getUserTypes: getUserTypes,
            getUTConstants: getUTConstants,
            getWorkerPaySummary: getWorkerPaySummary,
            getWorkQueue: getWorkQueue,
            getWorkQueueDetail : getWorkQueueDetail,
            getWorkTouch: getWorkTouch,
            goodPassword: goodPassword,
            login: login,
            logout: logout,
            payMeNow: payMeNow,
            postEntity: postEntity,
            postUserType: postUserType,
            postWork: postWork,
            promoteRole: promoteRole,
            register: register,
            requestApiKey: requestApiKey,
            requestExpertTaskReviewer: requestExpertTaskReviewer,
            resetWorkQueue: resetWorkQueue,
            reviewOrgAdd: reviewOrgAdd,
            rptIdvWorkerPerformance: rptIdvWorkerPerformance,
            rptWorkerPerformance: rptWorkerPerformance,
            setDatabaseIds: setDatabaseIds,
            setDS: setDS,
            //subscribe: subscribe,
            //subscriptionId4AddNew: subscriptionId4AddNew,
            undoCheckoutWorkItem: undoCheckoutWorkItem,
            //unsubscribe: unsubscribe,
            updateGroup: updateGroup,
            updateTouchLocation: updateTouchLocation,
            usernameOK: usernameOK
        }

    }


})();