import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = name => fs.readFileSync(path.join(root,name),'utf8');

export function loadBrowserScripts(files) {
  const context = { console, setTimeout, clearTimeout, setInterval, clearInterval };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  for (const file of files) vm.runInContext(read(file),context,{filename:file});
  return context;
}
