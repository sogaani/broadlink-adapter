'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const inquirer = require("inquirer");
const LearncodePrompt = require("./learncode-prompt");
const BroadlinkSelectorPrompt = require("./broadlink-selector-prompt");

inquirer.registerPrompt('broadlink-selector', BroadlinkSelectorPrompt);
inquirer.registerPrompt('learncode', LearncodePrompt);

const IrConstants = require('../constants');
const BroadlinkLoader = require('../broadlink-adapter');

process.on('unhandledRejection', console.dir);

class LearnManager extends EventEmitter {
    constructor() {
        super();
        this.state = 'pending';
        this.broadlinks = {};
    }

    addAdapter(adapter) {
        if (adapter.mac) {
            this.broadlinks[adapter.mac] = adapter;
            this.emit('discover', adapter);
        } else {
            this._scanner = adapter;
        }
    }

    stopLearning() {
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        if (this._device && this.rawDataListener) this._device.removeListener('rawData', this.rawDataListener);

        if (this.state == 'learning') {
            this.state = 'pending';
            this.emit('state', this.state);
        }
    }

    _onRawData(message) {
        const hex = message.toString('hex');
        this.emit('code', hex);
        this.stopLearning();
    };

    discoverDevices() {
        if (this._scanner) this._scanner.startPairing(10);
    }

    startLearning(mac, disableTimeout) {
        this.stopLearning();

        // Get the Broadlink device
        const adapter = this.broadlinks[mac];

        if (adapter) this._device = adapter._broadlink;

        if (!this._device) {
            this.discoverDevices();
            setTimeout(function () { this.startLearning(mac, disableTimeout) }.bind(this), 1000);
            return;
        }

        if (!this._device.enterLearning) return console.log(`Learn Code (IR learning not supported for device at ${mac})`);

        this.rawDataListener = this._onRawData.bind(this);
        this._device.on('rawData', this.rawDataListener);

        this._device.enterLearning();

        this.state = 'learning';
        this.emit('state', this.state);

        this._interval = setInterval(function () { this._device.checkData() }.bind(this), 1000);

        if (disableTimeout) return;

        // Timeout the client after 10 seconds
        timeout = setTimeout(function () {
            console.log('Learn Code (stopped - 10s timeout)');
            if (this._device.cancelRFSweep) this._device.cancelRFSweep();

            this.stopLearning();
        }.bind(this), 10000); // 10s
    }
}

const learnManager = new LearnManager();
BroadlinkLoader(learnManager, {});

var deviceConfig;

function validateString(input) {
    return new Promise(function (resolve, reject) {
        if (typeof input !== 'string') {
            reject('You need to provide a string');
            return;
        }
        if (!input.length) {
            reject('You need to provide least one letter');
            return;
        }
        resolve(true);
    });
}

async function makeDeviceConfig() {
    const basicQuestions = [
        {
            type: "broadlink-selector",
            name: "mac",
            message: "Which broadlink device do you choice to send and learn ir code.",
            broadlinkManager: learnManager
        },
        {
            type: "list",
            name: "type",
            message: "Whitch type ir device do you want to learn.",
            choices: [
                IrConstants.IR_DEVICE_TYPE_THERMOSTAT,
                IrConstants.IR_DEVICE_TYPE_DIMMABLE_LIGHT,
                IrConstants.IR_DEVICE_TYPE_ON_OFF_LIGHT,
                IrConstants.IR_DEVICE_TYPE_ON_OF_SWITCH
            ]
        },
        {
            type: "input",
            name: "name",
            message: "Input ir device name.",
            validate: validateString
        },
        {
            type: "input",
            name: "id",
            message: "Input ir device id.",
            validate: validateString
        }
    ];

    deviceConfig = await inquirer.prompt(basicQuestions)

    switch (deviceConfig.type) {
        case IrConstants.IR_DEVICE_TYPE_THERMOSTAT:
            await makeThermostatConfig();
            break;
        case IrConstants.IR_DEVICE_TYPE_DIMMABLE_LIGHT:
            await makeDimbleLightConfig();
            break;
        case IrConstants.IR_DEVICE_TYPE_ON_OFF_LIGHT:
            await makeOnOffLightConfig();
            break;
        case IrConstants.IR_DEVICE_TYPE_ON_OF_SWITCH:
            await makeOnOffSwitchConfig();
            break;
        default:
            console.log('invalid device type:' + deviceConfig.type);
            process.exit(1);
            break;
    }

    console.log(deviceConfig);
    process.exit(0);
}

function filterNumber(input) {
    return new Promise(function (resolve, reject) {
        resolve(parseInt(input, 10));
    });
}

function validateNumber(input) {
    return new Promise(function (resolve, reject) {
        if (isNaN(input)) {
            reject('You need to provide a number');
            return;
        }
        resolve(true);
    });
}


async function makeThermostatConfig() {
    const minMsg = "What is the minimum temperature on %s mode that can be set";
    const maxMsg = "What is the maximum temperature on %s mode that can be set";
    const thermostatQuestions = [
        {
            type: "input",
            name: "min",
            filter: filterNumber,
            validate: validateNumber
        },
        {
            type: "input",
            name: "max",
            filter: filterNumber,
            validate: validateNumber
        }
    ];

    deviceConfig.ir = {};

    async function learnIR(mode) {
        // heat questions
        thermostatQuestions[0].message = util.format(minMsg, mode);
        thermostatQuestions[1].message = util.format(maxMsg, mode);

        let answers = await inquirer.prompt(thermostatQuestions);

        deviceConfig[mode] = {
            min: answers.min,
            max: answers.max
        };

        deviceConfig.ir[mode] = [];
        for (let i = answers.min; i <= answers.max; i++) {
            const name = mode + i;
            const message = mode + ' ' + i + '℃';
            const learnIRCodeQuestions =
                {
                    type: "learncode",
                    name: name,
                    message: message,
                    broadlinkManager: learnManager,
                    mac: deviceConfig.mac
                }
            let answers = await inquirer.prompt(learnIRCodeQuestions);
            deviceConfig.ir[mode].push(answers[name]);
        }
    }

    await learnIR('heat');
    await learnIR('cool');
}

async function makeOnOffLightConfig() {
    const onOffLightQuestions = [
        {
            type: "learncode",
            name: "on",
            message: "light on",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        },
        {
            type: "learncode",
            name: "off",
            message: "light off",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        }
    ];

    deviceConfig.ir = {};
    let answers = await inquirer.prompt(onOffLightQuestions);

    deviceConfig.ir.on = answers.on;
    deviceConfig.ir.off = answers.off;
}

async function makeOnOffSwitchConfig() {
    const onOffSwitchQuestions = [
        {
            type: "learncode",
            name: "on",
            message: "switch on",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        },
        {
            type: "learncode",
            name: "off",
            message: "switch off",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        }
    ];

    deviceConfig.ir = {};
    let answers = await inquirer.prompt(onOffSwitchQuestions);

    deviceConfig.ir.on = answers.on;
    deviceConfig.ir.off = answers.off;
}


async function makeDimbleLightConfig() {
    const dimbleLightQuestions = [
        {
            type: "learncode",
            name: "on",
            message: "light on",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        },
        {
            type: "learncode",
            name: "off",
            message: "light off",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        },
        {
            type: "learncode",
            name: "levelUp",
            message: "light levelUp",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        },
        {
            type: "learncode",
            name: "levelDown",
            message: "light levelDown",
            broadlinkManager: learnManager,
            mac: deviceConfig.mac
        },
        {
            type: "input",
            name: "onLevel",
            message: "Brightness level expressed in percentage when light on",
            filter: filterNumber,
            validate: validateNumber
        },
        {
            type: "input",
            name: "levelStep",
            message: "Brightness level changes expressed in percentage when levelDown or levelUp",
            filter: filterNumber,
            validate: validateNumber
        }
    ];

    deviceConfig.ir = {};
    let answers = await inquirer.prompt(dimbleLightQuestions);

    deviceConfig.ir.on = answers.on;
    deviceConfig.ir.off = answers.off;
    deviceConfig.ir.levelUp = answers.levelUp;
    deviceConfig.ir.levelDown = answers.levelDown;
    deviceConfig.onLevel = answers.onLevel;
    deviceConfig.levelStep = answers.levelStep;
}

makeDeviceConfig();