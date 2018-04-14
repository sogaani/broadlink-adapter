'use strict';

const {Deferred, Property} = require('gateway-addon');

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

    this.setIRCodeFromValue = Object.getPrototypeOf(this)[setIRCodeFromValue];
    if (!this.setIRCodeFromValue) {
      const err = 'Unknown function: ' + setIRCodeFromValue;
      console.error(err);
      throw err;
    }

    copyDescrFieldsInto(this, propertyDescr);

    if (this.hasOwnProperty('default')) {
      this.device.sendIRSequence(this, this.setIRCodeFromValue(this.default));
    }
  }

  setDescr(field, descr) {
    this[field] = descr;
  }

  setIrCode(ir) {
    const current = this._ir ? this._ir : {};
    this._ir = Object.assign(current, ir);
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

    if (!this._ir || !this._ir.on || !this._ir.off) {
      return null;
    }
    const irCode = propertyValue ? this._ir.on : this._ir.off;

    if (propertyValue) {
      const levelProperty = this.device.findProperty('level');
      if (levelProperty && this.onLevel) {
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

    if (!this.levelStep || !this._ir || !this._ir.levelDown || !this._ir.levelUp) {
      return null;
    }

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
      return modeProperty.setIRCodeFromValue(modeProperty.value);
    }

    return null;
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
      return null;
    }

    const temperatureProperty = this.device.findProperty('temperature');
    if (!temperatureProperty) {
      return null;
    }

    let temperature = temperatureProperty.value;

    switch (propertyValue) {
    case 'on':
      if (!this.prevModeValue) {
        return null;
      }
      return this.setThermostatModeValue(this.prevMode);
    case 'heat':
    case 'cool': {
      const mode = this[propertyValue];
      if (!mode || !mode.min || !mode.max) {
        return null;
      }

      const index = temperature - mode.min;
      if (!this._ir || !this._ir[propertyValue] || !this._ir[propertyValue][index]) {
        return null;
      }

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

      sequence.push(this._ir[propertyValue][index]);
      DEBUG && console.log('updated thermostat', propertyValue);
      this.prevMode = propertyValue;
      break;
    }
    case 'off':
      if (this.value != 'off') {
        if (!this._ir || !this._ir.off) {
          return null;
        }

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

    const sequence = this.setIRCodeFromValue(value);
    if (sequence == null) {
      console.error('setValue failed. Please learn code.');
      return Promise.resolve();
    }

    if (!this.deferredSet) {
      this.deferredSet = new Deferred();
    }
    this.device.sendIRSequence(this, sequence);
    return this.deferredSet.promise;
  }
}

module.exports = IRProperty;
