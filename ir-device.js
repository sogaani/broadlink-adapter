'use strict';

const util = require('util');
const Device = require('../device');

var DEBUG = true;

class IRDevice extends Device {
    constructor(adapter, config) {
        this._adapter = adapter;
        this.properties = 'a';
        this.mac = adapter.mac;
    }

    asDict() {
        let dict = super.asDict();
        dict.mac = this.mac;

        return dict;
    }

    sendIRSequence(property, sequence) {
        this._adapter.sendSequence(property, sequence);
    }
}

module.exports = IRDevice;