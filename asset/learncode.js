const BroadlinkLoader = require('../broadlink-adapter')
const readline = require('readline');
class CommandHandler {
    constructor() {
        this.codes = [];
    }

    startlearn(args, learnManager, callback) {
        switch (args[0]) {
            case 'onOff':
                break;
            case 'temp':
                break;
            default:
                break;
        }
        learnManager.startLearning(true);
        callback(null, '');
    }

    add(hex) {
        this.codes.push(hex);
    }

    stoplearn(args, learnManager, callback) {
        learnManager.stopLearning();
        callback(null, '');
    }

    dumpCodes(args, learnManager, callback) {
        callback(null, this.codes);
    }
}

class LearnManager {
    constructor(mac, handler) {
        this._mac = mac;
        this._broadlinks = {};
        this.handler = handler;
        this.readlineInterface = readline.createInterface(process.stdin, process.stdout);
        // プロンプトを定義 後から変更も可能
        this.readlineInterface.setPrompt('> ');
        this.readlineInterface.on('line', this._onLine.bind(this));
        this.readlineInterface.on('close', function () {
            console.log('');
            process.stdin.destroy();
        });
    }

    _onLine(line) {
        // 空白でパースして最初をコマンド、残りを引数とする
        var args = line.split(/\s+/),
            cmd = args.shift();
        // ハンドラーにコマンドがあったら実行、この時callを使って、ハンドラーのthisをrliにしてやる
        if (this.handler[cmd]) {
            this.handler[cmd](args, this, function (err, res) {
                console.log(res); // コマンドの実行結果を出力
                this.readlineInterface.prompt();
            }.bind(this));
        } else if (cmd.length > 0) {
            console.log('cmd not found.');
        }
        this.readlineInterface.prompt();
    }

    addAdapter(adapter) {
        if (adapter.mac) {
            this._broadlinks[adapter.mac] = adapter;
        } else {
            this._scanner = adapter;
        }
    }

    stopLearning() {
        if (this._interval) clearInterval(this._interval);
        this._interval = null;
        if (this._device) this._device.removeListener('rawData', onRawData);

        console.log(`Learn Code (stopped)`);
    }

    _onRawData(message) {
        const hex = message.toString('hex');
        console.log(message);
        console.log(`Learn Code (learned hex code: ${hex})`);
        this.handler.add(hex);
        this._device.enterLearning();
        console.log(`Learn Code (ready)`);
    };

    startLearning(disableTimeout) {
        this.stopLearning();

        // Get the Broadlink device
        const adapter = this._broadlinks[this._mac];

        if (adapter) this._device = adapter._broadlink;

        if (!this._device) {
            if (this._scanner) this._scanner.startPairing(10);
            setTimeout(function () { this.startLearning(disableTimeout) }.bind(this), 1000);
            return;
        }

        if (!this._device.enterLearning) return console.log(`Learn Code (IR learning not supported for device at ${this._mac})`);

        this._device.on('rawData', this._onRawData.bind(this));

        this._device.enterLearning();
        console.log(`Learn Code (ready)`);

        this.readlineInterface.prompt();

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

const learnManager = new LearnManager(process.argv[2], new CommandHandler());
BroadlinkLoader(learnManager, {});