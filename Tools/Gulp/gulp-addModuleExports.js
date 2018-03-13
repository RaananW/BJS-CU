var gutil = require('gulp-util');
var through = require('through2');

/**
 * The parameters for this function has grown during development.
 * Eventually, this function will need to be reorganized. 
 */
//  subModule, extendsRoot, externalUsingBabylon, noBabylonInit
module.exports = function (varName, config) {
    return through.obj(function (file, enc, cb) {
        config = config || {};
        if (typeof varName === 'string') {
            varName = {
                name: varName,
                module: varName
            }
            if (varName.name === 'BABYLON') {
                varName.module = 'babylonjs';
            }
        }
        if (!config.dependencies) {
            if (config.subModule || config.extendsRoot) {
                config.dependencies = [
                    {
                        name: "BABYLON",
                        module: "babylonjs",
                        optional: false
                    }
                ]
            }
        }

        function moduleExportAddition(varName) {

            let dependenciesDefinition = `var amdDependencies = [];`;
            let functionVariables = '';
            if (config.dependencies) {
                config.dependencies.forEach(dep => {
                    if (functionVariables) functionVariables += ',';
                    functionVariables += dep.name;
                    dependenciesDefinition += `
    var ${dep.name} = root.${dep.name};
    if(!${dep.name}) {
        if(typeof exports === 'object') {
            ${dep.optional ? ' try { ' : ''} ${dep.name} = require("${dep.module}"); ${dep.optional ? ' } catch(e) {} ' : ''}
        } else if(typeof define === 'function' && define.amd) {
            ${dep.optional ? ' if(require.defined && require.defined("' + dep.module + '"))' : ''} amdDependencies.push("${dep.module}");
        }
    }
`
                });

            }

            let base = config.subModule ? 'BABYLON' : varName.name;

            return `\n\n(function universalModuleDefinition(root, factory) {
    ${dependenciesDefinition}
    if(typeof exports === 'object' && typeof module === 'object')
        module.exports = factory(${config.subModule || config.extendsRoot ? 'require("babylonjs")' : ''});
    else if(typeof define === 'function' && define.amd)
        define("${varName.module}", ${config.subModule || config.extendsRoot ? 'amdDependencies,' : '[],'} factory);
    else if(typeof exports === 'object')
        exports["${varName.module}"] = factory(${config.subModule || config.extendsRoot ? 'require("babylonjs")' : ''});
    else {
        root["${base}"]${(config.subModule && !config.extendsRoot) ? '["' + varName.name + '"]' : ''} = factory(root["BABYLON"]);
    }
})(this, function(${functionVariables}) {
    ${String(file.contents)}
    ${varName.name === 'BABYLON' || varName.name === 'INSPECTOR' ? `
var globalObject = (typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this);
globalObject["${varName.name}"] = ${varName.name}` : ''}
    return ${base}${(config.subModule && !config.extendsRoot) ? '.' + varName.name : ''};
});
`;
        }

        var extendsAddition =
            `var __extends=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,o){t.__proto__=o}||function(t,o){for(var n in o)o.hasOwnProperty(n)&&(t[n]=o[n])};return function(o,n){function r(){this.constructor=o}t(o,n),o.prototype=null===n?Object.create(n):(r.prototype=n.prototype,new r)}}();
`;

        var decorateAddition = `var __decorate=this&&this.__decorate||function(e,t,r,c){var o,f=arguments.length,n=f<3?t:null===c?c=Object.getOwnPropertyDescriptor(t,r):c;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,c);else for(var l=e.length-1;l>=0;l--)(o=e[l])&&(n=(f<3?o(n):f>3?o(t,r,n):o(t,r))||n);return f>3&&n&&Object.defineProperty(t,r,n),n};
`;

        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            //streams not supported, no need for now.
            return;
        }

        try {
            if (config.externalUsingBabylon) {
                file.contents = new Buffer(String('').concat(moduleExportAddition(varName)));
            } else {
                let pretext = '';
                file.contents = new Buffer(decorateAddition.concat(new Buffer(extendsAddition.concat(String('')).concat(moduleExportAddition(varName)))));
            }
            this.push(file);
        } catch (err) {
            this.emit('error', new gutil.PluginError('gulp-add-module-exports', err, { fileName: file.path }));
        }
        cb();
    });
};
