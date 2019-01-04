var app = angular.module("dizzy", ['ui.router', 'ui.bootstrap'])

    .config(function ($stateProvider, $urlRouterProvider, $sceDelegateProvider) {
        var ver = "?ver=" + _appVersion;
          $stateProvider
            .state('master', { url: "/master", templateUrl: "templates/master.html" + ver, abstract: true })
              .state('master.home', { url: "/home", templateUrl: "templates/work/work.html" + ver })
              .state('master.work', { url: "/work", templateUrl: "templates/work/work.html" + ver })
              .state('master.workdetail', { url: "/workdetail/:typeName,:reviewType,:subId", templateUrl: "templates/work/queueDetail.html" + ver })
              .state('master.about', { url: "/about", templateUrl: "templates/home/about.html" + ver })
              .state('master.contact', { url: "/contact", templateUrl: "templates/home/contact.html" + ver })
              .state('master.import', { url: "/import", templateUrl: "templates/home/import.html" + ver })
              .state('master.privacy', { url: "/privacy", templateUrl: "templates/home/privacy.html" + ver })

              .state('master.login', { url: "/login/:apiUrl", templateUrl: "templates/admin/login.html" + ver })
              .state('master.account', { url: "/account", templateUrl: "templates/admin/account.html" + ver })
              .state('master.apiKey', { url: "/apikey", templateUrl: "templates/admin/apiKey.html" + ver })
              .state('master.subscriptions', { url: "/subscriptions", templateUrl: "templates/admin/subscriptions.html" + ver })
              .state('master.users', { url: "/users", templateUrl: "templates/admin/users.html" + ver })

              .state('master.AddPeopleToOrg', { url: "/AddPeopleToOrg/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/addPeopleToOrg.html" + ver })
              .state('master.AddPeopleToOrg-TI', { url: "/AddPeopleToOrg-TI/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/addPeopleToOrg.html" + ver })
              .state('master.OrgAdd', { url: "/OrgAdd/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/orgadd.html" + ver })
              .state('master.OrgDedupe', { url: "/OrgDedupe/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/dedupe.html" + ver })
              .state('master.OrgUpdate', { url: "/OrgUpdate/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/workUpdates.html" + ver })
              .state('master.OrgUpdate-TI', { url: "/OrgUpdate-TI/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/workUpdates.html" + ver })
              .state('master.PersonDedupe', { url: "/PersonDedupe/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/dedupe.html" + ver })
              .state('master.PersonUpdate', { url: "/PersonUpdate/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/workUpdates.html" + ver })
              .state('master.PersonUpdate-TI', { url: "/PersonUpdate-TI/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/workUpdates.html" + ver })
              .state('master.ResearchAssignment', { url: "/ResearchAssignment/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/researchAssignment.html" + ver })
              .state('master.TwNameCat', { url: "/TwNameCat/:subId,:touchId,:entityId,:entityType,:reviewType,:workerId", templateUrl: "templates/work/twNameCat.html" + ver })

              .state('master.workerPerformance', { url: "/workerPerformance", templateUrl: "templates/rpt/workerPerformance.html" + ver })
              .state('master.idvWorkerPerformance', { url: "/idvWorkerPerformance/:workerId,:workerName,:reviewType,:returnState", templateUrl: "templates/rpt/idvWorkerPerformance.html" + ver })


            ;

        $urlRouterProvider.otherwise('/master/home');

        $sceDelegateProvider
            .resourceUrlWhitelist([
                'self',
                'https://shuristoragestd.blob.core.windows.net/user-staging/**',
                'https://shuristoragestd.blob.core.windows.net/user/**'
            ]);



    })

    .run(function ($state, $templateCache) {
        if (localStorage.getItem("pendingState")) localStorage.removeItem("pendingState");
        $templateCache.removeAll();
        console.log("Running dizzy3 version: " + _appVersion);
        $state.go('master.home');
    });


    app.filter('propercase', function () {
        return function (word) {
            return word.substring(0, 1).toUpperCase() + word.slice(1);
        }
    })

    .service('httpInterceptor', [function () {
        var service = this;

        service.request = function (config) {
            //if (config.url == 'templates/directives/sspinner.html') console.log(config);
            //   else if (config.url /.indexOf())
            if (config.method.toUpperCase() == "GET") {
                if (config.url.toLowerCase().indexOf("/api/") == -1 && config.headers.Authorization) {
                    if (config.headers.length) {

                        for (var i = 0; i < config.headers.length; i++) {
                            //if (config.url == 'templates/directives/sspinner.html') console.log(config.headers[i], config.headers.Authorization);
                            if (config.headers[i] === config.headers.Authorization) {
                                config.headers.splice(i, 0);
                                break;
                            }
                        }
                    }
                    else {
                        //headers is an object, replace it
                        config.headers = { Accept: "application/json, text/plain, */*" };
                    }
                }
                //else console.log("not api: " + config.url);
            }
            //else console.log("not a get: " + config.url);
            return config;
        };
    }])
    .config(['$httpProvider', function ($httpProvider) {
        $httpProvider.interceptors.push('httpInterceptor');
    }])
    ;



function InitializeTheApp() {
    angular.bootstrap(document, ["dizzy"]);
}
