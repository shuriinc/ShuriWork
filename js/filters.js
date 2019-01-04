(function () {
    'use strict';

    angular.module('dizzy').filter('timepad', function () {
        return function (input) {

            if (input === undefined) input = "0";
            var n = 2;
            var result = parseInt(input).toString();

            if (result.length >= n) return result
            else if (result.length == 1) return "0" + result;
            else return "00";
        };
    });

    angular.module("dizzy").filter('docUISection', function () {
        return function (items, sectionName) {
            var filtered = [];
            if (items) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].uiSection == sectionName) filtered.push(items[i]);
                }
            }
            return filtered;
        };
    });

    angular.module("dizzy").filter('isInStatus', function () {
        return function (items, status) {
            var wps = SEnums('workerprocessstatus', status);
            var filtered = [];
            if (items) {
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (item.workerProcessStatus == wps) {
                        //console.log(item.workerProcessStatus);
                        filtered.push(item);
                    }
                }
            }
            return filtered;
        };
    });

    angular.module("dizzy").filter('splitArrayFilter', function () {
        return function (arr, lengthofsublist) {
            if (!angular.isUndefined(arr) && arr.length > 0) {
                var arrayToReturn = [];
                var subArray = [];
                var pushed = true;
                for (var i = 0; i < arr.length; i++) {
                    if ((i + 1) % lengthofsublist == 0) {
                        subArray.push(arr[i]);
                        arrayToReturn.push(subArray);
                        subArray = [];
                        pushed = true;
                    } else {
                        subArray.push(arr[i]);
                        pushed = false;
                    }
                }
                if (!pushed)
                    arrayToReturn.push(subArray);

                console.log(JSON.stringify(arrayToReturn));
                return arrayToReturn;
            }
        }
    });



})();
