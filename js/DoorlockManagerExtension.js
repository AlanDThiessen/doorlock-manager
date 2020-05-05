(function() {
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
            const select = this.GetId('select');

            select.onchange = function(event) {
                mgr.SelectDoorLock(event);
            }

            this.doorLocks.forEach((lock) => {
                let opt = document.createElement('option');
                opt.text = lock.title;
                opt.value = lock.id;

                select.add(opt);
            });
        }


        SelectDoorLock(event) {
            const doorLockId = this.GetId('select').value;
            const mgr = this;
            const userList = this.GetId('userList');

            let lock = this.doorLocks.find((lock) => lock.id == doorLockId);

            window.API.getJson(lock.properties.users.links[0].href)
                .then((resp) => {
                    let htmlList = '<ul>';

                    resp.users.forEach((user) => {
                        let startDate = new Date();
                        let endDate = new Date();

                        startDate.setTime(user.startDate);
                        endDate.setTime(user.endDate);

                        htmlList += `<li>${user.userName}<ul>`;
                        htmlList += `<li>Id: ${user.userId}</li>`;
                        htmlList += `<li>Pin: ${user.pin}</li>`
                        htmlList += `<li>Start: ${startDate.toLocaleString()}`
                        htmlList += `<li>End: ${endDate.toLocaleString()}`
                        htmlList += '</ul>';
                    });

                    htmlList += '</ul>';

                    userList.innerHTML = htmlList;
                }).catch((e) => {
                    console.log(e);
                })
        }


        NewUserForm() {
            const doorLockId = this.GetId('select').value;
            const mgr = this;

            let lock = this.doorLocks.find((lock) => lock.id == doorLockId);
            let data = this.GetId('addUser');
            let submit = this.GetId('submitUser');

            data.style.display = 'none';

            if (lock !== -1) {
                if(lock.actions.hasOwnProperty('addUser')) {
                    data.style.display = 'block';
                    submit.onclick = SubmitForm;
                }
            }

            function SubmitForm() {
                let addUser = {
                    'addUser': {
                        'input': {
                            'userName': mgr.GetId('name').value,
                            'userId': mgr.GetId('id').value,
                            'status': 1,
                            'pin': mgr.GetId('pin').value,
                            'startDate': mgr.GetId('startTime').value,
                            'endDate': mgr.GetId('endTime').value
                        }
                    }
                };

                // let url = lock.actions.addUser.links[0].href;
                let url = 'http://localhost:8888/actions/addUser';

                window.API.postJson(url, addUser)
                    .then((resp) => {
                        console.log(resp);
                    })
                    .catch((e) => {
                        console.log(e);
                    });
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


        GetId(id) {
            return document.getElementById(`extension-doorlock-manager-${id}`);
        }
    }

    new DoorlockManagerExtension();
})();
