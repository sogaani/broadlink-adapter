'use strict';

const {Utils, Action} = require('gateway-addon');
const IrConstants = require('./constants');
const util = require('util');

const STATE_TEXT_FORMAT = 'Learning %s';

class IRActionLearncode extends Action {
  constructor(id, device, input) {
    super(id, device, IrConstants.IR_ACTRION_LEARN, input);
    this.targets = this.getLearnTargets(input.target);
  }

  getLearnTargets(target) {
    const LearnTargets = {
      [IrConstants.IR_DEVICE_TYPE_THERMOSTAT]    : IrConstants.LEARN_TARGET_THERMOSTAT,
      [IrConstants.IR_DEVICE_TYPE_DIMMABLE_LIGHT]: IrConstants.LEARN_TARGET_DIMMABLE_LIGHT,
      [IrConstants.IR_DEVICE_TYPE_ON_OFF_LIGHT]  : IrConstants.LEARN_TARGET_ON_OFF_LIGHT,
      [IrConstants.IR_DEVICE_TYPE_ON_OF_SWITCH]  : IrConstants.LEARN_TARGET_ON_OF_SWITCH,
    };

    if (target === IrConstants.LEARN_TARGET_ALL) {
      return LearnTargets[this.device.irtype];
    } else {
      return [target];
    }
  }

  /**
   * Start performing the action.
   * @returns a promise which resolves when the action has been finish
   *          or rejects when the action has been failed.
   */
  async performAction() {
    try {
      for (let i = 0; i < this.targets.length; i++) {
        const target = this.targets[i];
        switch (target) {
        case IrConstants.LEARN_TARGET_ON_OFF:
          await this.learnOnOff();
          break;
        case IrConstants.LEARN_TARGET_BRIGHTNESS_UP_DOWN:
          await this.learnBrightnessUpDown();
          break;
        case IrConstants.LEARN_TARGET_HEAT:
          await this.learnHeat();
          break;
        case IrConstants.LEARN_TARGET_COOL:
          await this.learnCool();
          break;
        case IrConstants.LEARN_TARGET_OFF:
          await this.learnOff();
          break;
        default:
        // do nothing
          break;
        }
      }
    } catch (err) {
      throw new Error(err);
    }
  }

  learnCode(target) {
    const promise = this.device.adapter.learnCode();
    this.status = util.format(STATE_TEXT_FORMAT, target);
    this.device.actionNotify(this);
    return promise;
  }

  async learnOnOff() {
    const targetOn = 'on';
    const targetOff = 'off';
    const ir = {};
    ir.on = await this.learnCode(targetOn)
      .catch((err) => {
        throw new Error(err);
      });
    ir.off =  await this.learnCode(targetOff)
      .catch((err) => {
        throw new Error(err);
      });

    const property = this.device.findProperty('on');
    property.setIrCode(ir);
    property.onLevel = this.input.onLevel;
  }

  async learnBrightnessUpDown() {
    const targetUp = 'brightness up';
    const targetDown = 'brightness down';
    const ir = {};
    ir.levelUp = await this.learnCode(targetUp)
      .catch((err) => {
        throw new Error(err);
      });
    ir.levelDown =  await this.learnCode(targetDown)
      .catch((err) => {
        throw new Error(err);
      });

    const property = this.device.findProperty('level');
    property.setIrCode(ir);
    property.levelStep = this.input.levelStep;
  }

  async learnHeatCool(mode, min, max) {
    const ir = {
      [mode]: [],
    };
    for (let i = min; i <= max; i++) {
      const target = `${mode} ${i}℃`;
      const code = await this.learnCode(target)
        .catch((err) => {
          throw new Error(err);
        });
      ir[mode].push(code);
    }

    const property = this.device.findProperty('mode');
    property.setIrCode(ir);
    const range = {min, max};
    property[mode] = range;
  }

  async learnHeat() {
    const max = this.input.MaxHeatTemperature;
    const min = this.input.MinHeatTemperature;
    await this.learnHeatCool('heat', min, max)
      .catch((err) => {
        throw new Error(err);
      });
  }

  async learnCool() {
    const max = this.input.MaxCoolTemperature;
    const min = this.input.MinCoolTemperature;
    await this.learnHeatCool('cool', min, max)
      .catch((err) => {
        throw new Error(err);
      });
  }

  async learnOff() {
    const target = 'off';
    const ir = {};
    ir.off = await this.learnCode(target)
      .catch((err) => {
        throw new Error(err);
      });
    const property = this.device.findProperty('mode');
    property.setIrCode(ir);
  }

  isCompleted() {
    if (this.status === 'completed') {
      return;
    }
    if (this.status.startsWith('failed:')) {
      return;
    }
  }

  /**
   * Called when fail performing the action.
   */
  fail(reason) {
    this.status = `failed: ${reason}`;
    this.timeCompleted = Utils.timestamp();
    this.device.actionNotify(this);
  }

  /**
   * Cancel performing the action.
   * @returns a promise which resolves when the action has been canceled.
   */
  cancel() {
    return new Promise((resolve, _reject) => {
      this.status = 'canceled';
      this.device.actionNotify(this);
      resolve();
    });
  }

  /**
   * Called when finish performing the action.
   */
  finish() {
    this.status = 'completed';
    this.timeCompleted = Utils.timestamp();
    this.device.actionNotify(this);
  }
}

module.exports = IRActionLearncode;
