(function() {
    class DoorlockManagerExtension extends window.Extension {
        constructor() {
            super('doorlock-manager');
            this.addMenuEntry('Door Lock Manager');

            if (!window.Extension.prototype.hasOwnProperty('load')) {
                this.load();
            }
        }

        load() {
            this.content = '';
            return fetch(`/extensions/${this.id}/views/main.html`)
                .then((res) => res.text())
                .then((text) => {
                    this.content = text;
                })
                .catch((e) => console.error('Failed to fetch content:', e));
        }

        show() {
            this.view.innerHTML = this.content;
        }
    }

    new DoorlockManagerExtension();
})();
