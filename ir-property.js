'use strict';

let Deferred, Property;
try {
  Deferred = require('../deferred');
  Property = require('../property');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }

  const gwa = require('gateway-addon');
  Deferred = gwa.Deferred;
  Property = gwa.Property;
}

var DEBUG = false;

const DESCR_FIELDS = ['modes', 'cool', 'heat', 'default', 'levelStep', 'onLevel'];
function copyDescrFieldsInto(target, source) {
  for (const field of DESCR_FIELDS) {
    if (source.hasOwnProperty(field)) {
      target[field] = source[field];
    }
  }
}

class IRProperty extends Property {
  constructor(device, name, propertyDescr, ir, setIRCodeFromValue) {
    super(device, name, propertyDescr);

    this._ir = ir;

    // if (setIRCodeFromValue) {
    this.setIRCodeFromValue = Object.getPrototypeOf(this)[setIRCodeFromValue];
    if (!this.setIRCodeFromValue) {
      const err = 'Unknown function: ' + setIRCodeFromValue;
      console.error(err);
      throw err;
    }
    // }

    copyDescrFieldsInto(this, propertyDescr);

    if (this.hasOwnProperty('default')) {
      this.device.sendIRSequence(this, this.setIRCodeFromValue(this.default));
    }
  }

  asDict() {
    const dict = super.asDict();
    copyDescrFieldsInto(dict, this);
    return dict;
  }

  asPropertyDescription() {
    const description = super.asPropertyDescription();
    copyDescrFieldsInto(description, this);
    return description;
  }

  /**
     * @method setOnOffAttr
     *
     * Converts the 'on' property value (a boolean) into the IR on or off
     * sequence.
     */
  setOnOffValue(propertyValue) {
    const sequence = [];

    const irCode = propertyValue ? this._ir.on : this._ir.off;

    if (propertyValue) {
      const levelProperty = this.device.findProperty('level');
      if (levelProperty) {
        levelProperty.setCachedValue(this.onLevel);
        this.device.notifyPropertyChanged(levelProperty);
      }
    }

    sequence.push(irCode);

    this.setCachedValue(propertyValue);

    return sequence;
  }

  /**
     * @method setPowerLevelValue
     *
     * Convert the 'level' property value (a percentage) into the IR
     * sequence along with a light level.
     */
  setPowerLevelValue(propertyValue) {
    // propertyValue is a percentage 0-100
    const sequence = [];

    let curLevel = this.value;
    const onProperty = this.device.findProperty('on');

    if (onProperty && propertyValue == 0) {
      this.device.sendIRSequence(onProperty, onProperty.setIRCodeFromValue(false));
      curLevel = 0;
    } else if (!onProperty.value) {
      this.device.sendIRSequence(onProperty, onProperty.setIRCodeFromValue(true));
      curLevel = this.value;
    }

    if (curLevel > propertyValue) {
      while (curLevel > propertyValue) {
        curLevel -= this.levelStep;
        sequence.push(this._ir.levelDown);
      }
    } else {
      while (curLevel < propertyValue) {
        curLevel += this.levelStep;
        sequence.push(this._ir.levelUp);
      }
    }

    this.setCachedValue(curLevel);

    return sequence;
  }

  /**
     * @method setTemperatureNumericValue
     *
     * Convert the 'numeric' property value (a percentage) into the IR
     * sequence along with a thermostat temperature.
     */
  setTemperatureNumericValue(propertyValue) {
    // propertyValue is a temperature integer
    let sequence = [];

    let temperature = parseInt(propertyValue, 10);

    if (this.hasOwnProperty('min') && temperature < this.min) {
      temperature = this.min;
    }
    if (this.hasOwnProperty('max') && temperature > this.max) {
      temperature = this.max;
    }

    this.setCachedValue(temperature);

    const modeProperty = this.device.findProperty('mode');

    if (modeProperty) {
      sequence = sequence.concat(modeProperty.setIRCodeFromValue(modeProperty.value));
    }

    return sequence;
  }

  /**
     * @method setThermostatModeValue
     *
     * Convert the 'string' property value into the IR
     * sequence along with a thermostat temperature.
     */
  setThermostatModeValue(propertyValue) {
    // propertyValue is a mode string
    const sequence = [];
    const modeIndex = this.modes.indexOf(propertyValue);

    if (modeIndex == -1) {
      return sequence;
    }

    const temperatureProperty = this.device.findProperty('temperature');
    if (!temperatureProperty) {
      return sequence;
    }

    let temperature = temperatureProperty.value;

    switch (propertyValue) {
    case 'on':
      if (!this.prevModeValue) {
        return sequence;
      }
      return this.setThermostatModeValue(this.prevMode);
    case 'heat':
    case 'cool': {
      const mode = this[propertyValue];

      temperatureProperty['min'] = mode.min;
      temperatureProperty['max'] = mode.max;

      if (temperature < mode.min) {
        temperature = mode.min;
        temperatureProperty.setCachedValue(temperature);
        this.device.notifyPropertyChanged(temperatureProperty);
      }
      if (temperature > mode.max) {
        temperature = mode.max;
        temperatureProperty.setCachedValue(temperature);
        this.device.notifyPropertyChanged(temperatureProperty);
      }

      sequence.push(this._ir[propertyValue][temperature - mode.min]);
      console.log('updated thermostat', propertyValue);
      this.prevMode = propertyValue;
      break;
    }
    case 'off':
      if (this.value != 'off') {
        sequence.push(this._ir.off);
      }
      break;
    }

    this.setCachedValue(propertyValue);

    return sequence;
  }

  /**
     * @returns a promise which resolves to the updated value.
     *
     * @note it is possible that the updated value doesn't match
     * the value passed in.
     */
  setValue(value) {
    if (DEBUG) console.log('setValue:', this, value);
    if (!this.setIRCodeFromValue) {
      return Promise.resolve();
    }

    if (!this.deferredSet) {
      this.deferredSet = new Deferred();
    }

    this.device.sendIRSequence(this, this.setIRCodeFromValue(value));
    return this.deferredSet.promise;
  }
}

module.exports = IRProperty;
