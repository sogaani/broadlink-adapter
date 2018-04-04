'use strict';
/**
 * `broadlink-selector` type prompt
 */

const chalk = require('chalk');
const ListPrompt = require('inquirer/lib/prompts/list');
const Choices = require('inquirer/lib/objects/choices');

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

    this.discoverBroadlinks();

    this.interval = setInterval(this.discoverBroadlinks.bind(this), 10000);

    return this;
  }

  onSubmit(value) {
    if (this.listener) this.opt.broadlinkManager.removeListener('discover', this.listener);
    clearInterval(this.interval);
    super.onSubmit(value);
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
    if (addresses.length) this.opt.choices = new Choices(addresses, this.answers);

    this.render();
  }

  getBroadlinkAddresses() {
    return Object.keys(this.opt.broadlinkManager.broadlinks);
  }
}

module.exports = BroadlinkSelector;
