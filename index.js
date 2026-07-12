import os from 'os';
import fs from 'fs';
import nodePath from 'node:path';
import events from 'node:events';
import codes from './codes.json' with { type: 'json' };

let endianness = os.endianness();

export async function listDevices(options = {}) {
    options = Object.assign({ info: false, path: '/dev/input' }, options);
    let files = [];
    for (let file of await fs.promises.readdir(options.path)) {
        file = { path: nodePath.join(options.path, file) };
        try {
            await fs.promises.access(file.path);
        } catch (err) {
            console.log(err)
            continue;
        }
        if (!(await fs.promises.stat(file.path)).isCharacterDevice()) continue;
        files.push(file);
        if (options.info) {
            try {
                file.name = (await fs.promises.readFile(`/sys/class/input/${nodePath.parse(file.path).base}/device/name`)).toString();
            } catch (err) {}
        }
    }
    return files;
}

export class DeviceListener extends events.EventEmitter {
    constructor(path, ...args) {
        if (typeof path !== 'string') throw new Error('path must be a string');
        super(...args);
        this.path = path;
        this.stream = fs.createReadStream(path);
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
    }

    stop() {
        this.stream.destroy();
        this.emit('end');
    }
}

export default { listDevices, DeviceListener };