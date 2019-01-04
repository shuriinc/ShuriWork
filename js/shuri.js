
function shuri_workerRates() {
    this.worker = 0;
    this.reviewer = 0;
}


function shuri_workQueueItem() {
    this.touch = new shuri_touch();
    this.entityId = _guidEmpty;
    this.entityType = -1;
    this.entityName = '';  //140 char max
    this.workerProcessStatus = -1;
    this.workerRates = new shuri_workerRates();
}

function UTCNow() {
    var now = new Date();
    return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
}


function RoundDate(date, nearestMinutes) {
    var coeff = 1000 * 60 * nearestMinutes;
    return new Date(Math.round(date.getTime() / coeff) * coeff);
}

function SEnums(enumtype, enumname) {
    var e = -1;
    switch (enumtype.toLowerCase()) {

        case 'entitytypes':
            switch (enumname.toLowerCase()) {
                case 'contactpoint':
                    e = 0;
                    break;
                case 'document':
                    e = 1;
                    break;
                case 'group':
                case 'groups':
                    e = 2;
                    break;
                case 'location':
                    e = 3;
                    break;
                case 'people':
                case 'person':
                    e = 4;
                    break;
                case 'tag':
                case 'tags':
                    e = 5;
                    break;
                case 'touch':
                case 'touches':
                    e = 6;
                    break;
                case 'ref':
                    e = 7;
                    break;
                case 'usertype':
                case 'usertypes':
                    e = 8;
                    break;
                case 'org':
                case 'orgs':
                case 'organization':
                case 'organizations':
                    e = 9;
                    break;
                case 'team':
                case 'teams':
                    e = 10;
                    break;
            }
            break;

        case 'grouptype':
            switch (enumname.toLowerCase()) {
                case 'private':
                    e = 0;
                    break;
                case 'subscription':
                case 'collection':
                    e = 1;
                    break;
                case 'team':
                    e = 2;
                    break;
                case 'organization':
                    e = 3;
                    break;
            }
            break;

        case 'paytype':
            switch (enumname.toLowerCase()) {
                case 'comp':
                    e = 0;
                    break;
            }
            break;

        case 'subtype':
            switch (enumname.toLowerCase()) {
                case 'demo':
                    e = 0;
                    break;
                case 'private':
                    e = 1;
                    break;
                case 'monthly':
                    e = 2;
                    break;
                case 'annual':
                    e = 3;
                    break;
            }
            break;

        case 'workerprocessstatus':
            switch (enumname.toLowerCase()) {
                case 'readywork':
                    e = 0;
                    break;
                case 'inwork':
                    e = 1;
                    break;
                case 'readyreview':
                    e = 2;
                    break;
                case 'inreview':
                    e = 3;
                    break;
                case 'rejected':
                    e = 4;
                    break;
                case 'approved':
                    e = 5;
                    break;
                case 'paid':
                    e = 6;
                    break;
            }
            break;

    }
    return e;
}


//utilities
function UrlNoHash(url) {
    var result = url.toString();
    var hashAt = result.indexOf("#");
    if (hashAt > 0) result = result.substring(0, hashAt);
    return result;
}

function SelectText(objId) {
    DeSelectText();
    if (document.selection) {
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(objId));
        range.select();
    }
    else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(objId));
        window.getSelection().addRange(range);
    }
}

function DeSelectText() {
    if (document.selection) document.selection.empty();
    else if (window.getSelection)
        window.getSelection().removeAllRanges();
}


if (!String.format) {
    String.format = function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
              ? args[number]
              : match
            ;
        });
    };
}

String.prototype.replaceAll = function (s, r) { return this.split(s).join(r) }

String.prototype.toProperCase = function () {
    return this.toLowerCase().replace(/^(.)|\s(.)/g,
        function ($1) { return $1.toUpperCase(); });
}
//converter:  SQL provides dates as:2014-12-21T17:40:50.973
function SQLDate2JS(sqlDate) {
    if (!sqlDate) return null;
    else if (!sqlDate.indexOf("T") > 0) {
        console.log("Invalid SQL Date string");
        return null;
    }
    else{
        var dt = sqlDate.substring(0, sqlDate.indexOf("T"));
        var tm = sqlDate.substring(sqlDate.indexOf("T") + 1, sqlDate.length);

        var dtArray = dt.split("-");
        var sYear = dtArray[0];
        var sMonth = (dtArray[1] - 1);  //0-based months
        var sDay = dtArray[2];

        var tmArray = tm.split(":");
        var sHour = tmArray[0];
        var sMinute = tmArray[1];
        
        var sSecond = 0;
        var sMillisecond = 0;
        var secArray = tmArray[2].split(".");

        try{
            sSecond = secArray[0];
            sMillisecond = parseInt((secArray.length > 1) ? secArray[1] : 0);
        }
        catch (ex) { }
        var newDate = new Date(sYear, sMonth, sDay, sHour, sMinute, sSecond, sMillisecond);

        //console.log(sYear, sMonth, sDay, sHour, sMinute, sSecond, sMillisecond);
        return newDate;
    }
}


function AllowAddByEntity(entity, add2Entity) {
    result = false;
    switch (add2Entity.toLowerCase()) {
        case "group":
            switch (entity.toLowerCase()) {
                case "groups":
                case "orgs":
                case "people":
                case "tags":
                case "touches":
                    break;
            }
        case "org":
            switch (entity.toLowerCase()) {
                case "groups":
                case "people":
                case "tags":
                case "touches":
                case "orgs":
                    result = true;
                    break;
            }
        case "person":
            switch (entity.toLowerCase()) {
                case "groups":
                case "orgs":
                case "tags":
                case "touches":
                    result = true;
                    break;
            }
        case "tag":
            switch (entity.toLowerCase()) {
                case "groups":
                case "orgs":
                case "people":
                case "touches":
                    break;
            }
        case "touch":
            switch (entity.toLowerCase()) {
                case "groups":
                case "orgs":
                case "people":
                case "tags":
                case "touches":
                    break;
            }
            break;
    }
    return result;
}

function ArrayContains(array, obj) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] == obj) {
            return true;
        }
    }
    return false;
}


function ArrayContainsById(array, id) {
    //console.log("Matching .id in array objects", id, array);
    for (var i = 0; i < array.length; i++) {
        if (array[i].id && array[i].id.toLowerCase() == id.toLowerCase()) {
            return true;
        }
    }
    return false;
}
