import os from 'os';
import fs from 'fs';
import events from 'node:events';
import codes from './codes.json' with { type: 'json' };

let endianness = os.endianness();

export async function listDevices(options = {}) {
    let files = [];
    for (let file of await fs.promises.readdir('/dev/input')) {
        file = { device: file };
        if (!(await fs.promises.stat(`/dev/input/${file.device}`)).isCharacterDevice()) continue;
        files.push(file);
        if (options.info) {
            try {
                await fs.promises.access(`/sys/class/input/${file.device}/device`);
            } catch (err) {
                continue;
            }
            file.name = (await fs.promises.readFile(`/sys/class/input/${file.device}/device/name`)).toString();
        }
    }
    return files;
}

export class DeviceListener extends events.EventEmitter {
    constructor(device, ...args) {
        if (typeof device !== 'string') throw new Error('device must be a string');
        super(...args);
        this.device = device;
        if (!device.startsWith('event')) throw new Error(`Input type of "${device}" is not supported.`);
        fs.access(`/sys/class/input/${device}/device`, (err) => {
            if (err) throw err;
            this.stream = fs.createReadStream(`/dev/input/${device}`);
            this.stream.on('data', data => {
                for (let i = 0; i < data.length;) {
                    let tv_sec = data.slice(i, i += 8)[`readBigInt64${endianness}`]();
                    let tv_usec = data.slice(i, i += 8)[`readBigInt64${endianness}`]();
                    let type = data.slice(i, i += 2)[`readInt16${endianness}`]();
                    type = codes[type].find(a => a.startsWith('EV_'));
                    type = type.slice(type.indexOf('_') + 1);
                    let codeTypes = type == 'KEY' ? ['KEY', 'BTN'] : [type];
                    if (codeTypes[0] == 'KEY') codeTypes.push('BTN');
                    let code = data.slice(i, i += 2)[`readInt16${endianness}`]();
                    code = codes[code].find(a => codeTypes.includes(a.split('_')[0])) || code;
                    let value = data.slice(i, i += 4)[`readInt32${endianness}`]();
                    this.emit('data', { tv_sec, tv_usec, type, code, value });
                }
            });
            this.stream.on('error', err => this.emit('error', err));
            this.stream.on('close', () => this.emit('end'));
            this.stream.on('end', () => this.emit('end'));
        });
    }

    stop() {
        this.stream.destroy();
        this.emit('end');
    }
}

export default { listDevices, DeviceListener };