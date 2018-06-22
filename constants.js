'use strict';

const LEARN_TARGET_ALL = 'all';
const LEARN_TARGET_ON_OFF = 'on and off';
const LEARN_TARGET_BRIGHTNESS_UP_DOWN = 'brightness up and down';
// const LEARN_TARGET_TEMPERATURE_UP_DOWN = 'temperature up and down';
const LEARN_TARGET_HEAT = 'heat mode';
const LEARN_TARGET_COOL = 'cool mode';
const LEARN_TARGET_OFF = 'off';

exports.LEARN_TARGET_ALL = LEARN_TARGET_ALL;
exports.LEARN_TARGET_ON_OFF = LEARN_TARGET_ON_OFF;
exports.LEARN_TARGET_BRIGHTNESS_UP_DOWN = LEARN_TARGET_BRIGHTNESS_UP_DOWN;
exports.LEARN_TARGET_HEAT = LEARN_TARGET_HEAT;
exports.LEARN_TARGET_COOL = LEARN_TARGET_COOL;
exports.LEARN_TARGET_OFF = LEARN_TARGET_OFF;

const LEARN_TARGET_THERMOSTAT = [
  LEARN_TARGET_OFF,
  LEARN_TARGET_HEAT,
  LEARN_TARGET_COOL,
];

const LEARN_TARGET_DIMMABLE_LIGHT = [
  LEARN_TARGET_ON_OFF,
  LEARN_TARGET_BRIGHTNESS_UP_DOWN,
];

const LEARN_TARGET_ON_OFF_LIGHT = [
  LEARN_TARGET_ON_OFF,
];

const LEARN_TARGET_ON_OF_SWITCH = [
  LEARN_TARGET_ON_OFF,
];

exports.LEARN_TARGET_THERMOSTAT = LEARN_TARGET_THERMOSTAT;
exports.LEARN_TARGET_DIMMABLE_LIGHT = LEARN_TARGET_DIMMABLE_LIGHT;
exports.LEARN_TARGET_ON_OFF_LIGHT = LEARN_TARGET_ON_OFF_LIGHT;
exports.LEARN_TARGET_ON_OF_SWITCH = LEARN_TARGET_ON_OF_SWITCH;

const TARGET_DESCRIPTION = 'Select what you want to learn';
const MaxHeatTemperature = {
  type       : 'integer',
  description: 'Maximum temperature that can be set for this device with heat mode.',
};
const MinHeatTemperature = {
  type       : 'integer',
  description: 'Minimum temperature that can be set for this device with heat mode.',
};
const MaxCoolTemperature = {
  type       : 'integer',
  description: 'Maximum temperature that can be set for this device with cool mode.',
};
const MinCoolTemperature = {
  type       : 'integer',
  description: 'Minimum temperature that can be set for this device with cool mode.',
};

const onLevel = {
  type       : 'integer',
  minimum    : 0,
  maximum    : 100,
  description: 'The percentage of brightness when light on.',
};
const levelStep = {
  type       : 'integer',
  minimum    : 1,
  maximum    : 100,
  description: 'The percentage of changing brightness when light brightness down or up.',
};

exports.IR_ACTION_LEARN = 'learn';

exports.IR_ACTION_INPUT_THERMOSTAT = {
  type     : 'object',
  propertie: {
    target: {
      type: 'string',
      enum: [
        LEARN_TARGET_ALL,
        ...LEARN_TARGET_THERMOSTAT,
      ],
      default    : LEARN_TARGET_ALL,
      description: TARGET_DESCRIPTION,
    },
    MaxHeatTemperature,
    MinHeatTemperature,
    MaxCoolTemperature,
    MinCoolTemperature,
  },
  required: [
    'target',
  ],
};

exports.IR_ACTION_INPUT_DIMMABLE_LIGHT = {
  type     : 'object',
  propertie: {
    target: {
      type: 'string',
      enum: [
        LEARN_TARGET_ALL,
        ...LEARN_TARGET_DIMMABLE_LIGHT,
      ],
      default    : LEARN_TARGET_ALL,
      description: TARGET_DESCRIPTION,
    },
    onLevel,
    levelStep,
  },
  required: [
    'target',
  ],
};

exports.IR_ACTION_INPUT_ON_OFF_LIGHT = {
  type     : 'object',
  propertie: {
    target: {
      type: 'string',
      enum: [
        LEARN_TARGET_ALL,
        ...LEARN_TARGET_ON_OFF_LIGHT,
      ],
      default    : LEARN_TARGET_ALL,
      description: TARGET_DESCRIPTION,
    },
  },
  required: [
    'target',
  ],
};

exports.IR_ACTION_INPUT_ON_OF_SWITCH = {
  type     : 'object',
  propertie: {
    target: {
      type: 'string',
      enum: [
        LEARN_TARGET_ALL,
        ...LEARN_TARGET_ON_OFF_LIGHT,
      ],
      default    : LEARN_TARGET_ALL,
      description: TARGET_DESCRIPTION,
    },
  },
  required: [
    'target',
  ],
};

exports.IR_DEVICE_TYPE_THERMOSTAT = 'thermostat';
exports.IR_DEVICE_TYPE_ON_OFF_LIGHT = 'light';
exports.IR_DEVICE_TYPE_DIMMABLE_LIGHT = 'dimmableLight';
exports.IR_DEVICE_TYPE_ON_OF_SWITCH = 'switch';
