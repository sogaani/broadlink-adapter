'use strict';

const util = require('util');
const Device = require('../device');
const IRProperty = require('./ir-property');
const Constants = require('../addon-constants');
const IrConstants = require('./constants');

var DEBUG = false;

/**
 * thermostat config
 * {
 * "mac": "broadlink mac address",
 * "type": "thermostat",
 * "id": "thermostat01",
 * "name": "Living thermostat",
 * "ir": {
 *   "cool": ["min temperature ir code", "min temperature + 1 ir code", ....., "max temperature + 1 ir code"],
 *   "heat": ["min temperature ir code", "min temperature + 1 ir code", ....., "max temperature + 1 ir code"]
 * },
 * "cool": {
 *   "min": 16, //min temperature on cool mode
 *   "max": 32  //man temperature on cool mode
 * },
 * "heat": {
 *   "min": 16, //min temperature on heat mode
 *   "max": 32  //man temperature on heat mode
 * }
 * }
 */

/**
 * dimbleLight config
 * {
 * "mac": "broadlink mac address",
 * "type": "dimbleLight",
 * "id": "dimbleLight01",
 * "name": "Living dimbleLight",
 * "ir": {
 *   "on": "light on ir code",
 *   "off": "light off ir code",
 *   "levelUp": "brightness up ir code",
 *   "levelDown": "brightness down ir code"
 * },
 * "onLevel": 100, // brightness level when send on ir code
 * "levelStep": 5 // how much brightness level change when send levelUp/Down ir code
 * }
 */

/**
 * light config
 * {
 * "mac": "broadlink mac address",
 * "type": "light",
 * "id": "light",
 * "name": "Living light",
 * "ir": {
 *   "on": "light on ir code",
 *   "off": "light off ir code"
 * }
 * }
 */

/**
 * switch config
 * {
 * "mac": "broadlink mac address",
 * "type": "switch",
 * "id": "switch",
 * "name": "Living switch",
 * "ir": {
 *   "on": "switch on ir code",
 *   "off": "switch off ir code"
 * }
 * }
 */

class IRDevice extends Device {
    constructor(adapter, config) {
        super(adapter, config.id);
        this.name = config.name;
        this.description = config.description;
        this.mac = adapter.mac;

        switch (config.type) {
            case IrConstants.IR_DEVICE_TYPE_THERMOSTAT:
                this._initThermostat(config.ir, config)
                break;
            case IrConstants.IR_DEVICE_TYPE_DIMMABLE_LIGHT:
                this._initDimbleLight(config.ir, config)
                break;
            case IrConstants.IR_DEVICE_TYPE_ON_OFF_LIGHT:
                this._initOnOffLight(config.ir)
                break;
            case IrConstants.IR_DEVICE_TYPE_ON_OF_SWITCH:
                this._initOnOffSwitch(config.ir)
                break;
            default:
                // do nothing
                break;
        }
    }

    _initDimbleLight(ir, config) {
        this.type = Constants.THING_TYPE_DIMMABLE_LIGHT;
        this._addProperty(
            'on',                          // name
            {                              // property description
                type: 'boolean',
                unit: 'percent',
                default: false,
                onLevel: config.onLevel
            },
            {                              // ir
                on: ir.on,
                off: ir.off
            },
            'setOnOffValue'                // setAttrFromValue
        );
        this._addProperty(
            'level',                       // name
            {                              // property description
                type: 'number',
                default: 0,
                levelStep: config.levelStep,
                onLevel: config.onLevel
            },
            {                              // ir
                levelDown: ir.levelDown,
                levelUp: ir.levelUp
            },
            'setPowerLevelValue'           // setAttrFromValue
        );
    }

    _initOnOffLight(ir) {
        this.type = Constants.THING_TYPE_ON_OFF_LIGHT;
        this._addProperty(
            'on',                          // name
            {                              // property description
                type: 'boolean',
                default: false
            },
            {                              // ir
                on: ir.on,
                off: ir.off
            },
            'setOnOffValue'                // setAttrFromValue
        );
    }

    _initThermostat(ir, config) {
        // use default things type
        this._addProperty(
            'temperature',                 // name
            {                              // property description
                type: 'number',
                unit: 'celsius',
                default: 20
            },
            {},                            // ir
            'setTemperatureNumericValue'   // setAttrFromValue
        );
        this._addProperty(
            'mode',                        // name
            {                              // property description
                type: 'string',
                modes: ['on', 'cool', 'heat', 'off'],
                default: 'off',
                cool: {
                    min: config.cool.min,
                    max: config.cool.max
                },
                heat: {
                    min: config.heat.min,
                    max: config.heat.max
                },
            },
            {                              // ir
                off: ir.off,
                cool: ir.cool,
                heat: ir.heat
            },
            'setThermostatModeValue'       // setAttrFromValue
        );
    }

    _initOnOffSwitch(ir) {
        node.type = Constants.THING_TYPE_ON_OFF_SWITCH;
        this._addProperty(
            'on',                          // name
            {                              // property description
                type: 'boolean',
                default: 'off'
            },
            {                              // ir
                on: ir.on,
                off: ir.off
            },
            'setOnOffValue'                // setAttrFromValue
        );
    }

    _addProperty(name, propertyDescr, ir, setIRCodeFromValue) {
        let property = new IRProperty(this, name, propertyDescr, ir, setIRCodeFromValue);
        this.properties.set(name, property);
    }

    asDict() {
        const dict = super.asDict();
        dict.mac = this.mac;

        return dict;
    }

    sendIRSequence(property, sequence) {
        if (DEBUG) console.log('sendIRSequence:', property, sequence);
        this.adapter.sendSequence(this, property, sequence);
    }
}

module.exports = IRDevice;