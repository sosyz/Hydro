/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-eval */
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import i18n from '../lib/i18n';
import { Logger } from '../logger';
import * as bus from '../service/bus';

const logger = new Logger('common');

async function getFiles(folder: string, base = ''): Promise<string[]> {
    const files = [];
    const f = await fs.readdir(folder);
    for (const i of f) {
        if ((await fs.stat(path.join(folder, i))).isDirectory()) {
            files.push(...await getFiles(path.join(folder, i), path.join(base, i)));
        } else files.push(path.join(base, i));
    }
    return files.map((item) => item.replace(/\\/gmi, '/'));
}

function locateFile(basePath: string, filenames: string[]) {
    for (const i of filenames) {
        const p = path.resolve(basePath, i);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

const getLoader = (type: string, filename: string) => async function loader(pending: string[], fail: string[]) {
    for (const i of pending) {
        const p = locateFile(i, [`${filename}.ts`, `${filename}.js`]);
        if (p && !fail.includes(i)) {
            try {
                logger.info(`${type.replace(/^(.)/, (t) => t.toUpperCase())} init: %s`, i);
                require(p);
            } catch (e) {
                fail.push(i);
                logger.info(`${type.replace(/^(.)/, (t) => t.toUpperCase())} load fail: %s`, i);
                logger.error(e);
            }
        }
    }
    await bus.serial(`app/load/${type}`);
};

export const handler = getLoader('handler', 'handler');
export const addon = getLoader('addon', 'index');
export const model = getLoader('model', 'model');
export const lib = getLoader('lib', 'lib');
export const script = getLoader('script', 'script');

export async function locale(pending: string[], fail: string[]) {
    await Promise.all(pending.map(async (i) => {
        const p = locateFile(i, ['locale', 'locales']);
        if (p && (await fs.stat(p)).isDirectory() && !fail.includes(i)) {
            try {
                const files = await fs.readdir(p);
                const locales = {};
                for (const file of files) {
                    const content = await fs.readFile(path.resolve(p, file), 'utf-8');
                    locales[file.split('.')[0]] = yaml.load(content);
                }
                i18n(locales);
                logger.info('Locale init: %s', i);
            } catch (e) {
                fail.push(i);
                logger.error('Locale Load Fail: %s', i);
                logger.error(e);
            }
        }
    }));
    await bus.serial('app/load/locale');
}

export async function setting(pending: string[], fail: string[], modelSetting: typeof import('../model/setting')) {
    const map = {
        system: modelSetting.SystemSetting,
        account: modelSetting.AccountSetting,
        preference: modelSetting.PreferenceSetting,
        domain: modelSetting.DomainSetting,
    };
    for (const i of pending) {
        let p = path.resolve(i, 'setting.yaml');
        const t = i.split(path.sep);
        // TODO: change this name setting to package name
        const name = t[t.length - 1];
        if (!fs.existsSync(p)) p = path.resolve(i, 'settings.yaml');
        if (fs.existsSync(p) && !fail.includes(i)) {
            try {
                const cfg: any = yaml.load(await fs.readFile(p, 'utf-8'));
                for (const key in cfg) {
                    let val = cfg[key].default || cfg[key].value;
                    if (typeof val === 'string') {
                        val = val
                            .replace(/\$TEMP/g, os.tmpdir())
                            .replace(/\$HOME/g, os.homedir());
                    }
                    const category = cfg[key].category || 'system';
                    map[category](
                        modelSetting.Setting(
                            cfg[key].family || name, category === 'system' ? `${name}.${key}` : key, val, cfg[key].type || 'text',
                            cfg[key].name || key, cfg[key].desc || '',
                        ),
                    );
                }
                logger.info('Config load: %s', i);
            } catch (e) {
                logger.error('Config Load Fail: %s', i);
                logger.error(e);
            }
        }
    }
    await bus.serial('app/load/setting');
}

export async function template(pending: string[], fail: string[]) {
    for (const i of pending) {
        const p = locateFile(i, ['template', 'templates']);
        if (p && (await fs.stat(p)).isDirectory() && !fail.includes(i)) {
            try {
                const files = await getFiles(p);
                for (const file of files) {
                    if (file.endsWith('.tsx')) global.Hydro.ui.template[file] = require(path.resolve(p, file));
                    global.Hydro.ui.template[file] = await fs.readFile(path.resolve(p, file), 'utf-8');
                }
                logger.info('Template init: %s', i);
            } catch (e) {
                fail.push(i);
                logger.error('Template Load Fail: %s', i);
                logger.error(e);
            }
        }
    }
    await bus.serial('app/load/template');
}

export async function service(pending: string[], fail: string[]) {
    for (const i of pending) {
        const p = locateFile(i, ['service.ts', 'service.js']);
        if (p && !fail.includes(i)) {
            try {
                logger.info('Service init: %s', i);
                require(p);
            } catch (e) {
                fail.push(i);
                logger.error('Service Load Fail: %s', i);
                logger.error(e);
            }
        }
    }
    for (const key in global.Hydro.service) {
        if (key === 'server') continue;
        const srv = global.Hydro.service[key];
        if (!srv.started && srv.start) await srv.start();
    }
    await bus.serial('app/load/service');
}
