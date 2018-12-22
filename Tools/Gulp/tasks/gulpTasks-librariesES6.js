// Gulp Tools
var gulp = require("gulp");
var path = require("path");
var fs = require("fs-extra");
var shelljs = require("shelljs");
var concat = require('gulp-concat');

// Gulp Helpers
var rmDir = require("../../NodeHelpers/rmDir");
var processImports = require("../helpers/gulp-processImportsToEs6");
var processLooseDeclaration = require("../helpers/gulp-processLooseDeclarationEs6");

// Import Build Config
var config = require("../../Config/config.js");

/**
 * Clean folders.
 */
var clean = function(settings, cb) {
    rmDir(settings.computed.sourceES6Directory);
    rmDir(settings.computed.distES6Directory);
    cb();
}

/**
 * Copy Sources.
 */
var source = function(settings) {
    return gulp.src(settings.computed.mainDirectory + "/**/*")
        .pipe(gulp.dest(settings.computed.sourceES6Directory));
}

/**
 * Copy dependencies.
 */
var dep = function(settings) {
    const copyPaths = []
    // Add tsconfig rules.
    copyPaths.push(path.join(config.computed.rootFolder, "tsconfigRules.json"));

    const tsconfig = require(settings.computed.tsConfigPath);
    for (let pathName in tsconfig.compilerOptions.paths) {
        let paths = tsconfig.compilerOptions.paths[pathName];
        for (let dep of paths) {
            const fullPath = path.resolve(settings.computed.mainDirectory, 
                tsconfig.compilerOptions.baseUrl, 
                dep);
            copyPaths.push(fullPath);
        }
    }

    if (settings.build.es6.webpackBuild && settings.build.es6.webpackBuild.dependencies) {
        for (let pathName of settings.build.es6.webpackBuild.dependencies) {
            const dependencyPath = path.join(config.computed.rootFolder, pathName);
            copyPaths.push(dependencyPath);
        }
    }

    return gulp.src(copyPaths, { base: config.computed.rootFolder })
        .pipe(gulp.dest(config.computed.sourceES6Folder));
}

/**
 * Adapt Sources import paths.
 */
var modifySources = function(settings) {
    const tsconfig = require(settings.computed.tsConfigPath);

    var replacements = [];
    for (let pathName in tsconfig.compilerOptions.paths) {
        if (pathName.endsWith("/*")) {
            pathName = pathName.replace("/*", "");
        }

        for (var moduleName of config.modules) {
            var module = config[moduleName];
            if (module.build.umd.packageName === pathName) {
                if (module.build.es6.packageName) {
                    var packageName = pathName;
                    var newPackageName = module.build.es6.packageName;
                    replacements.push({ 
                        packageName,
                        newPackageName
                    });
                    break;
                }
            }
        }
    }

    return gulp.src([settings.computed.sourceES6Directory + "/**/*.ts", 
        settings.computed.sourceES6Directory + "/**/*.tsx"])
        .pipe(processImports(replacements));
}

/**
 * Adapt TS Config Paths.
 */
var modifyTsConfig = function(settings, cb) {
    const tsconfig = require(settings.computed.tsConfigPath);

    var newPaths = { };
    for (let pathName in tsconfig.compilerOptions.paths) {
        var newPathName = pathName;
        var originalPath = pathName;
        if (pathName.endsWith("/*")) {
            pathName = pathName.replace("/*", "");
        }

        var mapped = false;
        for (var moduleName of config.modules) {
            var module = config[moduleName];
            if (module.build.umd.packageName === pathName) {
                if (module.build.es6.packageName) {
                    newPathName = module.build.es6.packageName + "*";
                    newPaths[newPathName] = [ module.computed.distES6Directory.replace(/\\/g, "/") ];
                    mapped = true;
                    break;
                }
            }
        }
        if (!mapped) {
            newPaths[newPathName] = tsconfig.compilerOptions.paths[originalPath];
        }
    }

    tsconfig.compilerOptions.paths = newPaths;

    const destTsConfig = path.join(settings.computed.sourceES6Directory, "tsconfig.json");
    fs.writeJSONSync(destTsConfig, tsconfig);

    cb();
}

/**
 * Append Lose DTS Files allowing isolated Modules build
 */
var appendLoseDTSFiles = function(settings) {
    if (settings.build.loseDTSFiles) {
        const indexDTS = path.join(settings.computed.distES6Directory, "index.d.ts");
        return gulp.src([indexDTS, path.join(settings.computed.srcDirectory, settings.build.loseDTSFiles)])
            .pipe(concat("index.d.ts"))
            .pipe(processLooseDeclaration())
            .pipe(gulp.dest(settings.computed.distES6Directory));
    }
    return Promise.resolve();
}

/**
 * TSC Build.
 */
var build = function(settings, cb) {
    // Launch TSC.
    const options = {
        cwd: settings.computed.sourceES6Directory,
        verbose: true
    };

    let command = `tsc --inlineSources --sourceMap true -t es5 -m esNext --outDir "${settings.computed.distES6Directory}"`;
    shelljs.exec(command, options, function(code, stdout, stderr) {
        if (stderr) {
            console.log(stderr);
        }
        if (stdout) {
            console.log(stdout);
        }

        if (code !== 0) {
            cb("TSC Failed.")
        }
        else {
            cb();
        }
    });
}

/**
 * Webpack Build.
 */
var buildWebpack = function(module, cb) {
    const gulpPath = path.join(config.computed.sourceES6Folder, "Tools/Gulp");
    // Launch TSC.
    const options = {
        cwd: gulpPath,
        verbose: true
    };

    let command = `gulp ${module}`;
    shelljs.exec(command, options, function(code, stdout, stderr) {
        if (stderr) {
            console.log(stderr);
        }
        if (stdout) {
            console.log(stdout);
        }

        if (code !== 0) {
            cb("Webpack Build Failed.")
        }
        else {
            cb();
        }
    });
}

/**
 * Copy Webpack Dist.
 */
var copyWebpackDist = function(settings, module) {
    var es6Config = require(path.join(config.computed.sourceES6Folder, "Tools/Config/config"));

    return gulp.src(es6Config[module].computed.distDirectory + "/**/*")
        .pipe(gulp.dest(settings.computed.distES6Directory));
}

/**
 * Dynamic es 6 module creation.
 */
function buildES6Library(settings, module) {
    // Creates the required tasks.
    var tasks = [];

    var cleanup = function(cb) { return clean(settings, cb); };
    var copySource = function() { return source(settings); };
    var dependencies = function() { return dep(settings); };
    var adaptSourceImportPaths = function() { return modifySources(settings); };
    var adaptTsConfigImportPaths = function(cb) { return modifyTsConfig(settings, cb); };
    var buildSteps = null;
    if (settings.build.es6.webpackBuild) {
        buildSteps = [
            function buildes6(cb) { return buildWebpack(module, cb) },
            function copyDist() { return copyWebpackDist(settings, module) }
        ];
    }
    else {
        buildSteps = [
            function buildes6(cb) { return build(settings, cb) }, 
            function appendLoseDTS() { return appendLoseDTSFiles(settings) }
        ];
    }

    tasks.push(cleanup, copySource, dependencies, adaptSourceImportPaths, adaptTsConfigImportPaths, ...buildSteps);

    return gulp.series.apply(this, tasks);
}

/**
 * Dynamic es 6 module creation.
 */
config.modules.map(function(module) {
    const settings = config[module];
    gulp.task(module + "-es6", buildES6Library(settings, module));
});