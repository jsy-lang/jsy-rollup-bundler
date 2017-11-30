'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var child_process = require('child_process');
var rollup = require('rollup');
var chokidar = _interopDefault(require('chokidar'));
var rpi_babel = _interopDefault(require('rollup-plugin-babel'));

function jsy_plugin(kwargs) {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  const presets = [jsy_preset].concat(kwargs.presets || []);

  kwargs = Object.assign({ exclude: 'node_modules/**',
    babelrc: false, highlightCode: false }, kwargs, { presets });

  return rpi_babel(kwargs);
}

function bundle({ source, opt, globalModules, externals, plugins, format, amd }) {
  if ('string' !== typeof source) {
    throw new TypeError(`Expected string source parameter`);
  }
  if (null == opt) {
    throw new TypeError(`Expected valid "opt" object parameter`);
  }
  opt = Object.create(opt // Don't modify the underlying object
  );
  if (null == globalModules) {
    globalModules = opt.globalModules || {};
  }
  if (null == externals) {
    externals = opt.externals || [];
  }
  if (null == plugins) {
    plugins = opt.plugins || [];
  }
  if (null == format) {
    format = opt.format || 'iife';
  }
  if (null == opt.suffix) {
    opt.suffix = opt.production ? '.min' : '';
  }
  if (null == opt.outdir) {
    opt.outdir = './dist/public';
  }
  if (null == opt.source) {
    opt.source = path.parse(source);
  }

  externals = new Set(externals);
  const input = { input: source, plugins,
    external: module => !!globalModules[module] || externals.has(module) };

  if (amd) {
    format = 'amd';
  }

  const output = {
    format,
    name: opt.source.name,
    file: `${opt.outdir}/${opt.source.name}${opt.suffix}.js`,
    sourcemap: opt.sourcemap,
    globals: module => globalModules[module] };

  if (amd) {
    output.amd = amd;
  }

  return asRollupBuildClosure({
    input, output, opt });
}

function asRollupBuildClosure({ input, output, opt }) {
  let bundle;
  return async function () {
    const log_msg = `rollup bundle "${opt.source.name}" (@${Date.now().toString(36)})`;
    console.log(`Building ${log_msg}`);
    console.time(`Built ${log_msg}`);
    try {
      input.cache = bundle;
      console.time(`Compiled ${log_msg}`);
      bundle = await rollup.rollup(input);
      console.timeEnd(`Compiled ${log_msg}`);
      await bundle.write(output);
    } catch (err) {
      const { code, loc, frame } = err;
      const lines = ['', '', `${err.message} (${code})`, `  in "${loc.file}" at ${loc.line}:${loc.column}"`, '', frame, '', ''];

      console.error(lines.join('\n'));
    } finally {
      console.timeEnd(`Built ${log_msg}`);
    }
  };
}

function buildAll(buildList) {
  return Promise.all(buildList.map(builder => builder()));
}

function watchAndBuild(on_restart) {
  if (on_restart && 'function' !== typeof on_restart) {
    throw new TypeError(`Expected on_restart to be a function`);
  }

  let watchers = [];
  const self = { rebuildOn, buildOnce, restartOn };
  return self;

  function restartOn(watch_glob) {
    watchers.push(chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', path$$1 => {
      if (!watchers) {
        return;
      }
      console.log(`Setup changed; shutting down watchers ("${path$$1}")`);
      const l_watchers = watchers;
      watchers = null;
      for (const each of l_watchers) {
        each.close();
      }

      if (on_restart) {
        on_restart(path$$1);
      }
    }));

    return self;
  }

  function buildOnce(buildOnce, watch_glob) {
    if (Array.isArray(buildOnce)) {
      buildOnce = buildAll.bind(null, buildOnce);
    }

    if ('function' !== typeof buildOnce) {
      throw new TypeError(`Expected buildOnce to be a function or array`);
    }

    if (watch_glob) {
      restartOn(watch_glob);
    }

    buildOnce();
    return self;
  }

  function rebuildOn(rebuild, watch_glob) {
    let inprogress = false;
    if (Array.isArray(rebuild)) {
      rebuild = buildAll.bind(null, rebuild);
    }

    if ('function' !== typeof rebuild) {
      throw new TypeError(`Expected rebuild to be a function or array`);
    }

    // invoke initial build
    rebuild();

    watchers.push(chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', _debounce));

    return self;

    function _debounce(path$$1) {
      // debounce rapid updates
      if (false === inprogress) {
        inprogress = true;
        setTimeout(() => {
          inprogress = false;
          rebuild();
        }, 50).unref();
      }
      return self;
    }
  }
}

watchAndBuild.forever = function (command = `babel-node rollup.cfg.jsy --watch-impl`) {
  while (true) {
    child_process.execSync(command, { stdio: 'inherit' });
    console.log(`\n\nRestarting rollup watch\n\n`);
  }
};

exports.jsy_plugin = jsy_plugin;
exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7ZXhlY1N5bmN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgICAgICBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogZmFsc2VcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0c1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBleHRlcm5hbHMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5jcmVhdGUgQCBvcHQgLy8gRG9uJ3QgbW9kaWZ5IHRoZSB1bmRlcmx5aW5nIG9iamVjdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gZXh0ZXJuYWxzIDo6IGV4dGVybmFscyA9IG9wdC5leHRlcm5hbHMgfHwgW11cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IGZvcm1hdCA6OiBmb3JtYXQgPSBvcHQuZm9ybWF0IHx8ICdpaWZlJ1xuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgZXh0ZXJuYWxzID0gbmV3IFNldCBAIGV4dGVybmFsc1xuICBjb25zdCBpbnB1dCA9IEB7fSBpbnB1dDogc291cmNlLCBwbHVnaW5zLFxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdIHx8IGV4dGVybmFscy5oYXMobW9kdWxlKVxuXG4gIGlmIGFtZCA6OiBmb3JtYXQgPSAnYW1kJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFsczogbW9kdWxlID0+IGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmIGFtZCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuXG4gICAgY2F0Y2ggZXJyIDo6XG4gICAgICBjb25zdCB7Y29kZSwgbG9jLCBmcmFtZX0gPSBlcnJcbiAgICAgIGNvbnN0IGxpbmVzID0gQFtdXG4gICAgICAgICcnXG4gICAgICAgICcnXG4gICAgICAgIGAke2Vyci5tZXNzYWdlfSAoJHtjb2RlfSlgXG4gICAgICAgIGAgIGluIFwiJHtsb2MuZmlsZX1cIiBhdCAke2xvYy5saW5lfToke2xvYy5jb2x1bW59XCJgXG4gICAgICAgICcnXG4gICAgICAgIGZyYW1lXG4gICAgICAgICcnXG4gICAgICAgICcnXG5cbiAgICAgIGNvbnNvbGUuZXJyb3IgQCBsaW5lcy5qb2luKCdcXG4nKVxuXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChvbl9yZXN0YXJ0KSA6OlxuICBpZiBvbl9yZXN0YXJ0ICYmICdmdW5jdGlvbicgIT09IHR5cGVvZiBvbl9yZXN0YXJ0IDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBvbl9yZXN0YXJ0IHRvIGJlIGEgZnVuY3Rpb25gXG5cbiAgbGV0IHdhdGNoZXJzID0gW11cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIGJ1aWxkT25jZSwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgaWYgISB3YXRjaGVycyA6OiByZXR1cm5cbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgICAgICBpZiBvbl9yZXN0YXJ0IDo6IG9uX3Jlc3RhcnQocGF0aClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICAgIHJlYnVpbGQoKVxuXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIHJlYnVpbGQoKVxuICAgICAgICAgIDUwXG4gICAgICAgIC51bnJlZigpXG4gICAgICByZXR1cm4gc2VsZlxuXG5cbndhdGNoQW5kQnVpbGQuZm9yZXZlciA9IGZ1bmN0aW9uKGNvbW1hbmQ9YGJhYmVsLW5vZGUgcm9sbHVwLmNmZy5qc3kgLS13YXRjaC1pbXBsYCkgOjpcbiAgd2hpbGUgdHJ1ZSA6OlxuICAgIGV4ZWNTeW5jIEAgY29tbWFuZCwgQHt9IHN0ZGlvOiAnaW5oZXJpdCdcbiAgICBjb25zb2xlLmxvZyBAIGBcXG5cXG5SZXN0YXJ0aW5nIHJvbGx1cCB3YXRjaFxcblxcbmBcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJwcmVzZXRzIiwiY29uY2F0IiwiT2JqZWN0IiwiYXNzaWduIiwiZXhjbHVkZSIsImhpZ2hsaWdodENvZGUiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwiZXh0ZXJuYWxzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsImNyZWF0ZSIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiU2V0IiwiaW5wdXQiLCJtb2R1bGUiLCJoYXMiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsImNhY2hlIiwicm9sbHVwIiwidGltZUVuZCIsIndyaXRlIiwiZXJyIiwiY29kZSIsImxvYyIsImZyYW1lIiwibGluZXMiLCJtZXNzYWdlIiwiZmlsZSIsImxpbmUiLCJjb2x1bW4iLCJlcnJvciIsImpvaW4iLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsIm9uX3Jlc3RhcnQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwicHVzaCIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsInBhdGgiLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzIiwiX2RlYm91bmNlIiwidW5yZWYiLCJmb3JldmVyIiwiY29tbWFuZCIsInN0ZGlvIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFPTyxTQUFTQSxVQUFULENBQW9CQyxNQUFwQixFQUE0QjtRQUMzQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtRQUNNQyxVQUFVLENBQUNILFVBQUQsRUFBYUksTUFBYixDQUFzQkwsT0FBT0ksT0FBUCxJQUFrQixFQUF4QyxDQUFoQjs7V0FFU0UsT0FBT0MsTUFBUCxDQUNQLEVBQUlDLFNBQVMsaUJBQWI7YUFDYSxLQURiLEVBQ29CQyxlQUFlLEtBRG5DLEVBRE8sRUFHUFQsTUFITyxFQUlQLEVBQUlJLE9BQUosRUFKTyxDQUFUOztTQU1PTSxVQUFVVixNQUFWLENBQVA7OztBQUdGLEFBQU8sU0FBU1csTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVNDLEdBQVQsRUFBY0MsYUFBZCxFQUE2QkMsU0FBN0IsRUFBd0NDLE9BQXhDLEVBQWlEQyxNQUFqRCxFQUF5REMsR0FBekQsRUFBaEIsRUFBK0U7TUFDakYsYUFBYSxPQUFPTixNQUF2QixFQUFnQztVQUFPLElBQUlPLFNBQUosQ0FBaUIsa0NBQWpCLENBQU47O01B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
