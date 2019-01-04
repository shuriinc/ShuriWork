
//---Enums -----------------------------------------------------------------------
var shuri_enums = {
    changetype: { none: 0, update: 1, remove: 2 },
    entitytypes: { contactpoint: 0, document: 1, group: 2, location: 3, person: 4, tag: 5, touch: 6, ref: 7, usertype: 8, organization: 9, team: 10 },
    grouptype: { private: 0, collection: 1, team: 2, organization: 3 },
    paytype: { comp: 0 },
    reviewtype: { none: 0, regular: 1, expert: 2 },
    subtype: { demo: 0, private: 1, monthly: 2, annual: 3 },
    workerprocessstatus: { readywork: 0, inwork: 1, readyreview: 2, inreview: 3, rejected: 4, approved: 5, paid: 6, readyexpert: 7, inexpert: 8, rejectedreview: 9 }
}

//--- Entities -----------------------------------------------------------------
function shuri_contactPoint() {
    this.id = _guidEmpty;
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.userType_Id = '';
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
}

function shuri_document() {
    this.id = _guidEmpty;
    this.name = '';  //140 char max
    this.value = ''; //4000 char max
    this.userType_Id = '';
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
}

function shuri_group() {
    this.id = _guidEmpty;
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.grpType = SEnums('grouptype', 'private');
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
    this.contactPoints = [];
    this.documents = [];
    this.groups = [];
    this.people = [];
    this.touches = [];
}

function shuri_location() {
    this.id = _guidEmpty;
    this.userType_Id = _guidEmpty;
    this.address = '';  //512 char max
    this.country = ''; //140 char max
    this.postal = '';
    this.latitude = 0;
    this.longitude = 0;
    this.place_Id = '';
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
}



function shuri_person() {
    this.id = _guidEmpty;
    this.firstname = '';   //140 char max
    this.middlename = '';  //140 char max
    this.lastname = '';    //140 char max
    this.nickname = '';    //140 char max
    this.name = '';    // ignored for post
    this.prefix = '';  //50 char max
    this.suffix = '';  //50 char max
    this.imageUrl = '';    //140 char max
    this.userType_Id = _guidEmpty;
    this.ownedBy_Id = _guidEmpty;
    this.primaryCP_Id = _guidEmpty;
    this.securityCP_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
    this.contactPoints = [];
    this.documents = [];
}

function shuri_tag() {
    this.id = _guidEmpty;
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.userType_Id = _guidEmpty;
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
}

function shuri_touch() {
    this.id = _guidEmpty;
    this.name = '';  //140 char max
    this.description = ''; //4000 char max
    this.userType_Id = '';
    this.dateStart = new Date();
    this.dateEnd = new Date();
    this.dateSchedule = new Date();
    this.dateSent = new Date();
    this.url = "";
    this.from = "";
    this.replyTo = "";
    this.location_Id = "";
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
}

function shuri_userType() {
    this.id = _guidEmpty;
    this.subscriptionId = _guidEmpty;
    this.name = '';  //140 char max
    this.codeName = '';  //50 char max
    this.value = ''; //4000 char max
    this.icon = '';  //140 char max - an ionic icon
    this.entityType = -1;
    this.primitive = 0;
    this.forPeople = false;
    this.forOrgs = false;
    this.forTouches = false;
    this.ownedBy_Id = _guidEmpty;
    this.ownedByGroup_Id = _guidEmpty;
    this.changeType = shuri_enums.changetype.update;
}

//--Admin
function shuri_userLogin(){
    this.username = ''; //140 char max
    this.password = ''; //50 char max
    this.rememberMe = false;
}

