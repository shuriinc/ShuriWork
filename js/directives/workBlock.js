(function () {
    'use strict';

    angular.module("dizzy").directive('workBlock', ['$state', '$stateParams', 'globals', 'dataApi',
        function ($state, $stateParams, globals, dataApi) {
            return {
                restrict: "E",
                scope: {
                    modelobj: '=',
                    entityType: '=',
                    entityId: '=',
                    showcomments: '@'
            },
                templateUrl: "templates/directives/workBlock.html",
                link: function (scope, element, attrs) {
                    scope.isSmallWidth = globals.isSmallWidth;

                    scope.reviewType = $stateParams.reviewType;
                    //console.log(scope.reviewType);
                    switch (scope.reviewType) {
                        case shuri_enums.reviewtype.none:
                            scope.title = "Worker";
                            scope.panelColor = "panel-primary";
                            break;
                        case shuri_enums.reviewtype.regular:
                            scope.title = "Reviewer";
                            scope.panelColor = "panel-success";
                            break;
                        case shuri_enums.reviewtype.expert:
                            scope.title = "Expert";
                            scope.panelColor = "panel-danger";
                            break;
                    }
                    scope.reviewerComments = "";
                    scope.showComments = true;  //default
                    scope.startDate = new Date();
                    scope.showSpinner = false;
                    //console.log($stateParams);

                    var watcherT = scope.$watch('modelobj', function () {
                        if (scope.modelobj === undefined) return;
                        scope.modelObj = scope.modelobj;
                       
                    })

                    var watcherC = scope.$watch('showcomments', function () {
                        if (scope.showcomments === undefined) return;
                        
                        if (scope.showcomments == "false") scope.showComments = false;
                    })

                     scope.wordFor = function (word) { return globals.wordFor(word); };

                     scope.commentsChanged = function (cmmts) {
                        scope.reviewerComments = cmmts;
                        //console.log(cmmts);
                    }

                    scope.cancel = function () {
                        scope.spinnerText = "Canceling ...";
                        scope.showSpinner = true;
                        //undo checkout
                        dataApi.undoCheckoutWorkItem($stateParams.touchId, scope.reviewType).then(function (data) {
                            scope.showSpinner = false;
                            $state.go("master.work")
                        },
                        function (data) {
                            scope.showSpinner = false;
                            globals.showAlert("Undo Checkout Failed", data);
                        });
                    }

                    scope.edit = function () {

                        scope.spinnerText = "Submitting ...";
                        scope.showSpinner = true;
                        
                        if (!scope.entityType) scope.entityType = $stateParams.entityType;
                        if (!scope.entityId) scope.entityId = $stateParams.entityId;
                        //console.log(scope.modelObj, $stateParams.subId, scope.entityType, scope.entityId, $stateParams.touchId, $stateParams.reviewType, completionSeconds(), scope.reviewerComments);
                        dataApi.postWork(scope.modelObj, $stateParams.subId, scope.entityType, scope.entityId, $stateParams.touchId, $stateParams.reviewType, completionSeconds(), scope.reviewerComments, false, false).then(function (data) {
                            scope.showSpinner = false;
                            if (localStorage.getItem("workcont")) goNext();
                            else $state.go("master.work");
                        });
                    }

                     scope.review = function (approved) {

                        if (scope.showComments && !approved && (!scope.reviewerComments || scope.reviewerComments == "")) {
                            globals.showAlert("Reject ", "Please explain why you are rejecting in Reviewer Comments");
                        }
                        else {
                            if (approved) {
                                scope.spinnerText = "Approving ...";
                            }
                            else {
                                scope.spinnerText = "Rejecting ...";
                            }
                            scope.showSpinner = true;
                            //console.log(scope.modelObj);
                            dataApi.postWork(scope.modelObj, $stateParams.subId, scope.entityType, scope.entityId, $stateParams.touchId, $stateParams.reviewType, completionSeconds(), scope.reviewerComments, approved, false).then(function (data) {
                                scope.showSpinner = false;

                                if (localStorage.getItem("workcont")) goNext();
                                else $state.go("master.work");

                            });
                        }
                     }

                     scope.wellClass = function () {
                         var cls = "well ";

                         switch ($stateParams.reviewType)
                         {
                             case "1":
                                 cls += "wellReviewer";
                                 break;
                             case "2":
                                 cls += "wellExpert";
                                 break;
                             default:
                                 cls += "wellWorker";
                                 break;
                         }
                         return cls;
                     }

                    function goNext() {
                        //get next
                        var workName = $state.current.name.replace("master.", "");
                        //console.log(workName);
                        dataApi.checkoutWorkItem(_guidEmpty, workName, scope.reviewType, $stateParams.workerId).then(
                             function (data) {
                                 var workQueueItem = data;
                                 //console.log(data);

                                 if (workQueueItem.touch.id == _guidEmpty) $state.go("master.work");
                                 else {
                                     $state.go($state.current.name, {
                                         subId: $stateParams.subId, touchId: workQueueItem.touch.id, entityId: workQueueItem.entityId,
                                         entityType: workQueueItem.entityType, reviewType: scope.reviewType, workerId: $stateParams.workerId
                                     });
                                 }
                             });

                    }
                    function completionSeconds() {
                        var now = new Date();
                        return Math.round((now - scope.startDate) / 1000);
                    }

                    //initialization
                    dataApi.getWorkTouch($stateParams.touchId).then(function (data) {
                        scope.touch = data;
                        //console.log(data);
                        dataApi.getUTConstants().then(function (data) {
                            var utConstants = data;
                            //console.log(data);
                            //CPs
                            for (var i = 0; i < scope.touch.documents.length; i++) {
                                var doc = scope.touch.documents[i];
                                if (doc.userType_Id == utConstants.doc_workerReviewerComments || doc.userType_Id == utConstants.doc_workRejection) { scope.reviewerComments = doc.value; }
                                //else console.log(doc.typename);
                                //else if (doc.userType_Id == utConstants.doc_completionSeconds && scope.touch.createdBy_Id == doc.createdBy_Id) {
                                //    if (parseInt(doc.value) < 60) scope.workerTime = doc.value + ' seconds';
                                //    else {
                                //        var min = parseInt(doc.value / 60);
                                //        var sec = parseInt(doc.value % 60);
                                //        scope.workerTime = String.format('{0} min {1} sec', min, sec );
                                //    }
                                    
                                //}

                            }

                        });
                    });


                }
            }
        }]);

})();