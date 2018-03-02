'use strict';
/**
 * `broadlink-selector` type prompt
 */

const chalk = require('chalk');
const ListPrompt = require('inquirer/lib/prompts/list');

class BroadlinkSelector extends ListPrompt {
    constructor(questions, rl, answers) {
        questions.choices = ['No broadlink device available'];
        super(questions, rl, answers);

        if (!this.opt.broadlinkManager) {
            this.throwParamError('broadlinkManager');
        }
    }

    _run(cb) {
        const addresses = this.getBroadlinkAddresses();
        if (addresses.length) this.opt.choices = addresses;

        super._run(cb);

        this.interval = setInterval(this.discoverBroadlinks.bind(this));

        return this;
    }

    onSubmit(value) {
        super.onSubmit(value);
        if (this.listener) this.opt.broadlinkManager.removeListener('discover', this.listener);
        clearInterval(this.interval);
    }

    discoverBroadlinks() {
        this.opt.broadlinkManager.discoverDevices();

        if (!this.listener) {
            this.listener = this.onDiscover.bind(this);
            this.opt.broadlinkManager.on('discover', this.listener);
        }
    }

    onDiscover() {
        const addresses = this.getBroadlinkAddresses();
        if (addresses.length) this.opt.choices = addresses;

        this.render();
    }

    getBroadlinkAddresses() {
        return Object.keys(this.opt.broadlinkManager.broadlinks);
    }
}

module.exports = BroadlinkSelector;
