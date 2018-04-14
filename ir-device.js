'use strict';

const IRProperty = require('./ir-property');
const IrConstants = require('./constants');
const ActionLearn = require('./ir-action-learncode');
const {Constants, Device} = require('gateway-addon');

var DEBUG = false;

function getActionInput(type) {
  const ActionInputs = {
    [IrConstants.IR_DEVICE_TYPE_THERMOSTAT]    : IrConstants.IR_ACTION_INPUT_THERMOSTAT,
    [IrConstants.IR_DEVICE_TYPE_DIMMABLE_LIGHT]: IrConstants.IR_ACTION_INPUT_DIMMABLE_LIGHT,
    [IrConstants.IR_DEVICE_TYPE_ON_OFF_LIGHT]  : IrConstants.IR_ACTION_INPUT_ON_OFF_LIGHT,
    [IrConstants.IR_DEVICE_TYPE_ON_OF_SWITCH]  : IrConstants.IR_ACTION_INPUT_ON_OF_SWITCH,
  };
  return ActionInputs[type];
}

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
    this.irtype = config.type;
    this.actionsList = new Map();

    const actionMetadata = {
      description: 'Learn ir codes',
      input      : getActionInput(config.type),
    };
    this.addAction(IrConstants.IR_ACTION_LEARN, actionMetadata);

    const ir = config.ir ? config.ir : {};
    switch (config.type) {
    case IrConstants.IR_DEVICE_TYPE_THERMOSTAT:
      this._initThermostat(ir, config);
      break;
    case IrConstants.IR_DEVICE_TYPE_DIMMABLE_LIGHT:
      this._initDimbleLight(ir, config);
      break;
    case IrConstants.IR_DEVICE_TYPE_ON_OFF_LIGHT:
      this._initOnOffLight(ir);
      break;
    case IrConstants.IR_DEVICE_TYPE_ON_OF_SWITCH:
      this._initOnOffSwitch(ir);
      break;
    default:
      // do nothing
      break;
    }
  }

  _initDimbleLight(ir, config) {
    this.type = Constants.THING_TYPE_DIMMABLE_LIGHT;
    this._addProperty(
      'on', // name
      { // property description
        type   : 'boolean',
        unit   : 'percent',
        default: false,
        onLevel: config.onLevel,
      },
      { // ir
        on : ir.on,
        off: ir.off,
      },
      'setOnOffValue' // setAttrFromValue
    );
    this._addProperty(
      'level', // name
      { // property description
        type     : 'number',
        default  : 0,
        levelStep: config.levelStep,
      },
      { // ir
        levelDown: ir.levelDown,
        levelUp  : ir.levelUp,
      },
      'setPowerLevelValue' // setAttrFromValue
    );
  }

  _initOnOffLight(ir) {
    this.type = Constants.THING_TYPE_ON_OFF_LIGHT;
    this._addProperty(
      'on', // name
      { // property description
        type   : 'boolean',
        default: false,
      },
      { // ir
        on : ir.on,
        off: ir.off,
      },
      'setOnOffValue' // setAttrFromValue
    );
  }

  _initThermostat(ir, config) {
    // use default things type
    this._addProperty(
      'temperature', // name
      { // property description
        type   : 'number',
        unit   : 'celsius',
        default: 20,
      },
      {}, // ir
      'setTemperatureNumericValue' // setAttrFromValue
    );
    this._addProperty(
      'mode', // name
      { // property description
        type   : 'string',
        modes  : ['on', 'cool', 'heat', 'off'],
        default: 'off',
        cool   : {
          min: config.cool ? config.cool.min : undefined,
          max: config.cool ? config.cool.max : undefined,
        },
        heat: {
          min: config.heat ? config.heat.min : undefined,
          max: config.heat ? config.heat.max : undefined,
        },
      },
      { // ir
        off : ir.off,
        cool: ir.cool,
        heat: ir.heat,
      },
      'setThermostatModeValue' // setAttrFromValue
    );
  }

  _initOnOffSwitch(ir) {
    this.type = Constants.THING_TYPE_ON_OFF_SWITCH;
    this._addProperty(
      'on', // name
      { // property description
        type   : 'boolean',
        default: 'off',
      },
      { // ir
        on : ir.on,
        off: ir.off,
      },
      'setOnOffValue' // setAttrFromValue
    );
  }

  _addProperty(name, propertyDescr, ir, setIRCodeFromValue) {
    const property = new IRProperty(this, name, propertyDescr, ir, setIRCodeFromValue);
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

  /**
   * @method requestAction
   * @returns a promise which resolves when the action has been requested.
   */
  requestAction(actionId, actionName, input) {
    return new Promise((resolve, reject) => {
      if (!this.actions.has(actionName)) {
        reject(`Action "${actionName}" not found`);
        return;
      }

      const action = new ActionLearn(actionId, this, input);

      let actions = this.actionsList.get(actionName);
      if (typeof actions === 'undefined') {
        actions = new Map();
      }

      // should we check that actionId is duplicated?
      actions.set(actionId, action);
      this.actionsList.set(actionName, actions);

      this.performAction(action).catch((err) => console.log(err));
      resolve();
    });
  }

  /**
   * @method performAction
   */
  performAction(action) {
    return new Promise((resolve, reject) => {
      action.performAction()
        .then(() => {
          action.finish();
          resolve();
        })
        .catch((err) => {
          action.fail(err);
          reject(err);
        });
    });
  }

  actionNotify(action) {
    super.actionNotify(action);
    console.log(action.status);
  }

  // we should change?
  removeAction(actionId, actionName) {
    return new Promise((resolve, reject) => {
      if (!this.actions.has(actionName)) {
        reject(`Action "${actionName}" not found`);
        return;
      }

      const actions = this.actionsList.get(actionName);
      if (typeof actions === 'undefined') {
        reject(`Action "${actionName}" have not been requested yet`);
        return;
      }

      const action = actions.get(actionId);
      if (typeof action === 'undefined') {
        reject(`Action "${actionName}" Id "${actionId}" have not been requested yet`);
        return;
      }

      if (action.isCompleted()) {
        actions.delete(actionId);
        resolve();
        return;
      }

      this.cancelAction(action)
        .then(() => {
          actions.delete(actionId);
          resolve();
        })
        .catch((err) => {
          console.error(err);
          reject(`Action "${actionName}" Id "${actionId}" cannot be canceled: ${err}`);
        });
    });
  }

  /**
   * @method cancelAction
   */
  cancelAction(action) {
    return action.cancel();
  }
}

module.exports = IRDevice;
