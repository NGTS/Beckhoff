/*
func = function to execute
data = parameter
resourceID = -1 for doesn't matter, everything else with same resourceID doesn't run at the same time.
eventName = "" or null for none
timer = timeout
*/ 
function Mutex(func, data, resourceID, eventName, timer, triggerEvent) {
	if (!Mutex.Queue) Mutex.Queue = new Map();
	if (!Mutex.HoldQueue) Mutex.HoldQueue = new Map();
	if (!Mutex.Notifications) Mutex.Notifications = [];
   
	this.getName = function () { 
		if (this.data && this.data.resourceID)
			return this.data.id;
		else if (this.data && this.data.value)
			return "Show Type: " + this.data.value;
		else return getFunctionName(this.func) + " " + this.resourceID;
	}

	Mutex.notify = function (eventName) {
		debugln("Mutex notification <b>" + eventName + "</b>");
		Mutex.Notifications[eventName] = true;

		for (currentItem = Mutex.HoldQueue.first(); currentItem; ) {
			if (currentItem.eventName == eventName) {
				var tmp = currentItem;
				currentItem = Mutex.HoldQueue.next(currentItem.uid);
				debugln("Waking Mutex " + tmp.getName());
				Mutex.HoldQueue.remove(tmp.uid);
				Mutex.Queue.add(tmp.uid, tmp);
				tmp.timer = 10;
				tmp.attempt();
			}
			else currentItem = Mutex.HoldQueue.next(currentItem.uid);
		}

		Mutex.Notifications[eventName] = false;
	}

	this.attempt = function (start) {
		var currentItem, trigger = false;
		for (currentItem = start; currentItem; currentItem = Mutex.Queue.next(currentItem.uid)) {
			if (currentItem == start) trigger = true;
			if (!trigger) continue;

			if (currentItem.uid == this.uid)
				continue; //same item

			if ((currentItem.resourceID != this.resourceID) || (currentItem.func != this.func) || currentItem.resourceID == -1)
				continue;

			if (currentItem.number && (currentItem.number < this.number)) {
				if ((new Date()).getTime() > (currentItem.number + g_executionTimeout)) {
					debugln("Query timeout in Mutex <b>" + currentItem.getName() + "</b>");
					currentItem.finished();
					continue;
				}
				debugln("Mutex (" + Mutex.Queue.length() + ") " + currentItem.getName() + "/" + this.getName() + " " + (currentItem.number - this.number));
				return setTimeout("Mutex.next('" + this.uid + "','" + currentItem.uid + "')", 100);
			}
		}

		debugln("Running Mutex <b>" + this.getName() + "</b>" + (this.timer > 0 ? " with timeout: " + this.timer : ""));

		if (this.timer) return setTimeout("Mutex.run('" + this.uid + "')", this.timer);
		else this.func(this.data);
	}

	Mutex.run = function (uid) {
		var currentItem = Mutex.Queue.get(uid);
		currentItem.func(currentItem.data);
	}

	Mutex.finish = function (uid) {
		try {
			Mutex.Queue.get(uid).finished();
		}
		catch (e) {
		}
	}

	this.finished = function () {
		debugln("Mutex <b>" + this.getName() + "</b> finished (" + this.triggerEvent + ")");

		this.number = 0;
		Mutex.Queue.remove(this.uid);

		if (this.triggerEvent)
			Mutex.notify(this.triggerEvent);
	}

	Mutex.next = function (i, j) {
		Mutex.Queue.get(i).attempt(Mutex.Queue.get(j));
	}

	this.func = func;
	this.resourceID = resourceID;
	this.eventName = eventName;
	this.timer = timer;

	this.number = (new Date()).getTime();
	this.uid = this.number + " " + Math.floor(Math.random() * 1000) + " " + resourceID;

	if (triggerEvent != "")
		this.triggerEvent = triggerEvent;
	else this.triggerEvent = null;

	if (data != null) {
		data.mutexIndex = this.uid;
		this.data = data;
	}

	debugln("Creating Mutex: <b>" + this.getName() + "</b> (" + this.uid + "/" + this.triggerEvent + ")");

	if (this.eventName && (!Mutex.Notifications[this.eventName] || Mutex.Notifications[this.eventName] == false)) {
		Mutex.HoldQueue.add(this.uid, this);
	}
	else {
		Mutex.Queue.add(this.uid, this);
		this.attempt(Mutex.Queue.first());
	}
}

function Requests() {
	Requests.data = new Object();

	this.add = function (value, type) {
		if (!Requests.data[type]) Requests.data[type] = [];
		Requests.data[type].push(value);
	}

	this.remove = function (type) {
		Requests.data[type] = [];
	}

	this.get = function (type) {
		return Requests.data[type];
	}

	this.getItem = function (i, type) {
		return Requests.data[type][i];
	}

	this.length = function () {
		var retVal = 0;
		for (currentItem in Requests.data) {
			retVal += currentItem.length;
		}
		return retVal;
	}

	this.length = function (type) {
		return Requests.data[type].length;
	}
}


function Map() {
	this.data = new Object();

	this.add = function (key, value) {
		this.data[key] = value;
	}

	this.remove = function (key) {
		delete this.data[key];
	}

	this.get = function (key) {
		if (key == null) return null;
		else return this.data[key];
	}

	this.first = function () {
		return this.get(this.nextKey(null));
	}

	this.next = function (key) {
		return this.get(this.nextKey(key));
	}

	this.nextKey = function (key) {
		for (currentItem in this.data) {
			if (!key)
				return currentItem;

			if (key == currentItem)
				key = null;
		}
		return null;
	}

	this.length = function () {
		var retVal = 0;
		for (currentItem in this.data) {
			retVal++;
		}
		return retVal;
	}
}

function Module(name, type, index, typeId) {
	this.run = function (i, id, f) {
		load_start();

		var len = 0;
		var lenpos = -1;
		var values = new Array(this.functions[i].variables.length);

		for (var j = 0; j < this.functions[i].variables.length; j++) {
			if (this.functions[i].variables[j].type >= 0) {
				if (this.functions[i].variables[this.functions[i].variables[j].type].type == -3) { // If target variable of actual variable has type value -3 
					values[j] = document.getElementById(id + "," + this.functions[i].variables[this.functions[i].variables[j].type].name + this.functions[i].index).value.length;
				} else {
					if (id != -1) {
						values[j] = document.getElementById(id + "," + (this.index + this.functions[i].variables[j].sidx)).innerHTML.length;
					}
					else {
						values[j] = document.getElementById("a" + this.functions[i].variables[this.functions[i].variables[j].type].name + this.functions[i].index).value.length;
					}
				}
			}
			else if (this.functions[i].variables[j].type == -1) {
				lenpos = j;
			}
			else {
				if (this.functions[i].variables[j].type == -3) { // If actual variable has type value -3 
					values[j] = document.getElementById(id + "," + this.functions[i].variables[j].name + this.functions[i].index).value;
				} else {
					if (id != -1) {
						if (f == "s")
							values[j] = id;
						else
							values[j] = document.getElementById(id + "," + (this.index + this.functions[i].variables[j].sidx)).innerHTML;
					}
					else
						values[j] = document.getElementById("a" + this.functions[i].variables[j].name + this.functions[i].index).value;
				}
			}

			if (this.functions[i].variables[j].displaytype == "dir" && values[j].charAt(values[j].length - 1) == "\\") {
				values[j] = values[j].substring(0, values[j].length - 1);
			}

			if (this.functions[i].variables[j].length != 0)
				len += this.functions[i].variables[j].length;
			else
				len += values[j].length;
		}

		if (lenpos != -1)
			values[lenpos] = len;

		var data = [];

		for (var j = 0; j < values.length; j++) {
			data = prepare_data(values[j],
								this.functions[i].variables[j].datatype,
								this.functions[i].variables[j].length, data);
		}

		var qData = new QueryData(this.functions[i].index, 1, 2, 0, "data", data, "RunQueryWrite", false);
		qData.refresh = this.functions[i].refresh;
		new Mutex(query_write, qData, 0);
		new Mutex(load_end, null, -1, "RunQueryWriteFinished");
	}
	
	this.type = type;
	this.typeId = parseInt(typeId);
	this.name = name;
	this.index = parseInt(index);
	this.variables = [];
	this.functions = [];
	this.writeTriggers = [];
	this.vcount = 0;
	this.fcount = 0;
	this.wtcount = 0;
	this.arrlens = [];
	this.arraynames = [];
	this.arrayindexes = [];
	this.editable = false;
	this.loop = "";
	this.extendedarray = -1;
	this.needreboot = false;
	this.favorites = null;
	this.interval = 5000;
	this.order = 999;
	this.customFolder = "";
	this.hide = false;
	this.arrayhide = null;
	this.arrayComboBoxIndex = [];
	this.arrayComboBoxSubIndex = [];
	this.arrayComboBoxLabels = [];
	this.functionLinks = [];

	switch (this.typeId) {
		case MODULETYPE_NIC:

			this.order = 2;
			this.customFolder = "General";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Mac Address", "string", "", false, 20, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "IP Address", "string", "", true, 20, 4);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Subnet Mask", "string", "", true, 20, 4);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "DHCP", "bool", "ed", true, 1, -2);
			this.variables[this.vcount++] = new Variable(this.index + 1, 5, 0, "Default Gateway", "string", "", true, 20, 4);

			var fvars = [];
			fvars[0] = new FuncVar("DummyByte", "int", "", -1, 4, false, -1);
			this.functions[this.fcount++] = new Function("Release Address", this.index + 12288, fvars, 1, false);

			break;

		case MODULETYPE_TIME:

			this.order = 5;
			this.customFolder = "General";
		  
			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "SNTP Server", "string", "", true, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "SNTP Refresh", "uint", "days", true, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "UTC Time", "uint", "time", true, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "DateTime", "string", "", false, 40, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 5, 0, "Timezone", "uint", "timezone", true, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 0, 0, "Timezone Count", "uint", "hidden", false, 2, -1);

			break;

		case MODULETYPE_USERMGMT:

			this.order = 6;
			this.customFolder = "General";

			this.arraynames[0] = "Local Users";
			this.arraynames[1] = "Local Groups";
			this.arrayindexes[0] = 0; // Start array at index 0
			this.arrayindexes[1] = 4; // Start array at index 4

			var domainVisibility = "";
			if (!winxp)
				domainVisibility = "hidden";

			// Local Users
			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 1, "Name", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 1, "Domain", "string", domainVisibility, false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 1, "Group Membership", "string", "groupmember", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index, 0, 1, "", "func", 1, false, 0, -1); // Delete User

			// Local Groups
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 1, "Name", "string", "grouplist", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index, 0, 1, "", "func", 4, false, 0, -1); // Delete Group

			// Add User
			var fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 4, 4, false, -1);
			fvars[2] = new FuncVar("sizedomain", "uint", "hidden", 5, 4, false, -1);
			fvars[3] = new FuncVar("sizepassword", "uint", "", 6, 4, false, -1);
			fvars[4] = new FuncVar("Name", "string", "", -2, 0, false, -1);
			fvars[5] = new FuncVar("Domain", "string", domainVisibility, -2, 0, false, -1);
			fvars[6] = new FuncVar("Password", "string", "", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Add User", this.index + 12288, fvars, 1, true);

			// Delete User
			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, 1);
			fvars[2] = new FuncVar("sizedomain", "uint", "", 4, 4, false, 2);
			fvars[3] = new FuncVar("Name", "string", "", -2, 0, false, 1);
			fvars[4] = new FuncVar("Domain", "string", "", -2, 0, false, 2);

			this.functions[this.fcount++] = new Function("Delete", this.index + 12289, fvars, 0, true);

			// Set Group Membership
			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizeuser", "uint", "", 5, 4, false, -1);
			fvars[2] = new FuncVar("sizegroup", "uint", "", 6, 4, false, -1);
			fvars[3] = new FuncVar("sizedomain", "uint", "", 7, 4, false, -1);
			fvars[4] = new FuncVar("Membership", "bool", "groupmembership", -2, 1, false, -1);
			fvars[5] = new FuncVar("User", "string", "", -2, 0, false, -1);
			fvars[6] = new FuncVar("Group", "string", "", -2, 0, false, -1);
			fvars[7] = new FuncVar("Domain", "string", "groupdom", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Set Group Membership", this.index + 12291, fvars, 1, true);

			// Add Group
			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, -1);
			fvars[2] = new FuncVar("sizedomain", "uint", "", 4, 4, false, -1);
			fvars[3] = new FuncVar("Name", "string", "", -2, 0, false, -1);
			fvars[4] = new FuncVar("Domain", "string", "groupdom", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Create Group", this.index + 12292, fvars, 1, true);

			// Delete Group
			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, 4);
			fvars[2] = new FuncVar("sizedomain", "uint", "", 4, 4, false, -1);
			fvars[3] = new FuncVar("Name", "string", "", -2, 0, false, 4);
			fvars[4] = new FuncVar("Domain", "string", "groupdom", -3, 0, false, -1);

			this.functions[this.fcount++] = new Function("Delete", this.index + 12293, fvars, 0, true);

			break;

		case MODULETYPE_FTP:

			this.order = 16;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Active", "bool", "yn", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 0, "Allow Anonymous", "bool", "yn", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 0, "Allow Anonymous Upload", "bool", "ed", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 0, "Anonymous Vroots", "bool", "ed", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 5, 1, 0, "Use Authentification", "bool", "yn", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 6, 1, 0, "Default Directory", "string", "dir", true, 255, -1);

			break;

		case MODULETYPE_SMB:

			this.customFolder = "General";
			this.order = 8;
			this.arrayindexes[0] = 0;
			this.arrayComboBoxIndex[0] = this.index + 1;
			this.arrayComboBoxSubIndex[0] = 1;
			this.arrayComboBoxLabels[0] = "Share";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 2, "Name", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 2, "Path", "string", "dir", false, 255, -1);

			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 2, "Userlist", "string", "ul", false, 2000, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 2, "Access-Rights", "ar_string", "ar", false, 2000, -1);

			this.variables[this.vcount++] = new Variable(this.index, 0, 2, "Delete", "func", 1, false, 0, -1);


			var fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, -1);
			fvars[2] = new FuncVar("sizepath", "uint", "", 4, 4, false, -1);
			fvars[3] = new FuncVar("Name", "string", "", -2, 0, false, -1);
			fvars[4] = new FuncVar("Path", "string", "dir", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Add Share", this.index + 12288, fvars, 1, true);

			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("Name", "string", "", -2, 0, false, 1);

			this.functions[this.fcount++] = new Function("Delete Share", this.index + 12289, fvars, 0, true);


			fvars = [];
			fvars[0] = new FuncVar("ShareNameLen", "uint", "", 3, 4, false, -1);
			fvars[1] = new FuncVar("UserNameLen", "uint", "", 4, 4, false, -1);
			fvars[2] = new FuncVar("Access-Rights", "int", "ar_form", -2, 4, false, 1);
			fvars[3] = new FuncVar("Share-Name", "string", "", -2, 0, false, 1);
			fvars[4] = new FuncVar("User-Name", "string", "", -2, 0, false, 1);

			this.functions[this.fcount++] = new Function("Set user Access rights", this.index + 12290, fvars, 1, true);

			// Links Name field with ShareName field of function;
			// A select box filled with the existing share names will be created instead of a text input field;
			this.functionLinks[0] = new FunctionLink(this.index + 12290, 3, "Share-Name", this.index + 1, 1);

			break;

		case MODULETYPE_TWINCAT:

			this.customFolder = "TwinCAT";
			this.order = 20;

			this.arraynames[0] = "TwinCAT Routes";
			this.arrayindexes[0] = 8;

			this.arrayComboBoxIndex[0] = this.index + 2;
			this.arrayComboBoxSubIndex[0] = 1;
			this.arrayComboBoxLabels[0] = "Route";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Major Version", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Minor Version", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Build", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "AMS Net Id", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 5, 0, "Reg Level", "uint", "tcreglvl", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 6, 0, "TwinCAT Status", "uint", "tcstate", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 7, 0, "RunAsDevice", "bool", "yn", true, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 8, 0, "ShowTargetVisu", "bool", "yn", true, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 2, "Name", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 2, "Address", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 2, "AMS", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 5, 1, 2, "Flag", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 6, 1, 2, "Timeout", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 7, 1, 2, "Transport", "uint", "transport", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index, 0, 2, "Delete", "func", 1, false, 0, -1);

			var fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("Flags", "uint", "routeflags", -2, 4, false, -1);
			fvars[2] = new FuncVar("Timeout", "uint", "", -2, 4, false, -1);
			fvars[3] = new FuncVar("Transport", "uint", "transport", -2, 2, false, -1);
			fvars[4] = new FuncVar("NetId", "netid", "netid", -2, 6, false, -1);
			fvars[5] = new FuncVar("sizename", "uint", "", 7, 4, false, -1);
			fvars[6] = new FuncVar("sizeaddress", "uint", "", 8, 4, false, -1);
			fvars[7] = new FuncVar("Name", "string", "", -2, 0, false, -1);
			fvars[8] = new FuncVar("Address", "string", "", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Add Route", this.index + 12288, fvars, 1, true);

			fvars = [];
			fvars[0] = new FuncVar("sizename", "uint", "", 1, 4, false, 2);
			fvars[1] = new FuncVar("Name", "string", "", -2, 0, false, 2);

			this.functions[this.fcount++] = new Function("Delete Route", this.index + 12289, fvars, 0, true);

			break;

		case MODULETYPE_DATASTORE:

			this.order = 22;

			var fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, -1);
			fvars[2] = new FuncVar("Path", "string", "dsvar", -2, 0, false, -1);

				  this.bidx = this.index + 12288;
			this.functions[this.fcount++] = new Function("Browse DataStore", this.index + 12288, fvars, 2, true);

			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, -1);
			fvars[2] = new FuncVar("sizevalue", "uint", "", 4, 4, false, -1);
			fvars[3] = new FuncVar("Name", "string", "", -2, 0, false, -1);
			fvars[4] = new FuncVar("Value", "string", "", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Add Item", this.index + 12289, fvars, 1, true);

			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 2, 4, false, -1);
			fvars[2] = new FuncVar("Name", "string", "", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Delete Item", this.index + 12290, fvars, 0, true);

			break;

		case MODULETYPE_SOFTWARE:

			this.customFolder = "General";
			this.order = 3;
			this.arrayindexes[0] = 0;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 1, "Name", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 1, "Company", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 1, "Date", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 1, "Version", "string", "", false, 255, -1);

			break;

		case MODULETYPE_CPU:

			this.customFolder = "General";
			this.order = 0;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "CPU Frequency (MHz)", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Current CPU Usage (%)", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Current CPU Temperature (&deg;C)", "int", "cputemp", false, 2, -1);

			this.loop = "cpuloop";
			this.interval = 3000;

			break;

		case MODULETYPE_MEMORY:

			this.customFolder = "General";
			this.order = 1;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Total physical memory", "uint", "mb", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Available physical memory", "uint", "mb", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Total storage memory", "uint", "mb", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "Available storage memory", "uint", "mb", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 5, 0, "Memory division", "uint", "memdiv", false, 4, -1);

			this.loop = "memoryloop";
			this.interval = 3000;

			break;

		case MODULETYPE_PLC:

			this.customFolder = "TwinCAT";
			this.order = 21;

			var fvars = [];

			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizename", "uint", "", 3, 4, false, 1);
			fvars[2] = new FuncVar("Path", "string", "plcvar", -2, 0, false, 1);

			this.functions[this.fcount++] = new Function("Browse PLC", this.index + 12290, fvars, 2, true);

			fvars = [];
			fvars[0] = new FuncVar("SubIndex", "uint", "", -2, 4, false);

			this.functions[this.fcount++] = new Function("Delete Group", this.index + 12291, fvars, 0, true);
			this.functions[this.fcount++] = new Function("Delete Variable", this.index + 12292, fvars, 0, true);

				   
			this.bidx = this.index + 12288;
			
			this.favorites = [];
			break;

		case MODULETYPE_DISPLAY:

			this.customFolder = "General";
			this.order = 4;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Current Resolution", "uint", "resolution", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 0, 0, "Resolution Count", "uint", "hidden", false, 2, -1);

			this.needreboot = false;

			break;

		case MODULETYPE_EWF:

			this.customFolder = "Write Filter";
			this.order = 23;                
											  
			this.arraynames[0] = "Volumes";
			this.arrayindexes[0] = 0;

			this.arrayComboBoxIndex[0] = this.index + 1;
			this.arrayComboBoxSubIndex[0] = 1;
			this.arrayComboBoxLabels[0] = "Volume";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 2, "Volume Name", "string", "", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 2, "Volume ID", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 2, "State", "uint", "ewf-state", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 2, "Type", "uint", "ewf-type", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 5, 1, 2, "Boot command", "uint", "ewf-bootcommand", true, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index, 1, 2, "Set Boot command", "apply", 0, false, 0, -1);
			this.variables[this.vcount++] = new Variable(this.index, 0, 2, "Commit and Disable Live", "func", 0, false, 0, -1);

			var fvars = [];
			fvars[0] = new FuncVar("VolumeName", "string", "", -2, 0, false, 1);

			this.functions[this.fcount++] = new Function("Commit and Disable Live", this.index + 12288, fvars, 0, true);

			break;

		case MODULETYPE_FBWF:

			this.customFolder = "Write Filter";
			this.order = 24;

			this.arraynames[0] = "Volumes";
			this.arrayindexes[0] = 6;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "State", "bool", "ed", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Compression", "bool", "ed", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "PreAllocation", "bool", "ed", false, 1, -1);

			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 0, "Next State", "bool", "ed", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 2, 0, "Next Compression", "bool", "ed", true, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 3, 0, "Next PreAllocation", "bool", "ed", true, 1, -1);

			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 1, "Volume", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 1, "Exclusions", "nstring", "exclusion", false, 255, -1);

			fvars = [];
			fvars[0] = new FuncVar("sizeExclusion", "uint", "", -1, 4, false, 1);
			fvars[1] = new FuncVar("Volume", "char", "", -2, 4, false, 1);
			fvars[2] = new FuncVar("Exclusion", "string", "", -2, 0, false, 1);

			this.functions[this.fcount++] = new Function("Remove Exclusion", this.index + 12291, fvars, 0, false);

			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, 3);
			fvars[1] = new FuncVar("Volume", "string", "", -2, 4, false, 3);
			fvars[2] = new FuncVar("Clear Exclusions", "bool", "", -2, 1, false, 3);

			this.functions[this.fcount++] = new Function("Remove Volume", this.index + 12289, fvars, 0, false);

			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizeVolume", "uint", "", 2, 4, false, -1);
			fvars[2] = new FuncVar("Volume", "string", "", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Commit", this.index + 12293, fvars, 0, false);

			var fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizeVolume", "uint", "", 2, 4, false, -1);
			fvars[2] = new FuncVar("Volume", "string", "", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Add Volume", this.index + 12288, fvars, 1, false);

			fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("sizeVolume", "uint", "", 3, 4, false, -1);
			fvars[2] = new FuncVar("sizeExclusion", "uint", "", 4, 4, false, -1);
			fvars[3] = new FuncVar("Volume", "string", "", -2, 0, false, -1);
			fvars[4] = new FuncVar("Exclusion", "string", "dir", -2, 0, false, -1);

			this.functions[this.fcount++] = new Function("Add Exclusion", this.index + 12290, fvars, 1, false);

			this.needreboot = true;
			break;

		case MODULETYPE_SILICONDRIVE:

			this.order = 9;
			this.customFolder = "General";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Total EraseCounts", "uint", "", false, 8, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Drive Usage (%)", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Number of Spares", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "Spares Used", "uint", "", false, 2, -1);

			break;
			
		case MODULETYPE_DISKMANAGEMENT:

			this.order = 9;
			this.customFolder = "General";

			this.arraynames[0] = "Drives";
			this.arrayindexes[0] = 0;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 1, "Drive Letter", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 1, "Volume Label", "string", "", true, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 1, "File System", "string", "groupmember", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 1, "Drive Type", "uint", "drivetype", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 0, 1, "Write Label", "func", 0, false, 0, -1);
			
			var fvars = [];
			fvars[0] = new FuncVar("size", "uint", "", -1, 4, false, -1);
			fvars[1] = new FuncVar("Label", "string", "", -2, 0, false, 1);

			this.functions[this.fcount++] = new Function("Write Label", this.index + 1, fvars, 0, false);
			
			//overwrite run function for this module
			this.run = function(i, id, f)
			{
				if (mod.variables[i].array == 1)
				{
				  id = id+","+(mod.index+2);
				  var value = document.getElementById(id).firstChild.innerHTML;
				  
				  var k = parseInt(id[1])-1;
				  new Mutex(query_write, new QueryData(mod.index+2, mod.variables[i].subindex+k, 0, 255, "string", value, "apply", false), 0);
				}
			}
			
			break;

		case MODULETYPE_OS:

			this.order = 9;
			this.customFolder = "General";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Major Version", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Minor Version", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Build", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "CSD Version", "string", "", false, 20, -1);
			
			break;

		case MODULETYPE_RAID:

			this.order = 10;
			this.customFolder = "General";

			this.arraynames[0] = "Drives";
			this.arraynames[1] = "Raids";
			this.arrayindexes[0] = 2;
			this.arrayindexes[1] = 4;
			this.arrayhide = [];
			this.arrayhide[0] = true;
			this.arrayhide[1] = false;


			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "State", "uint", "RaidState", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Offline reason", "uint", "RaidReason", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 9, 1, 1, "Serial Number", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 10, 1, 1, "State", "uint", "DriveState", false, 8, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 1, "Type", "uint", "RaidType", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 1, "Info", "uint", "RaidInfo", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 1, "Drives", "string", "RaidDrives", false, 255, -1);

			this.loop = "raidloop";
			this.interval = 3000;

			break;

		case MODULETYPE_FAN:

			this.customFolder = "General";
			this.order = 10;

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Fan speed (rpm)", "int", "fanspeed", false, 2, -1);

			this.loop = "fanloop";
			this.interval = 3000;

			break;


		case MODULETYPE_MAINBOARD:

			this.customFolder = "General";
			this.order = 10;

			this.arraynames[0] = "Voltage Information";
			this.arrayindexes[0] = 13;

			// 0x8nn1 - Mainboard Information
			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Mainboard Type", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Serial Number", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Production Date", "string", "", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "Boot Count", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 5, 0, "Operating Time in Minutes", "uint", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 6, 0, "Min Board Temperature (&deg;C)", "int", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 7, 0, "Max Board Temperature (&deg;C)", "int", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 8, 0, "Min Input Voltage (mV)", "int", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 9, 0, "Max Input Voltage (mV)", "int", "", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 10, 0, "Mainboard Temperature (&deg;C)", "int", "", false, 4, -1);

			// 0x8nn2 - Version Information
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 0, "Mainboard Revision", "uint", "", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 2, 0, "Bios Major Version", "uint", "", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 3, 0, "Bios Minor Version", "uint", "", false, 1, -1);

			// 0x8nn3 - Voltage Information
			this.variables[this.vcount++] = new Variable(this.index + 3, 1, 1, "Name", "string", "", false, 255, -1);
			// 0x8nn4 - Voltage Information
			this.variables[this.vcount++] = new Variable(this.index + 4, 1, 1, "Location", "int", "MbVInfoLocation", false, 2, -1);
			// 0x8nn5 - Voltage Information
			this.variables[this.vcount++] = new Variable(this.index + 5, 1, 1, "Voltage (mV)", "int", "", false, 2, -1);
			// 0x8nn6 - Voltage Information
			this.variables[this.vcount++] = new Variable(this.index + 6, 1, 1, "Nominal Voltage (mV)", "int", "", false, 2, -1);


			this.loop = "mbloop";
			this.interval = 3000;

			break;

		case MODULETYPE_UPS:

			this.customFolder = "General";
			this.order = 9;

			// 0x8nn1 - UPS Information
			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "UPS Model", "string", "UPSModel", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 2, 0, "Vendor  Name", "string", "UPSVendorName", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 3, 0, "Version", "uint", "UPSVersion", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 4, 0, "Revision", "uint", "UPSRevision", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 5, 0, "Build", "uint", "UPSBuild", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 6, 0, "Serial Number", "string", "UPSSerialNumber", false, 255, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 7, 0, "Power Status", "uint", "UPSPowerStatus", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 8, 0, "Communication Status", "uint", "UPSCommunicationStatus", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 9, 0, "Battery Status", "uint", "UPSBatteryStatus", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 10, 0, "Battery Capacity (in %)", "uint", "UPSBatteryCapacity", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 11, 0, "Battery Runtime (in seconds)", "uint", "UPSBatteryRuntime", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 12, 0, "Persistent Power Fail Count", "bool", "UPSPersistentPowerFailCount", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 13, 0, "Power Fail Counter", "uint", "UPSPowerFailCounter", false, 4, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 14, 0, "Fan Error", "bool", "UPSFanError", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 1, 15, 0, "No Battery", "bool", "UPSNoBattery", false, 1, -1);

			var wtDesc = "Press the button to start Test. Power off System and wait as long as the computer turns off.<br />" 
							+ "Start computer and read new \"Battery Runtime (in seconds)\".";
			this.writeTriggers[this.wtcount++] = new WriteTrigger("Test Capacity", wtDesc, this.index + 1, 16, "bool", 1, true, "wtUPSTestCapacity");

			// 0x8nn2 - UPS GPIO Pin Information
			this.variables[this.vcount++] = new Variable(this.index + 2, 1, 0, "UPS GPIO Pin Address", "uint", "", false, 2, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 2, 0, "UPS GPIO Pin Offset", "uint", "", false, 1, -1);
			this.variables[this.vcount++] = new Variable(this.index + 2, 3, 0, "UPS GPIO Pin Params", "uint", "", false, 1, -1);

			break;

		case MODULETYPE_MISC:

			this.order = 7;
			this.customFolder = "General";

			this.variables[this.vcount++] = new Variable(this.index + 1, 1, 0, "Startup Numlock State", "bool", "ed", true, 1, -1);

			var fvars = [];
			fvars[0] = new FuncVar("dummy", "int", "hidden", -2, 1, false, -1);

			this.functions[0] = new Function("Reboot", rebootindex, fvars, 2, false);

			if (!winxp) {
				var fvars = [];
				fvars[0] = new FuncVar("dummy", "int", "hidden", -2, 1, false, -1);

				this.functions[1] = new Function("Restore Factory Settings", this.index + 12288, fvars, 1, false);
			}

			this.needreboot = false;

			break;

		case MODULETYPE_CUSTOMERPAGE:

			this.order = 25;
			this.needreboot = false;

			break;

		default:
			debugln("No output defined");
			this.hide = true;
	}

	for (var i = 0; i < this.vcount; i++) {
		if (this.variables[i].editable && this.variables[i].array == 0) {
			this.editable = true;
			break;
		}
	}

	this.show = function (drawtable) {

		window.scrollTo(0, 0); // Goto top of website

		if (this.typeId == 513) {
			show_customer_pages(this.name, this.url);
			return;
		}

		is_open = [];
		var text = "";

		text = "<h2>" + this.name + "</h2>";

		debugln("Showing " + this.name + " with " + this.vcount
				+ " variables and " + this.functions.length + " functions");

		if (this.favorites != null) {
			var plci = get_object("PLC");

			if (plci != -1 && mod_list[plci].favorites != null) {
				text += "<p><b>Filter Favorites:</b> <select id=\"favgroups\" onChange=\"favchange()\" style=\"z-index:0;\"><option value=\"none\">browse</option>";

				for (var i = 0; i < mod_list[plci].favorites.length; i++) {
					text += "<option value=\"" + mod_list[plci].favorites[i]
							+ "\">" + mod_list[plci].favorites[i] + "</option>";
				}

				text += "</select></p><p id=\"cFavList\"></p>";
			}
		}

		if (this.bidx) {
			bidx = this.bidx;
		}

		if (this.vcount > 0) {
			if (this.variables[0].array == 0)
				text += "<table cellspacing=\"1\" class=\"datatable\" width=\"90%\" align=\"center\"><td class=\"toptable\" width=\"38%\">Name</td><td class=\"toptable\" width=\"67%\">Value</td></tr>";

			var hiddentags = "";
			var lastIndex = 0;
			var currentIndex = lastIndex;
			var currentArray = 0;
			var currentStart = 0;

			this.qidx = [];
			this.qsidx = [];
			this.qflag = [];
			this.qlen = [];
			this.qtype = [];
			this.qiarr = [];

			if (this.arrlens.length == 0) {
				var send = false;

				for (var i = 0; i < this.arrayindexes.length; i++) {
					this.qidx.push(this.variables[this.arrayindexes[i]].index);
					this.qsidx.push(0);
					this.qflag.push(0);
					this.qlen.push(2);
					this.qtype.push("int");
					this.qiarr.push(-1);
					send = true;
				}

				if (send) {
					new Mutex(query_readmultiple, new QueryData(this.qidx, this.qsidx, this.qflag,
							  this.qlen, this.qtype, this.qiarr, "Arraylens", false), 0);
					return;
				}
			}

			for (var i = 0; i < this.vcount; i++) {
				currentIndex = this.arrayindexes[currentArray];

				if (this.variables[i].array == 0) {

					this.qidx.push(this.variables[i].index);
					this.qsidx.push(this.variables[i].subindex);
					this.qflag.push(0);
					this.qlen.push(this.variables[i].len);
					this.qtype.push(this.variables[i].datatype);
					this.qiarr.push(-1);

					if (this.variables[i].displaytype != "hidden") {
						var icon = getIcon(this.variables[i]);

						if (icon != "") {
							icon = "<span id=\"v"
								   + this.qsidx[i]
								   + ","
								   + this.qidx[i]
								   + "icon\">"
								   + icon
								   + "</span>";
						}

						var tableclass = "lockedtable";

						if (this.variables[i].editable)
							tableclass = "normaltable";

						text += "<tr id=\"tr"
								+ this.qsidx[i]
								+ ","
								+ this.qidx[i]
								+ "\"><td width=\"38%\" class=\"titletable\"><table width=\"100%\"><tr><td class=\"titletable\">"
								+ this.variables[i].name
								+ "</td><td class=\"titletable\" align=\"right\"><image title=\"Use the apply button to accept changes\" id=\"v"
								+ this.qsidx[i]
								+ ","
								+ this.qidx[i]
								+ "info\" style=\"display:none;\" src=\"images/info.gif\" alt=\"changed\"></td><tr></table><td width=\"62%\" class=\""
								+ tableclass
								+ "\"><table width=\"100%\"><tr><td valign=\"top\">"
								+ icon
								+ "</td><td class=\""
								+ tableclass
								+ "\" width=\"100%\" id=\"v"
								+ this.qsidx[i]
								+ ","
								+ this.qidx[i]
								+ "td\"><span style=\"width:100%; display: block;\" id=\"v"
								+ this.qsidx[i] + "," + this.qidx[i]
								+ "\"></span></td></tr></table></tr>";

					}
					else {

						hiddentags += "<input type=\"hidden\" value=\"0\" id=\"v"
									  + this.qsidx[i] + "," + this.qidx[i] + "\">";
					}

					hiddentags += "<input type=\"hidden\" value=\"0\" id=\"v"
								  + this.qsidx[i] + "," + this.qidx[i] + "old\">";
				}
				else {



					if (this.arrayindexes[currentArray] != null && i >= this.arrayindexes[currentArray]) {


						if (currentArray == 0) {
							text += this.closeArray(-1, 0, 0, 0);
						}
						else {
							text += this.closeArray(this.variables[i].array,
													this.arrlens[currentArray - 1],
													(currentArray - 1),
													this.arrayindexes[currentArray - 1], i)
						}

						if (this.arraynames[currentArray] && (this.arrayhide == null || (this.arrayhide != null && !this.arrayhide[currentArray])))
							text += "<h3>" + this.arraynames[currentArray]
											+ "</h3>";

						lastIndex = currentIndex;
						currentArray++;
					}
				}


			}

			if (this.arrayindexes.length > 0)
				text += this.closeArray(this.variables[i - 1].array,
										this.arrlens[currentArray - 1], (currentArray - 1),
										this.arrayindexes[currentArray - 1],
										this.variables.length)
						+ hiddentags;
			else
				text += this.closeArray(-1, 0, 0, 0) + hiddentags;

			new Mutex(query_readmultiple, new QueryData(this.qidx, this.qsidx, this.qflag, this.qlen, this.qtype, this.qiarr, "Filltable", false), 0);
		}
		else if (this.functions.length == 0) {
			clear_info();
			show_info("Not implemented", "red");
		}

		/* WRITETRIGGER */

		for (var i = 0; i < this.writeTriggers.length; i++) {

			text += "<h3>" + this.writeTriggers[i].name + "</h3></span>";

			if (this.writeTriggers[i].desc != "")
				text += "<p>" + this.writeTriggers[i].desc + "</p>"

			text += "<p align=\"center\"><input class=\"button\" type=\"submit\" onclick=\"runWriteTrigger("
							+ i
							+ ")\" id=\"wt"
							+ this.writeTriggers[i].index
							+ "\" name=\""
							+ this.writeTriggers[i].name
							+ "\" value=\""
							+ this.writeTriggers[i].name
							+ "\"></p>";

		}

		/* FUNCTIONS */

		for (var i = 0; i < this.functions.length; i++) {
			if (this.functions[i].show != 0) {
				var hiddenfields = "";
				text += "<span id=\"function"
						+ i
						+ "\"><h3>"
						+ this.functions[i].name
						+ "</h3><p><table class=\"datatable\" width=\"90%\" cellpadding=\"1\" cellspacing=\"1\" align=\"center\">";

				for (var j = 0; j < this.functions[i].variables.length; j++) {
					if (this.functions[i].variables[j].type == -2) {

						var funcLink = null;
						for (var k = 0; k < this.functionLinks.length; k++) {
							if (this.functionLinks[k].funcIndex == this.functions[i].index && this.functionLinks[k].funcVarIndex == j) {
								funcLink = this.functionLinks[k];
								break;
							}
						}

						if (funcLink) {
							text += "<tr "
								+ (this.functions[i].variables[j].displaytype == "hidden" ? "style=\"display: none\""
								   : "")
								+ "><td class=\"titletable\" width=\"38%\" valign=\"top\"><b>"
								+ this.functions[i].variables[j].name
								+ "</b></td><td class=\"normaltable\" width=\"62%\">"
								+ "<select id=\"a" + this.functions[i].variables[j].name + this.functions[i].index
								+ "\">"
								+ "<option selected value=\"\">-</option>"
								+ "</select>"
								+ "</td></tr>";
						} else {
							text += "<tr "
								+ (this.functions[i].variables[j].displaytype == "hidden" ? "style=\"display: none\""
								   : "")
								+ "><td class=\"titletable\" width=\"38%\" valign=\"top\"><b>"
								+ this.functions[i].variables[j].name
								+ "</b></td><td class=\"normaltable\" width=\"62%\">"
								+ format_add(
									this.functions[i].variables[j].displaytype,
									"a"
									+ this.functions[i].variables[j].name + this.functions[i].index,
									this.functions[i].variables[j].disable)
								+ "</td></tr>";
						}




					}
				}


				if (this.functions[i].index == rebootindex)
					text += "</table><p align=\"center\"><input class=\"button\" type=\"submit\" onclick=\"doReboot(true)\" value=\""
							+ this.functions[i].name + "\"></p>";
				else
					text += "</table>";

				if (this.functions[i].show != 2)
					text += "<p align=\"center\"><input class=\"button\" type=\"submit\" onclick=\"runfunction("
							+ i
							+ ",-1,'f')\" id=\""
							+ this.functions[i].index
							+ "\" name=\""
							+ this.functions[i].name
							+ "\" value=\""
							+ this.functions[i].name
							+ "\"></p>";

				text += hiddenfields + "</span>";
			}
		}

		if (drawtable) {
			document.getElementById("current").innerHTML += text;

			if (g_interval)
				window.clearInterval(g_interval);

			if (this.loop.length > 0) {
				g_interval = window.setInterval(function () {
					if (mod && mod.loop.length > 0) eval(mod.loop + "();")
				}, this.interval);
			}
		}

		return;
	}

	this.closeArray = function (type, len, ca, start, end) {

		var text = "";

		if (this.editable && type == -1)
			text += "<p align=\"center\"><input class=\"button_disabled\" type=\"submit\" onclick=\"apply(-1)\" id=\"apply\" name=\"apply\" value=\"Apply\" DISABLED></p>";

		if (type == -1)
			return "</table>" + text;

		if (len == 0) {
			if (this.arrayhide == null || (this.arrayhide != null && !this.arrayhide[ca]))
				return text + "<p align=\"center\">no items available</p>";
			else return text;
		}

		if (type == 1) {
			text += "<table " + ((this.arrayhide == null || (this.arrayhide != null && !this.arrayhide[ca])) ? "" : "style=\"display:none\"") + " cellspacing=\"1\" class=\"datatable\" width=\"90%\" align=\"center\">";

			for (var i = start; i < end; i++) // add header
			{

				if (this.variables[i].displaytype != "hidden")
					text += "<td class=\"toptable\">" + this.variables[i].name + "</td>";
				else
					text += "<td class=\"toptable\" style=\"display:none;\">" + this.variables[i].name + "</td>";
			}
		}
		else {
			var sel = "";

			if (this.arrayComboBoxIndex && this.arrayComboBoxSubIndex && this.arrayComboBoxIndex[ca] && this.arrayComboBoxSubIndex[ca]) {
				for (var j = 0; j < len; j++) {
					sel += "<option id=\"option"
					   + (this.variables[start].subindex + j) + ","
					   + (this.variables[start].index) + "\" value=\"" + j
					   + "\"></option>";
				}
			}
			else {
				for (var j = 0; j < len; j++) {
					sel += "<option id=\"option"
					   + (this.variables[start].subindex + j) + ","
					   + (this.variables[start].index) + "\" value=\"" + j
					   + "\">#" + (j + 1) + "</option>";
				}
			}


			if (this.arrayComboBoxLabels && this.arrayComboBoxLabels.length > 0 && this.arrayComboBoxLabels[ca] && this.arrayComboBoxLabels[ca] != "") {
				text += "<table cellspacing=\"1\" class=\"datatable\" width=\"90%\" align=\"center\"><tr><td class=\"normaltable\"><span class=\"comboBoxLabel\">" + this.arrayComboBoxLabels[ca] + ":</span> <select onchange=\"show_extended("
					+ ca + ",this.value)\">" + sel + "</select></td></tr><tr>";
			} else {
				text += "<table cellspacing=\"1\" class=\"datatable\" width=\"90%\" align=\"center\"><tr><td class=\"normaltable\"><select onchange=\"show_extended("
					+ ca + ",this.value)\">" + sel + "</select></td></tr><tr>";
			}



		}

		var k = 0;

		for (var j = 0; j < len; j++) {
			if (type == 1)
				text += "<tr id=\"tr" + j + "\">";
			else {
				text += "<table id=\"extendedtable"
						+ ca
						+ "_"
						+ j
						+ "\" "
						+ (j == 0 ? "" : "style=\"display:none\"")
						+ " cellspacing=\"1\" class=\"datatable\" width=\"90%\" align=\"center\"><tr><td class=\"toptable\" colspan=\"2\" id=\"header";


				if (this.arrayComboBoxIndex && this.arrayComboBoxSubIndex && this.arrayComboBoxIndex[ca] && this.arrayComboBoxSubIndex[ca]) {
					text += (this.variables[this.arrayindexes[ca]].subindex + j)
						+ "," + this.variables[this.arrayindexes[ca]].subindex
						+ "\"><b><span id=\"headerContent"
						+ (this.variables[this.arrayindexes[ca]].subindex + j)
						+ ","
						+ this.variables[this.arrayindexes[ca]].index
						+ "\"></span></b></td></td>";
				} else {
					text += (this.variables[this.arrayindexes[ca]].subindex + j)
						+ "," + this.variables[this.arrayindexes[ca]].subindex
						+ "\"><b>#" + (j + 1) + "</b></td></td>";
				}
			}

			for (var i = start; i < end; i++) {
				var hiddentags = "";
				if (this.variables[i].datatype != "func" && this.variables[i].datatype != "apply") {
					this.qidx.push(this.variables[i].index);
					this.qsidx.push(this.variables[i].subindex + j);
					this.qflag.push(0);
					this.qlen.push(this.variables[i].len);
					this.qtype.push(this.variables[i].datatype);
					this.qiarr.push(i);

					if (type == 1) {
						if (this.variables[i].displaytype != "hidden")
							text += "<td class=\"normaltable\" width=\"400\" id=\"a"
									+ this.qsidx[this.qidx.length - 1]
									+ ","
									+ this.qidx[this.qidx.length - 1]
									+ "td\"><table><td>"
									+ (this.variables[i].editable ? "<img src=\"IMAGES/edit.gif\" \>" : "")
									+ "</td><td><span style=\"width:100%; display: block;\" id=\"a"
									+ this.qsidx[this.qidx.length - 1]
									+ ","
									+ this.qidx[this.qidx.length - 1]
									+ "\"></span></td></table></td>";
						else
							text += "<td class=\"normaltable\" style=\"display:none;\" width=\"400\" id=\"a"
									+ this.qsidx[this.qidx.length - 1]
									+ ","
									+ this.qidx[this.qidx.length - 1]
									+ "td\"><span style=\"width:100%; display: block;\" id=\"a"
									+ this.qsidx[this.qidx.length - 1]
									+ ","
									+ this.qidx[this.qidx.length - 1]
									+ "\"></span></td>";
					}
					else {
						var icon = getIcon(this.variables[i]);

						if (icon != "") {
							icon = "<span id=\"v"
								   + this.qsidx[i]
								   + ","
								   + this.qidx[i]
								   + "icon\">"
								   + icon
								   + "</span>";
						}

						text += "<tr id=\"tr"
								+ this.qsidx[this.qidx.length - 1]
								+ ","
								+ this.qidx[this.qidx.length - 1]
								+ "\"><td class=\"normaltable\" width=\"40%\">"
																+ "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\"><tr>"
																+ "<td style=\"text-align:left;\"><b>"
								+ this.variables[i].name
								+ "</b></td>"
																+ "<td style=\"text-align:right; \"><image title=\"Use the 'Set Bootcommand' button to accept changes\" id=\"a"
								+ this.qsidx[this.qidx.length - 1]
								+ ","
								+ this.qidx[this.qidx.length - 1]
								+ "info\" style=\"display:none;\" src=\"images/info.gif\" alt=\"changed\" style=\"\"></td></tr></table>"
																+ "</td><td class=\"normaltable\" width=\"60%\" id=\"a"
								+ this.qsidx[this.qidx.length - 1]
								+ ","
								+ this.qidx[this.qidx.length - 1]
								+ "td\">";



						if (icon != "") {
							text += "<table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" border=\"0\"><tr><td width=\"25px\">"
																					+ icon
																					+ "</td><td>";
						}

						text += "<span style=\"width:100%; display: block;\" id=\"a"
								+ this.qsidx[this.qidx.length - 1] + ","
								+ this.qidx[this.qidx.length - 1]
								+ "\"></span>";

						if (icon != "") {
							text += "</td></tr></table>";
						}

						hiddentags += "<input type=\"hidden\" value=\"0\" id=\"a"
								   + this.qsidx[this.qidx.length - 1] + "," + this.qidx[this.qidx.length - 1] + "old\">";
						text += hiddentags;


						text += "</td></tr>";



					}
				}
				else {

					if (this.variables[i].datatype == "apply" && type == 2) {
						text += "<tr><td class=\"normaltable\" colspan=\"2\" width=\"100%\" align=\"center\"><span style=\"width:100%; display: block;\"><input class=\"button_disabled\" id=\"apply\"  type=\"submit\" onclick=\"apply("
																	+ (this.variables[i].subindex + j)
																	+ ")\" name=\""
																	+ this.variables[i].name
																	+ "\" value=\""
																	+ this.variables[i].name
																	+ "\" DISABLED></span></td></tr>";
					}
					else {
						var tmp1, tmp2;

						if (this.variables[i].subindex == -1) {
							tmp1 = j + 1;
							tmp2 = "s";
						}
						else {
							tmp1 = "a" + (this.variables[i].subindex + j + 1);
							tmp2 = "f";
						}

						if (type == 1) {
							text += "<td class=\"normaltable\" width=\"400\" align=\"center\"><span style=\"width:100%; display: block;\"><input class=\"button\" type=\"submit\" onclick=\"runfunction("
																	+ this.variables[i].displaytype
																	+ ",'"
																	+ tmp1
																	+ "','"
																	+ tmp2
																	+ "')\" name=\""
																	+ this.functions[this.variables[i].displaytype].name
																	+ "\" value=\""
																	+ this.functions[this.variables[i].displaytype].name
																	+ "\">";

							// Print hidden input for custom value
							for (var k = 0; k < this.functions[this.variables[i].displaytype].variables.length; k++) {
								if (this.functions[this.variables[i].displaytype].variables[k].type == -3) {
									text += custom_value_hidden_input_add(
															this.functions[this.variables[i].displaytype].variables[k].displaytype,
															tmp1 + "," + this.functions[this.variables[i].displaytype].variables[k].name + this.functions[this.variables[i].displaytype].index
															);
								}
							}

							text += "</span></td>";
						}
						else {
							text += "<tr><td class=\"normaltable\" colspan=\"2\" align=\"center\"><span style=\"width:100%; display: block;\"><input class=\"button\" type=\"submit\" onclick=\"runfunction("
																	+ this.variables[i].displaytype
																	+ ",'"
																	+ tmp1
																	+ "','"
																	+ tmp2
																	+ "')\" name=\""
																	+ this.functions[this.variables[i].displaytype].name
																	+ "\" value=\""
																	+ this.functions[this.variables[i].displaytype].name
																	+ "\">";


							// Print hidden input for custom value
							for (var k = 0; k < this.functions[this.variables[i].displaytype].variables.length; k++) {
								if (this.functions[this.variables[i].displaytype].variables[k].type == -3) {
									text += custom_value_hidden_input_add(
															this.functions[this.variables[i].displaytype].variables[k].displaytype,
															tmp1 + "," + this.functions[this.variables[i].displaytype].variables[k].name + this.functions[this.variables[i].displaytype].index
															);
								}
							}

							text += "</span></td></tr>";
						}
					}

				}
			}
		}

		if (type == 1)
			text += "</tr>";
		else
			text += "</table>"
		text += "</tr></table>";

		return text;
	}

	this.get_request_variable = function (i) //skip non-editable variables
	{
		var k = 0, j;
		for (j = 0; j <= i; j++) {
			if (this.variables[j].editable == false)
				i++;
		}
		return this.variables[i];
	}
}
