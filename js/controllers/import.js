(function () {
    'use strict';

    angular.module("dizzy").controller('ImportCtrl', function ($scope, $state, $stateParams, $location, $window, dataApi, globals) {
        var vm = this;

        vm.results = "";
        vm.step = 1;

        vm.fileNameChanged = function (evt) {
            var files = evt.target.files;
            var i, f;
            for (i = 0, f = files[i]; i != files.length; ++i) {
                var reader = new FileReader();
                vm.grpname = vm.filename = f.name;
                reader.onload = function (evt) {
                    var data = evt.target.result;
                    vm.workbook = XLSX.read(data, { type: 'binary' });
                    vm.results = "Loaded the workbook. "
                    vm.myWorksheets = [];
                    vm.workbook.SheetNames.forEach(function (sheetname) { /* iterate through sheets */
                        var worksheet = vm.workbook.Sheets[sheetname];
                        var columns = [];
                        //get the columns and top 50 sample values
                        for (var z in worksheet) {
                            var row = getRow(z);
                            if (row === 1) {
                                var entity = "person";
                                var field = "";
                                switch (worksheet[z].v.toLowerCase()) {
                                    case "first":
                                        field = 'Person.Firstname'
                                        break;
                                    case "last":
                                        field = 'Person.Lastname'
                                        break;
                                    case "section 1 - company":
                                        field = 'Organization.Name'
                                        break;
                                    case "email":
                                        field = 'Person.Email';
                                        break;
                                    case "section 1 - phone":
                                        field = 'Person.Phone'
                                        break;
                                }

                                columns.push({
                                    name: worksheet[z].v,
                                    col: getColumnLetter(z),
                                    entity: entity,
                                    field: field,
                                    sampleValues: [],
                                    uniqueValues: []
                                })
                            }
                            else if (row > 1 && row <= 51) {
                                addColValue(z, worksheet, columns);
                            }
                        }

                        //calc distinct values
                        for (var i = 0; i < columns.length; i++) {
                            var c = columns[i];
                            for (var j = 0; j < c.sampleValues.length; j++) {
                                var v = c.sampleValues[j];
                                if (!ArrayContains(c.uniqueValues, v)) c.uniqueValues.push(v);
                            }
                        }
                        vm.myWorksheets.push({
                            name: sheetname,
                            worksheet: vm.workbook.Sheets[sheetname],
                            columns: columns

                        });
                    });

                    console.log(vm.myWorksheets);
                    vm.step = 2;
                    $scope.$apply();
                };
                reader.readAsBinaryString(f);
            }
        }

        vm.import = function (ws) {

            dataApi.getUTConstants().then(function (data) {
                var utConstants = data;


                vm.importGroup = new shuri_group();
                vm.importGroup.name = vm.grpname;
                vm.importGroup.description = String.format("Imported on {0} from {1}", new Date(), vm.filename);
                vm.importGroup.grpType = shuri_enums.grouptype.private;

                var previousRow = null;
                var worksheet = ws.worksheet;
                console.log(worksheet);
                //process each cell;

                var rowHasPerson = false;
                var rowHasOrg = false;
                var rowHasTouch = false;
                var rowPerson = new shuri_person();
                var rowOrg = new shuri_group();
                var rowTouch = new shuri_touch();
                rowOrg.grpType = shuri_enums.grouptype.organization;

                for (var z in worksheet) {
                    var row = getRow(z);
                    if (row == 0) console.log(row);
                    else if (row > 1) {
                        //if row changed post entities to vm.importGroup and clear--------------------------------------------
                        var rowChange = false;
                        if (previousRow == null) previousRow = row;
                        else if (previousRow != row) {
                            rowChange = true;
                            previousRow = null;
                        }
                        if (rowChange) {
                            //console.log("RowChange");
                            pushRow(rowPerson, rowOrg, rowTouch, rowHasPerson, rowHasOrg, rowHasTouch);

                            rowHasPerson = false;
                            rowPerson = new shuri_person();
                            rowHasOrg = false;
                            rowOrg = new shuri_group();
                            rowOrg.grpType = shuri_enums.grouptype.organization;
                            rowHasTouch = false;
                            rowTouch = new shuri_touch();
                        }



                        var colDef = getColumnDef(getColumnLetter(z), vm.myWorksheets[0]);
                        var value = worksheet[z].v;

                        switch (colDef.field.toLowerCase()) {
                            case "person.firstname":
                                rowPerson.firstname = value;
                                rowHasPerson = true;
                                break;
                            case "person.lastname":
                                rowPerson.lastname = value;
                                rowHasPerson = true;
                                break;
                            case "organization.name":
                                rowOrg.name = value;
                                rowHasOrg = true;
                                break;
                            case "person.email":
                                var cp = new shuri_contactPoint();
                                cp.userType_Id = utConstants.cp_email;
                                cp.name = value;
                                rowPerson.contactPoints.push(cp);
                                rowHasPerson = true;
                                break;
                            case "person.phone":
                                var cp = new shuri_contactPoint();
                                cp.userType_Id = utConstants.cp_businessPhone;
                                cp.name = value;
                                rowPerson.contactPoints.push(cp);
                                rowHasPerson = true;
                                break;
                        }

                        //console.log(colDef, value, previousRow, row);

                    }
                }

                //last record
                pushRow(rowPerson, rowOrg, rowTouch, rowHasPerson, rowHasOrg, rowHasTouch);

                console.log(vm.importGroup);
                dataApi.postEntity("groups", "group", vm.importGroup, _guidEmpty).then(function (data) {
                    globals.showAlert("Success", "Import has been completed.  Your new group is called <b>" + vm.importGroup.name + "</b>.");
                    //var loc = $location.path();
                    $state.transitionTo($state.current, angular.copy($stateParams), { reload: true, inherit: true, notify: true });
                },
                function (errorObj) {
                    if (errorObj && errorObj.message) {
                        if (errorObj.message.toLowerCase().indexOf("duplicate name") > -1) globals.showAlert("Duplicate Name", "There is already a group named <b>" + vm.importGroup.name + "</b>.  Import has been refused.  ");
                        else globals.showAlert("Error", error.message);
                    }
                    else if (errorObj) console.log(errorObj);
                });

            });
        }

        function pushRow(person, org, touch, hasPerson, hasOrg, hasTouch) {
            var orgExists = false;
            var i = 0;

            //prevent duplicates
            if (hasOrg) {
                for (i = 0; i < vm.importGroup.groups.length; i++) {
                    if (vm.importGroup.groups[i].name === org.name) {
                        //consolidate orgs
                        for (var c = 0; c < org.contactPoints.length; c++) {
                            vm.importGroup.groups[i].contactPoints.push(org.contactPoints[c]);
                        }
                        for (var d = 0; d < org.documents.length; d++) {
                            vm.importGroup.groups[i].documents.push(org.documents[d]);
                        }


                        org = vm.importGroup.groups[i];
                        orgExists = true;
                        break;
                    }
                }
                if (!orgExists) vm.importGroup.groups.push(org);
            }


            if (hasPerson) {
                var perExists = false;
                for (i = 0; i < vm.importGroup.people.length; i++) {
                    if (vm.importGroup.people[i].firstname === person.firstname
                                && vm.importGroup.people[i].lastname === person.lastname) {
                        //consolidate people
                        for (var c = 0; c < person.contactPoints.length; c++) {
                            vm.importGroup.people[i].contactPoints.push(person.contactPoints[c]);
                        }
                        for (var d = 0; d < person.documents.length; d++) {
                            vm.importGroup.people[i].documents.push(person.documents[d]);
                        }
                        person = vm.importGroup.people[i];
                        perExists = true;
                        break;
                    }
                }
                if (!perExists) vm.importGroup.people.push(person);
            }

            //relation between org and person?
            if (hasPerson && hasOrg) {
                var personExistsInOrg = false;
                for (i = 0; i < org.people.length; i++) {
                    if (org.people[i].firstname === person.firstname
                                && org.people[i].lastname === person.lastname) {
                        personExistsInOrg = true;
                        break;
                    }
                }

                if (!personExistsInOrg) org.people.push(person);
            }

            if (hasTouch) vm.importGroup.touches.push(touch);

        }



        function addColValue(cellAddress, worksheet, columns) {
            var mycol = getColumnLetter(cellAddress);
            for (var i = 0; i < columns.length; i++) {
                var c = columns[i];
                if (mycol == c.col) {
                    c.sampleValues.push(worksheet[cellAddress].v);
                    break;
                }
            }
        }

        function getColumnLetter(cellAddress) {
            var ret = "";
            for (var i = 0; i < cellAddress.length; i++) {
                /* all keys that do not begin with "!" correspond to cell addresses */
                //first numeric begins the row number
                if (cellAddress[i] === "!" || cellAddress[i] == parseInt(cellAddress[i])) break;
                else ret += cellAddress[i]
            }
            return ret;
        }

        function getColumnDef(columnLetter, workbook) {
            for (var i = 0; i < workbook.columns.length; i++) {
                if (workbook.columns[i].col === columnLetter) return workbook.columns[i];
            }
            return null;
        }


        function getRow(cellAddress) {
            var ret = 0;
            for (var i = 0; i < cellAddress.length; i++) {
                /* all keys that do not begin with "!" correspond to cell addresses */
                if (cellAddress[i] === "!") break;

                    //first numeric begins the row number
                else if (cellAddress[i] == parseInt(cellAddress[i])) {
                    var len = parseInt(cellAddress.length) - parseInt(i);
                    ret = cellAddress.substr(i, len)
                    //console.log(ret, cellAddress, cellAddress.length, i, len, );
                    break;
                }
            }
            return parseInt(ret);
        }

        document.getElementById("filesImportControl").addEventListener('change', vm.fileNameChanged, false);



    });



})();
