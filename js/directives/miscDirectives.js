(function () {
    'use strict';
    angular.module("dizzy").directive('selectOnClick', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.on('click', function () {
                    if (!window.getSelection().toString()) {
                        // Required for mobile Safari
                        this.setSelectionRange(0, this.value.length)
                    }
                });
            }
        };
    });

    function checkTime(i) {
        if (i < 10) { i = "0" + i };  // add zero in front of numbers < 10
        return i;
    }
    angular.module("dizzy").directive('pageTimer', ['$timeout',
        function ($timeout) {
            return {
                restrict: 'E',
                templateUrl: "templates/directives/pageTimer.html",
                link: function (scope, element, attrs) {
                    scope.startTime = new Date();
                    scope.classes = "pull-right";
                    scope.refreshTimer = function () {
                        var now = new Date();
                        var totsecs = parseInt((now.getTime() - scope.startTime.getTime()) / 1000);
                        var mins = parseInt(totsecs / 60);
                        var secs = totsecs - (mins * 60);
                        scope.theTime = checkTime(mins) + ":" + checkTime(secs);
                        var promis = $timeout(scope.refreshTimer, 1000);
                    }
                    scope.refreshTimer();
                }
            };
        }]);

    angular.module("dizzy").directive('sspinner', ['globals',
        function (globals) {
            return {
                restrict: "E",
                scope: {
                    padding: '@',
                    text: '@'
                },
                templateUrl: "templates/directives/sspinner.html",
                link: function (scope, element, attrs) {
                    scope.paddingTop = '120';
                    scope.paddingBottom = '120';
                    scope.spinnerText = 'Loading ...'

                    var watcherT = scope.$watch('text', function () {
                        if (scope.text === undefined) return;
                        scope.spinnerText = scope.text;
                    })

                    var watcherP = scope.$watch('padding', function () {
                        if (scope.padding === undefined) return;
                        scope.paddingTop = scope.padding.replace('px', '');
                        scope.paddingBottom = scope.padding.replace('px', '');
                    })



                }
            }
        }]);

    angular.module("dizzy").directive('taskMaker', ['globals', 'dataApi',
    function (globals, dataApi) {
        return {
            restrict: "E",
            scope: {
                entity: "=",
                forupdate: "@"
            },
            templateUrl: "templates/directives/entityLanguages.html",
            link: function (scope, element, attrs) {
                scope.isUpdateSet = false;

                var watcherT = scope.$watch('entity', function () {
                    if (scope.entity === undefined) return;
                    FinishInit();
                    watcherT();
                });

                var watcherU = scope.$watch('forupdate', function () {
                    if (scope.forupdate === undefined) return;
                    scope.isUpdate = (scope.forupdate == "true");
                    scope.isUpdateSet = true;
                    FinishInit();
                    watcherU();
                });

                scope.langNGChanged = function (lang) {
                    if (lang.id == _guidEmpty.replace("0", "F")) {
                        globals.showAlert("TODO", "Add language");
                    }
                    else if (lang.id != _guidEmpty) {
                        scope.entity.tags.push(lang);
                        console.log(lang, scope.entity.tags);

                    }

                    scope.languageItem = scope.languageTags[0];
                }

                scope.removeTag = function (tag) {

                    for (var i = 0; i < scope.entity.tags.length; i++) {
                        if (scope.entity.tags[i].id === tag.id) {
                            scope.entity.tags.splice(i, 1);
                            break;
                        }
                    }
                    //console.log(scope.entity.tags);
                }

                function FinishInit() {
                    if (scope.entity === undefined || !scope.isUpdateSet) return;

                    if (scope.isUpdate) {
                        dataApi.getLanguages().then(function (data) {
                            scope.languageTags = [];
                            var addLang = new shuri_tag();
                            addLang.name = "Add a language...";
                            addLang.id = _guidEmpty;
                            addLang.typename = "Language";
                            scope.languageItem = addLang;
                            scope.languageTags.push(addLang);

                            for (var i = 0; i < data.length; i++) {
                                var tg = new shuri_tag();
                                tg.id = data[i].id;
                                tg.name = data[i].name;
                                tg.userType_Id = data[i].userType_Id;
                                tg.typename = data[i].typename;
                                scope.languageTags.push(tg);
                            }

                            var addNew = new shuri_tag();
                            addNew.name = "{Add a new language}";
                            addNew.id = _guidEmpty.replace("0", "F");
                            addNew.typename = "Language";
                            scope.languageTags.push(addNew);

                            //console.log(data);

                        });
                    }

                }
            }
        }
    }]);

    angular.module("dizzy").directive('entityLanguages', ['globals', 'dataApi',
        function (globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    entity: "=",
                    forupdate: "@"
                },
                templateUrl: "templates/directives/entityLanguages.html",
                link: function (scope, element, attrs) {
                    scope.isUpdateSet = false;

                    var watcherT = scope.$watch('entity', function () {
                        if (scope.entity === undefined) return;
                        FinishInit();
                        watcherT();
                    });

                    var watcherU = scope.$watch('forupdate', function () {
                        if (scope.forupdate === undefined) return;
                        scope.isUpdate = (scope.forupdate == "true");
                        scope.isUpdateSet = true;
                        FinishInit();
                        watcherU();
                    });

                    scope.langNGChanged = function (lang) {
                        if (lang.id == _guidEmpty.replace("0", "F")) {
                            globals.showAlert("TODO", "Add language");
                        }
                        else if (lang.id != _guidEmpty) {
                            scope.entity.tags.push(lang);
                            //console.log(lang, scope.entity.tags);

                        }

                        scope.languageItem = scope.languageTags[0];
                    }

                    scope.removeTag = function (tag) {

                        for (var i = 0; i < scope.entity.tags.length; i++) {
                            if (scope.entity.tags[i].id === tag.id) {
                                scope.entity.tags[i].changeType = 2;
                                break;
                            }
                        }
                        console.log(scope.entity.tags);
                    }

                    function FinishInit() {
                        if (scope.entity === undefined || !scope.isUpdateSet) return;

                        if (scope.isUpdate) {
                            dataApi.getLanguages().then(function (data) {
                                scope.languageTags = [];
                                var addLang = new shuri_tag();
                                addLang.name = "Add a language...";
                                addLang.id = _guidEmpty;
                                addLang.typename = "Language";
                                scope.languageItem = addLang;
                                scope.languageTags.push(addLang);

                                for (var i = 0; i < data.length; i++) {
                                    var tg = new shuri_tag();
                                    tg.id = data[i].id;
                                    tg.name = data[i].name;
                                    tg.userType_Id = data[i].userType_Id;
                                    tg.typename = data[i].typename;
                                    scope.languageTags.push(tg);
                                }

                                var addNew = new shuri_tag();
                                addNew.name = "{Add a new language}";
                                addNew.id = _guidEmpty.replace("0", "F");
                                addNew.typename = "Language";
                                scope.languageTags.push(addNew);

                                //console.log(data);

                            });
                        }

                    }
                }
            }
        }]);



 
})();