'use strict';

const Deferred = require('../deferred');
const Property = require('../property');

var DEBUG = true;

const DESCR_FIELDS = ['modes', 'cool', 'heat', 'default', 'levelStep', 'onLevel'];
function copyDescrFieldsInto(target, source) {
    for (let field of DESCR_FIELDS) {
        if (source.hasOwnProperty(field)) {
            target[field] = source[field];
        }
    }
}

class IRProperty extends Property {

    constructor(device, name, propertyDescr, ir, setIRCodeFromValue) {
        super(device, name, propertyDescr);

        this._ir = ir;

        //if (setIRCodeFromValue) {
            this.setIRCodeFromValue = Object.getPrototypeOf(this)[setIRCodeFromValue];
            if (!this.setIRCodeFromValue) {
                let err = 'Unknown function: ' + setIRCodeFromValue;
                console.error(err);
                throw err;
            }
        //}

        copyDescrFieldsInto(this, propertyDescr);

        if (this.hasOwnProperty('default')) {
            this.device.sendIRSequence(this, this.setIRCodeFromValue(this.default));
        }
    }

    asDict() {
        let dict = super.asDict();
        copyDescrFieldsInto(dict, this);
        return dict;
    }

    asPropertyDescription() {
        let description = super.asPropertyDescription();
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
            let levelProperty = this.device.findProperty('level');
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
        let onProperty = this.device.findProperty('on');

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
        const sequence = [];

        let temperature = parseInt(propertyValue, 10);

        if (this.hasOwnProperty('min') && temperature < this.min) {
            temperature = this.min;
        }
        if (this.hasOwnProperty('max') && temperature > this.max) {
            temperature = this.max;
        }

        this.setCachedValue(temperature);

        let modeProperty = this.device.findProperty('mode');

        if (modeProperty) {
            sequence.push(modeProperty.setIRCodeFromValue(modeProperty.value));
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

        let temperatureProperty = this.device.findProperty('temperature');
        if (!temperatureProperty) {
            return sequence;
        }

        let temperature = temperatureProperty.value;

        switch (propertyValue) {
            case 'on':
                if (!this.prevModeValue) {
                    return sequence;
                }
                return setThermostatModeValue(this.prevMode);
            case 'heat':
            case 'cool':
                const mode = this.modes[modeIndex];

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
            case 'off':
                if (this.value != 'off') {
                    sequence.push(this._ir.off);
                }
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