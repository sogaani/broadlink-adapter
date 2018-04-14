/**
 *
 * BroadlinkAdapter - Adapter which manages ir devices with Broadlink.
 *
 */

'use strict';

const EventEmitter = require('events').EventEmitter;
const Queue = require('promise-queue');
const BroadlinkJS = require('broadlinkjs-rm');
const IRDevice = require('./ir-device');

var DEBUG = false;

const {Adapter, Database} = require('gateway-addon');

class BroadlinkAdapter extends Adapter {
  constructor(addonManager, manifest, broadlink) {
    super(addonManager, 'broadlink-' + broadlink.host.macAddress, manifest.name);

    this.mac = broadlink.host.macAddress;
    this._broadlink = broadlink;
    this._queue = new Queue(1, Infinity);
    this.manager.addAdapter(this);
    const config = manifest.moziot.config;
    this.event = new EventEmitter();

    this._loadConfig(config);
  }

  _loadConfig(config) {
    if (config && config.devices && Array.isArray(config.devices)) {
      const devices = config.devices;
      devices.forEach(function(device) {
        this._createDeviceFromConfig(device);
      }.bind(this));
    }
  }

  learnCode() {
    return new Promise((resolve, reject) =>{
      this.event.emit('stopLearning', new Error('learnCode called while learning'));

      const onRawData = (message) => {
        const hex = message.toString('hex');
        this.event.emit('stopLearning');
        resolve(hex);
      };

      const ping = setInterval(() => {
        this._broadlink.checkData();
      }, 1000);

      const timeout = setTimeout(() => {
        this.event.emit('stopLearning', new Error('learnCode timeout'));
      }, 60000);

      const cleanup = (err) => {
        this._broadlink.removeListener('rawData', onRawData);
        clearInterval(ping);
        clearTimeout(timeout);
        if (err) {
          this._broadlink.cancelLearn();
          reject(err);
        }
      };

      this.event.once('stopLearning', (err)=>{
        cleanup(err);
      });

      this._broadlink.on('rawData', onRawData);
      this._broadlink.enterLearning();
    });
  }

  sendData(hexData) {
    if (!hexData) {
      console.log('Missing params, sendData failed');
      return;
    }

    const hexDataBuffer = new Buffer(hexData, 'hex');

    this._queue.add(() => {
      this._broadlink.sendData(hexDataBuffer);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 200);
      });
    });
  }

  waitSendSequenceResolve(device, property) {
    this._queue.add(() => {
      return new Promise((resolve) => {
        var deferredSet = property.deferredSet;
        if (deferredSet) {
          property.deferredSet = null;
          deferredSet.resolve(property.value);
        }
        device.notifyPropertyChanged(property);
        resolve();
      });
    });
  }

  sendSequence(device, property, sequence) {
    for (const i in sequence) {
      const data = sequence[i];
      this.sendData(data);
    }
    this.waitSendSequenceResolve(device, property);
  }

  _createDeviceFromConfig(config) {
    // ToDo check config
    if (!config || config.mac != this.mac) return;

    this.handleDeviceAdded(new IRDevice(this, config));
  }

  removeThing(device) {
    if (DEBUG) console.log('removeThing(' + device.id + ')');

    this.handleDeviceRemoved(device);
  }

  cancelRemoveThing(_node) {
    // Nothing to do.
  }
}

class BroadlinkManager extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, 'broadlink-adapter', manifest.name);

    this._destaddr = manifest.address || '255.255.255.255';
    this._port1 = manifest.port1 || 0;
    this._port2 = manifest.port2 || 0;
    this._isPairing = false;
    this._broadlinkFinder = new BroadlinkJS();

    this.event = new EventEmitter();
    this._discoveredDevices = {};
    this._broadlinkFinder.on('deviceReady', this._onDeviceReady.bind(this));
    this.startPairing(10);
    this.manager.addAdapter(this);
  }

  _onDeviceReady(device) {
    const macAddressParts = device.mac.toString('hex').match(/[\s\S]{1,2}/g) || [];
    const macAddress = macAddressParts.join(':');
    device.host.macAddress = macAddress;

    if (this._discoveredDevices[device.host.address] ||
        this._discoveredDevices[device.host.macAddress]) return;

    if (DEBUG) console.log(
      `Discovered Broadlink RM device at ${device.host.address} (${device.host.macAddress})`);

    this._discoveredDevices[device.host.address] = device;
    this._discoveredDevices[device.host.macAddress] = device;

    this.event.emit('deviceReady', device);
  }

  _discoverDevices() {
    if (this._isPairing == false) {
      return;
    }

    if (this._timeoutSeconds <= 0) {
      this._isPairing = false;

      return;
    }

    this._broadlinkFinder.discover(this._port1, this._port2, this._destaddr);

    setTimeout(() => {
      this._timeoutSeconds -= 5;
      this._discoverDevices();
    }, 5 * 1000);
  }

  startPairing(timeoutSeconds) {
    this._timeoutSeconds = timeoutSeconds;
    if (this._isPairing == true) {
      return;
    }
    this._isPairing = true;
    if (DEBUG) console.log('Pairing mode started, timeout =', timeoutSeconds);
    this._discoverDevices();
  }

  cancelPairing() {
    if (DEBUG) console.log('Cancelling pairing mode');
    this.isPairing = false;
  }

  getDevice(host, learnOnly) {
    let device;

    const hosts = Object.keys(this._discoveredDevices);

    if (host) {
      device = this._discoveredDevices[host];
    } else if (learnOnly) {
      for (let i = 0; i < hosts.length; i++) {
        const currentDevice = this._discoveredDevices[hosts[i]];
        if (currentDevice.enterLearning) {
          device = currentDevice;

          break;
        }
      }
    } else {
      device = this._discoveredDevices[hosts[0]];
    }

    if (!device) {
      if (DEBUG) console.log(`Attempting to discover RM devices for 5s`);

      this._discoverDevices(5);
    }

    return device;
  }
}

function loadBroadlinkAdapters(addonManager, manifest, _errorCallback) {
  const db = new Database(manifest.name);
  const broadlinkManager = new BroadlinkManager(addonManager, manifest);
  const broadlinks = [];

  broadlinkManager.event.on('deviceReady', async (device) => {
    try {
      await db.open();
      const config = await db.loadConfig();
      broadlinks.push(device.host.macAddress);
      config.broadlinks = broadlinks;
      await db.saveConfig(config);
    } catch (err) {
      console.error(err);
    }

    new BroadlinkAdapter(addonManager, manifest, device);
  });
}

module.exports = loadBroadlinkAdapters;
