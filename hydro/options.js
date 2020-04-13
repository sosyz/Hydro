const
    yaml = require('js-yaml'),
    { defaultsDeep } = require('lodash'),
    fs = require('fs'),
    path = require('path');

let options = {
    db: {
        name: 'hydro',
        host: '127.0.0.1',
        port: 27017,
        username: '',
        password: ''
    },
    template: {
        path: path.join(__dirname, '..', 'templates')
    },
    listen: {
        host: '127.0.0.1',
        port: 8888,
        domain: '',
        https: false
    },
    smtp: {
        from: '',
        host: '',
        port: 465,
        user: '',
        pass: '',
        secure: false
    },
    session: {
        keys: ['Hydro'],
        secure: false,
        domain: '127.0.0.1',
        saved_expire_seconds: 3600 * 24,
        unsaved_expire_seconds: 600,
        registration_token_expire_seconds: 600
    },
    constants: {
        PROBLEM_PER_PAGE: 100,
        RECORD_PER_PAGE: 100,
        SOLUTION_PER_PAGE: 20,
        CONTEST_PER_PAGE: 20
    }
};

try {
    let t = yaml.safeLoad(fs.readFileSync(path.resolve(process.cwd(), 'config.yaml')));
    options = defaultsDeep(t, options);
} catch (e) {
    console.error('Cannot load config');
}
module.exports = options;