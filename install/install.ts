/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-sequences */
import { execSync, ExecSyncOptions } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const exec = (command: string, args?: ExecSyncOptions) => {
    try {
        return {
            output: execSync(command, args).toString(),
            code: 0,
        };
    } catch (e) {
        return {
            code: e.status,
            message: e.message,
        };
    }
};
const sleep = (t: number) => new Promise((r) => { setTimeout(r, t); });
const locales = {
    zh: {
        'install.start': '开始运行 Hydro 安装工具',
        'warn.avx2': '检测到您的 CPU 不支持 avx2 指令集，将使用 mongodb@v4.4',
        'error.rootRequired': '请先使用 sudo su 切换到 root 用户后再运行该工具。',
        'error.unsupportedArch': '不支持的架构 %s ,请尝试手动安装。',
        'error.osreleaseNotFound': '无法获取系统版本信息（/etc/os-release 文件未找到），请尝试手动安装。',
        'error.unsupportedOS': '不支持的操作系统 %s ，请尝试手动安装，',
        'install.preparing': '正在初始化安装...',
        'install.mongodb': '正在安装 mongodb...',
        'install.createDatabaseUser': '正在创建数据库用户...',
        'install.compiler': '正在安装编译器...',
        'install.hydro': '正在安装 Hydro...',
        'install.done': 'Hydro 安装成功！',
        'extra.dbUser': '数据库用户名： hydro',
        'extra.dbPassword': '数据库密码： %s',
        'info.skip': '步骤已跳过。',
    },
    en: {
        'install.start': 'Starting Hydro installation tool',
        'warn.avx2': 'Your CPU does not support avx2, will use mongodb@v4.4',
        'error.rootRequired': 'Please run this tool as root user.',
        'error.unsupportedArch': 'Unsupported architecture %s, please try to install manually.',
        'error.osreleaseNotFound': 'Unable to get system version information (/etc/os-release file not found), please try to install manually.',
        'error.unsupportedOS': 'Unsupported operating system %s, please try to install manually.',
        'install.preparing': 'Initializing installation...',
        'install.mongodb': 'Installing mongodb...',
        'install.createDatabaseUser': 'Creating database user...',
        'install.compiler': 'Installing compiler...',
        'install.hydro': 'Installing Hydro...',
        'install.done': 'Hydro installation completed!',
        'extra.dbUser': 'Database username: hydro',
        'extra.dbPassword': 'Database password: %s',
        'info.skip': 'Step skipped.',
    },
};
let locale = process.env.LANG?.includes('zh') ? 'zh' : 'en';
if (process.env.TERM === 'linux') locale = 'en';
const processLog = (orig) => (str, ...args) => (orig(locales[locale][str] || str, ...args), 0);
const log = {
    info: processLog(console.log),
    warn: processLog(console.warn),
    fatal: (str, ...args) => (processLog(console.error)(str, ...args), process.exit(1)),
};

if (!process.getuid) log.fatal('error.unsupportedOs');
else if (process.getuid() !== 0) log.fatal('error.rootRequired');
if (!['x64', 'arm64'].includes(process.arch)) log.fatal('error.unsupportedArch', process.arch);
if (!process.env.HOME) log.fatal('$HOME not found');
if (!existsSync('/etc/os-release')) log.fatal('error.osreleaseNotFound');
const osinfoFile = readFileSync('/etc/os-release', 'utf-8');
const lines = osinfoFile.split('\n');
const values = {};
for (const line of lines) {
    if (!line.trim()) continue;
    const d = line.split('=');
    if (d[1].startsWith('"')) values[d[0].toLowerCase()] = d[1].substr(1, d[1].length - 2);
    else values[d[0].toLowerCase()] = d[1];
}
let avx2 = true;
const cpuInfoFile = readFileSync('/proc/cpuinfo', 'utf-8');
if (!cpuInfoFile.includes('avx2')) {
    avx2 = false;
    log.warn('warn.avx2');
}
let migration;
let retry = 0;
log.info('install.start');
const defaultDict = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
String.random = function random(digit = 32, dict = defaultDict) {
    let str = '';
    for (let i = 1; i <= digit; i++) str += dict[Math.floor(Math.random() * dict.length)];
    return str;
};
let DATABASE_PASSWORD = String.random(32);
// TODO read from args
const CN = true;

const nixBin = `${process.env.HOME}/.nix-profile/bin`;
const entry = (source: string, target = source, ro = true) => `\
  - type: bind
    source: ${source}
    target: ${target}${ro ? '\n    readonly: true' : ''}`;
const mount = `mount:
${entry(nixBin, '/bin')}
${entry(nixBin, '/usr/bin')}
${entry('/nix', '/nix')}
${entry('/dev/null', '/dev/null', false)}
${entry('/dev/urandom', '/dev/urandom', false)}
  - type: tmpfs
    target: /w
    data: size=512m,nr_inodes=8k
  - type: tmpfs
    target: /tmp
    data: size=512m,nr_inodes=8k
proc: true
workDir: /w
hostName: executor_server
domainName: executor_server
uid: 1536
gid: 1536
`;

function removeOptionalEsbuildDeps() {
    const yarnGlobalPath = exec('yarn global dir').output?.trim() || '';
    if (!yarnGlobalPath) return false;
    const pkgjson = `${yarnGlobalPath}/package.json`;
    const data = existsSync(pkgjson) ? require(pkgjson) : {};
    data.resolutions = data.resolutions || {};
    Object.assign(data.resolutions, Object.fromEntries([
        '@esbuild/linux-loong64',
        ...['android', 'windows', 'darwin', 'freebsd'].flatMap((i) => [`${i}-64`, `${i}-arm64`, `${i}-32`]),
        ...['32', 'arm', 'mips64', 'ppc64', 'riscv64', 's390x'].map((i) => `esbuild-linux-${i}`),
        ...['netbsd', 'openbsd', 'sunos'].map((i) => `esbuild-${i}-64`),
    ].map((i) => [i, 'link:/dev/null'])));
    exec(`mkdir -p ${yarnGlobalPath}`);
    writeFileSync(pkgjson, JSON.stringify(data, null, 2));
    return true;
}

const steps = [
    {
        init: 'install.preparing',
        operations: [
            () => {
                // Not implemented yet
                // if (fs.existsSync('/home/judge/src')) {
                //     const res = cli.prompt('migrate.hustojFound');
                //     if (res.toLowerCase().trim() === 'y') migration = 'hustoj';
                // }

                // const docker = !exec1('docker -v').code;
                // if (!docker) return;
                // // TODO check more places
                // if (fs.exist('/root/OnlineJudgeDeploy/docker-compose.yml')) {
                //     const res = cli.prompt('migrate.qduojFound');
                //     if (res.toLowerCase().trim() === 'y') migration = 'qduoj';
                // }
            },
        ],
    },
    {
        init: 'install.mongodb',
        operations: [
            `nix-env -iA hydro.mongodb${avx2 ? 5 : 4}${CN ? '-cn' : ''}`,
            'nix-env -iA nixpkgs.mongodb-tools',
            `nix-env -iA hydro.mongosh${avx2 ? 5 : 4}${CN ? '-cn' : ''}`,
        ],
    },
    {
        init: 'install.compiler',
        operations: [
            'nix-env -iA nixpkgs.gcc nixpkgs.fpc nixpkgs.python3',
        ],
    },
    {
        init: 'install.sandbox',
        skip: () => !exec('hydro-sandbox --help').code,
        operations: [
            'nix-env -iA hydro.sandbox',
        ],
    },
    {
        init: 'install.hydro',
        operations: [
            () => removeOptionalEsbuildDeps(),
            ['yarn global add hydrooj @hydrooj/ui-default @hydrooj/hydrojudge', { retry: true }],
            () => writeFileSync(`${process.env.HOME}/.hydro/addon.json`, '["@hydrooj/ui-default","@hydrooj/hydrojudge"]'),
        ],
    },
    {
        init: 'install.createDatabaseUser',
        skip: () => existsSync(`${process.env.HOME}/.hydro/config.json`),
        operations: [
            'pm2 start mongod',
            () => sleep(3000),
            () => writeFileSync('/tmp/createUser.js', `db.createUser(${JSON.stringify({
                user: 'hydro',
                pwd: DATABASE_PASSWORD,
                roles: [{ role: 'readWrite', db: 'hydro' }],
            })})`),
            ['mongo 127.0.0.1:27017/hydro /tmp/createUser.js', { retry: true }],
            () => writeFileSync(`${process.env.HOME}/.hydro/config.json`, JSON.stringify({
                host: '127.0.0.1',
                port: 27017,
                name: 'hydro',
                username: 'hydro',
                password: DATABASE_PASSWORD,
            })),
            'pm2 stop mongod',
            'pm2 del mongod',
        ],
    },
    {
        init: 'install.starting',
        operations: [
            ['pm2 stop all', { ignore: true }],
            () => writeFileSync(`${process.env.HOME}/.hydro/mount.yaml`, mount),
            'pm2 start mongod --name mongodb -- --auth --bind_ip 0.0.0.0',
            () => sleep(1000),
            `pm2 start bash --name hydro-sandbox -- -c "ulimit -s unlimited && hydro-sandbox -mount-conf ${process.env.HOME}/.hydro/mount.yaml"`,
            'pm2 start hydrooj',
            'pm2 startup',
            'pm2 save',
        ],
    },
    {
        init: 'install.migrateHustoj',
        skip: () => migration !== 'hustoj',
        silent: true,
        operations: [
            ['yarn global add @hydrooj/migrate', { retry: true }],
            'hydrooj addon add @hydrooj/migrate',
            () => {
                const config = {
                    host: 'localhost',
                    port: 3306,
                    name: 'jol',
                    dataDir: '/home/judge/data',
                    // TODO: auto-read uname&passwd&contestType
                    username: 'debian-sys-maint',
                    password: '',
                    contestType: 'acm',
                };
                exec(`hydrooj cli script migrateHustoj ${JSON.stringify(config)}`);
            },
            'pm2 restart hydrooj',
        ],
    },
    {
        init: 'install.done',
        operations: [
            () => {
                DATABASE_PASSWORD = require(`${process.env.HOME}/.hydro/config.json`).password;
            },
            () => log.info('extra.dbUser'),
            () => log.info('extra.dbPassword', DATABASE_PASSWORD),
        ],
    },
];

async function main() {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step.silent) log.info(step.init);
        if (!(step.skip && step.skip())) {
            for (let op of step.operations) {
                if (!(op instanceof Array)) op = [op, {}] as any;
                if (op[0].toString().startsWith('nix-env')) op[1].retry = true;
                if (typeof op[0] === 'string') {
                    retry = 0;
                    let res = exec(op[0], { stdio: 'inherit' });
                    while (res.code && op[1].ignore !== true) {
                        if (op[1].retry && retry < 30) {
                            log.warn('Retry... (%s)', op[0]);
                            res = exec(op[0], { stdio: 'inherit' });
                            retry++;
                        } else log.fatal('Error when running %s', op[0]);
                    }
                } else {
                    retry = 0;
                    let res = op[0](op[1]);
                    while (res === 'retry') {
                        if (retry < 30) {
                            log.warn('Retry...');
                            // eslint-disable-next-line no-await-in-loop
                            res = await op[0](op[1]);
                            retry++;
                        } else log.fatal('Error installing');
                    }
                }
            }
        } else if (!step.silent) log.info('info.skip');
    }
}
main().catch(log.fatal);
