# evdevlib
A small package for listening to Linux evdev (/dev/input/eventX) device streams in Node.js

## Usage
### listDevices([options])
Lists devices in `/dev/input`.
- **options:** An object used to provide optional arguments.
    - **info:** Automatically fetches the device name from `/sys/class/input`.

Example:
```js
import { listDevices } from 'evdevlib';

console.log(listDevices()); // Prints: [ { device: 'event0' }]
console.log(listDevices({ info: true })); // Prints: [ { device: 'event0', name: 'Mouse' }]
```

### Class: DeviceListener
Listens to a device's input stream
- **constructor(device, [...args]):**
    - **device:** The device to listen to (e.g. `event0`)
    - **args:** Args to pass to the EventEmitter constructor
- **stop():** Destroys the read stream and stops listening for input.
- events
    - **data:** Emitted when input is received from the device.
        - **input:** An object version of the `input_event` struct (see https://docs.kernel.org/input/input.html#event-interface).
    - **error:** Emitted when an 'error' event is received from the read stream.
        - **error**
    - **close:** Emitted when a 'close' event is received from the read stream.
    - **end:** Emitted after `stop()` or when an 'end' event is received from the read stream.

Example:
```js
import { DeviceListener } from 'evdevlib';

let listener = new DeviceListener('event0');
listener.on('data', input => console.log(input));
listener.on('error', error => console.log('Error reading device input:', error));
console.log('Listening for input...');
// ...
listener.stop();
console.log('Stopped listening for input.');
```

An input event for relative mouse movement would look something like this:
```js
{
    tv_sec: 1783887711n,
    tv_usec: 338192n,
    type: 'REL',
    code: 'REL_X',
    value: 1
}
```
See https://docs.kernel.org/input/event-codes.html#input-event-codes for all event types.