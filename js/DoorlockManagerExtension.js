'use strict';

(function() {
    /*************************************************************************
     * Class DoorlockManagerExtension
     *************************************************************************/
    class DoorlockManagerExtension extends window.Extension {
        constructor() {
            super('doorlock-manager');
            this.addMenuEntry('Door Lock Manager');
            this.doorLocks = [];

            if (!window.Extension.prototype.hasOwnProperty('load')) {
                this.load();
            }
        }

        load() {
            this.content = '';

            this.RetrieveDoorLocks();
            this.selectedLock = undefined;

            return fetch(`/extensions/${this.id}/views/main.html`)
                .then((res) => res.text())
                .then((text) => {
                    this.content = text;
                })
                .catch((e) => console.error('Failed to fetch content:', e));
        }

        show() {
            let mgr = this;
            this.view.innerHTML = this.content;

            this.userForm = new UserForm();
            this.userList = new UserList('userList');
            this.lockSelect = new DoorLockList('select', this.doorLocks, function() {
                mgr.DoorLockSelected();
            });
            this.addUserButton = new WebButton('addUserButton', function() {
                mgr.NewUserForm();
            });
        }

        hide() {
            this.lockSelect.destroy();
            this.userList.clear();
            this.addUserButton = undefined;
            this.lockSelect = undefined;
            this.userForm.clear();
        }


        DoorLockSelected() {
            if(this.lockSelect.value !== "none") {
                this.SelectDoorLock(this.lockSelect.value);
                this.addUserButton.enable();
            }
            else {
                this.selectedLock = undefined;
                this.addUserButton.disable();
                this.userList.hide();
                this.userList.clear();
                this.userForm.hide();
                this.userForm.clear();
            }
        }

        AddNewUser(formData) {
            const mgr = this;

            let addUser = {
                'addUser': {
                    'input': {
                        'userName': formData.userName,
                        'userId': parseInt(formData.userId),
                        'status': "Enabled",
                        'pin': formData.pin,
                        'startDate': formData.startDate.toString(),
                        'endDate': formData.endDate.toString(),
                    }
                }
            };

            if (this.selectedLock && this.selectedLock.actions.hasOwnProperty('addUser'))
            {
                let url = this.selectedLock.actions.addUser.links[0].href;

                window.API.postJson(url, addUser)
                    .finally(() => {
                        mgr.userForm.hide();
                        mgr.userForm.clear();
                        mgr.userList.populate();
                    })
                    .catch((e) => {
                        console.log("Add user post failed: " + e);
                    });
            }
        }


        SelectDoorLock(doorLockId) {
            this.selectedLock = this.doorLocks.find((lock) => lock.id == doorLockId);
            this.userList.clear();
            this.userList.populate(this.selectedLock);
        }


        NewUserForm() {
            const mgr = this;

            if (this.selectedLock) {
                if (this.selectedLock.actions.hasOwnProperty('addUser')) {
                    this.userForm.clear();
                    this.userForm.setCallback(function(formData) {
                        mgr.AddNewUser(formData);
                    });
                    this.userForm.show();
                }
            }
        }


        RetrieveDoorLocks() {
            window.API.getThings()
                .then((resp) => {
                    if(Array.isArray(resp)) {
                        this.doorLocks = resp.filter((thing) => {
                            let status = false;

                            if(Array.isArray(thing['@type'])) {
                                status = thing['@type'].includes('Lock');
                            }
                            else if(typeof thing['@type'] === 'string') {
                                status = (thing['@type'] === 'Lock');
                            }

                            return status;
                        });
                    }
            }).catch((e) => {
                console.log(e);
            });
        }
    }


    /*************************************************************************
     * Class DoorLockList
     *************************************************************************/
    class DoorLockList {
        constructor(id, lockList, changeHandler = null) {
            this.element = GetId(id);

            let defaultOpt = document.createElement('option');
            defaultOpt.text = "Select Lock";
            defaultOpt.value = "none";
            this.element.add(defaultOpt);

            lockList.forEach((lock) => {
                let opt = document.createElement('option');
                opt.text = lock.title;
                opt.value = lock.id;
                this.element.add(opt);
            });

            if(typeof(changeHandler) === 'function') {
                this.element.onchange = changeHandler;
            }
            else {
                this.element.onchange = undefined;
            }
        }

        destroy() {
            while(this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }

            if(this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }

        get value() {
            return this.element.value;
        }
    }


    /*************************************************************************
     * Class User List
     *************************************************************************/
    class UserList {
        constructor(id) {
            this.doorLock = undefined;
            this.table = GetId(id);
            this.clear();
            this.hide();
        }

        populate(doorLock = null) {
            const uList = this;

            if(doorLock !== null) {
                this.doorLock = doorLock;
            }

            if(this.doorLock) {
                this.getUsers().then((users) => {
                    uList.clear();
                    uList.displayUsers(users);
                });
            }

            this.show();
        }

        getUsers() {
            return window.API.getJson(this.doorLock.properties.users.links[0].href)
                .then((resp) => {
                    return resp.users;
                })
                .catch((e) => {
                    console.log(e);
                });
        }


        displayUsers(users) {
            if(Array.isArray(users)) {
                users.sort((uA, uB) => (uA.userId - uB.userId));
                users.forEach((user) => {
                    let startDate = new Date();
                    let endDate = new Date();
                    let row = this.table.insertRow(-1);

                    startDate.setTime(user.startDate);
                    endDate.setTime(user.endDate);

                    row.insertCell(0).appendChild(document.createTextNode(user.userId));
                    row.insertCell(1).appendChild(document.createTextNode(user.userName));
                    row.insertCell(2).appendChild(document.createTextNode(startDate.toLocaleString()));
                    row.insertCell(3).appendChild(document.createTextNode(endDate.toLocaleString()));
                });
            }
        }

        show() {
            this.table.style.display = 'block';
        }

        hide() {
            this.table.style.display = 'none';
        }

        clear() {
            while(this.table.rows.length > 1) {
                this.table.deleteRow(-1);
            }
        }
    }


    /*************************************************************************
     * Class UserForm
     *************************************************************************/
    class UserForm {
        constructor() {
            this.element = GetId('userForm');
            this.hide();
            this.error = "";
            this.valid = false;
            this.callback = undefined;
            this.formFields = {
                'userName': GetId('name'),
                'userId': GetId('id'),
                'pin': GetId('pin'),
                'startDate': GetId('startDate'),
                'startTime': GetId('startTime'),
                'endDate': GetId('endDate'),
                'endTime': GetId('endTime'),
            };

            let userForm = this;

            this.submit = new WebButton('submitUser', function(event) {
                let form = {
                    'userName': userForm.formFields.userName.value,
                    'userId': userForm.formFields.userId.value,
                    'pin': userForm.formFields.pin.value,
                    'startDate': Date.parse(userForm.formFields.startDate.value + ' ' + userForm.formFields.startTime.value),
                    'endDate': Date.parse(userForm.formFields.endDate.value + ' ' + userForm.formFields.endTime.value)
                }

                event.preventDefault();

                if(isNaN(form.startDate)) {
                    form.startDate = "";
                }

                if(isNaN(form.endDate)) {
                    form.endDate = "";
                }

                if(typeof(userForm.callback) === 'function') {
                    userForm.callback(form);
                }
            });

            this.validate();

            this.formFields.userName.onchange = RunValidation;
            this.formFields.pin.onchange = RunValidation;
            this.formFields.startDate.onchange = RunValidation;
            this.formFields.startTime.onchange = RunValidation;
            this.formFields.endDate.onchange = RunValidation;
            this.formFields.endTime.onchange = RunValidation;

            function RunValidation() {
                userForm.validate();
            }
        }

        setCallback(func) {
            if(typeof(func) === 'function') {
                this.callback = func;
            }
        }

        validate() {
            this.error = "";
            this.valid = true;

            if(this.formFields.userName.value === "") {
                this.valid = false;
                this.error = "Please enter a name";
            }
            else if(this.formFields.pin.value === "") {
                this.valid = false;
                this.error = "Please enter a numeric pin";
            }
            else if((this.formFields.startDate.value !== "") ||
                    (this.formFields.startTime.value !== "") ||
                    (this.formFields.endDate.value   !== "") ||
                    (this.formFields.endTime.value   !== "")    ) {
                let now = Date.now();
                let startDate = Date.parse(this.formFields.startDate.value + ' ' + this.formFields.startTime.value);
                let endDate = Date.parse(this.formFields.endDate.value + ' ' + this.formFields.endTime.value);

                if(isNaN(startDate) || (now > startDate)) {
                    this.valid = false;
                    this.error = "Start date/time must be in the future.";
                }
                else if(isNaN(endDate) || (startDate > endDate)) {
                    this.valid = false;
                    this.error = "End date/time must be after start date/time.";
                }
            }

            if(this.valid) {
                this.submit.enable();
            }
            else {
                this.submit.disable();
            }
        }

        show(config = null) {
            this.element.style.display = 'block';

            let startDate = "";
            let startTime = "";
            let endDate = "";
            let endTime = "";

            if(config !== null) {
                if(config.user.startTime) {
                    let tmpDate = new Date(config.user.startTime);
                    startDate = tmpDate.toLocaleDateString();
                    startTime = tmpDate.toLocaleTimeString();
                }

                if(config.user.endTime) {
                    let tmpDate = new Date(config.user.endTime);
                    endDate = tmpDate.toLocaleDateString();
                    endTime = tmpDate.toLocaleTimeString();
                }

                this.formFields.userName.value = config.user.name || "";
                this.formFields.id.value = config.user.id || "";
                this.formFields.pin.value = config.user.pin || "";
                this.formFields.startDate.value = startDate;
                this.formFields.startTime.value = startTime;
                this.formFields.endDate.value = endDate;
                this.formFields.endTime.value = endTime;
            }
        }

        hide() {
            this.element.style.display = 'none';
        }

        clear() {
            this.formFields.userName.value = "";
            this.formFields.userId.value = "";
            this.formFields.pin.value = "";
            this.formFields.startDate.value = "";
            this.formFields.startTime.value = "";
            this.formFields.endDate.value = "";
            this.formFields.endTime.value = "";
        }
    }


    /*************************************************************************
     * Class WebButton
     *************************************************************************/
    class WebButton {
        constructor(id, clickHandler = null) {
            this.element = GetId(id);

            if(typeof(clickHandler) === 'function') {
                this.element.onclick = clickHandler;
            }
            else {
                this.element.onclick = undefined;
            }

            this.disable();
        }

        enable() {
            this.element.disabled = false;
        }

        disable() {
            this.element.disabled = true;
        }
    }

    new DoorlockManagerExtension();

    function GetId(id) {
        return document.getElementById(`extension-doorlock-manager-${id}`);
    }

})();
