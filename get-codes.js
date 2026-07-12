import fs from 'fs';
import util from 'util';

let { positionals } = util.parseArgs({
    args: process.argv,
    allowPositionals: true,
    strict: true
});

let path = positionals[2] || '/usr/include/linux/input-event-codes.h';
console.log(`Parsing ${path}`);
let codes = {};
let lines = [];
(await fs.promises.readFile(path)).toString().split('\n').forEach(line => {
    line = line.trim();
    if (!line.startsWith('#define')) return;
    let args = line.slice(8).trim().split('\t');
    if (args.length == 1) return;
    let code = args[0].trim();
    let value = args.slice(1).join(' ').trim();
    if (value.includes('/*')) value = value.slice(0, value.indexOf('/*'));
    lines.push(`let ${code} = ${value};`, `if (codes[${code}] == null) codes[${code}] = [];`, `codes[${code}].push('${code}');`);
})
eval(lines.join('\n'));
await fs.promises.writeFile('codes.json', JSON.stringify(codes, 0, 2));