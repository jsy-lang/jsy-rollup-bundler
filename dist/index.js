'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var util = require('util');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var rollup = require('rollup');
var chokidar = _interopDefault(require('chokidar'));
var rpi_babel = _interopDefault(require('rollup-plugin-babel'));

const writeFile_p = util.promisify(fs.writeFile);

function jsy_plugin(kwargs) {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  const presets = [jsy_preset].concat(kwargs.presets || []);

  kwargs = Object.assign({ exclude: 'node_modules/**', babelrc: false, highlightCode: true }, kwargs, { presets });

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

  if ('function' !== typeof globalModules) {
    const l_globalModules = globalModules;
    globalModules = module => l_globalModules[module];
  }

  externals = new Set(externals);
  const input = Object.assign({ input: source, plugins,
    external: module => !!globalModules(module) || externals.has(module) }, opt.input_options);

  if (amd) {
    format = 'amd';
  }

  const output = Object.assign({ format,
    name: opt.source.name,
    file: `${opt.outdir}/${opt.source.name}${opt.suffix}.js`,
    sourcemap: opt.sourcemap,
    globals: globalModules }, opt.output_options);

  if (amd) {
    output.amd = amd;
  }

  return (opt.buildClosure || asRollupBuildClosure)({
    input, output, opt });
}

function formatBuildError(err, join) {
  const { loc, frame, codeFrame } = err;
  if (!(loc || frame || codeFrame)) {
    return;
  }

  const colors = /\[\d+m/.test(frame || codeFrame || '');
  const hl = v => util.inspect(v, { colors });

  const lines = [];
  let msg = err.message;
  if (err.id) {
    // simplify output by splitting err.id to distinct line
    msg = msg.replace(`${err.id}: `, '');
  }

  lines.push(`BuildError: ${hl(msg)}`);

  if (loc) {
    lines.push(`  in ${hl(loc.file)} at ${hl(loc.line)}:${hl(loc.column)}`);
  }
  if (err.id) {
    lines.push(`  id: ${hl(err.id)}`);
  }
  if (err.code) {
    lines.push(`  code: ${hl(err.code)}`);
  }

  if (frame || codeFrame) {
    lines.push('', frame || codeFrame);
  }

  if (true === join) {
    return lines.join('\n');
  } else if (join) {
    return lines.join(join);
  } else return lines;
}

function asRollupBuildClosure(buildCtx) {
  const { input, output, opt } = buildCtx;
  const err_outfile = `${output.file}.error`;
  let bundle;
  return opt.no_timing ? build : buildWithTiming;

  async function build() {
    try {
      input.cache = bundle;
      bundle = await rollup.rollup(input);
      await bundle.write(output);
      await writeFile_p(err_outfile, '');
    } catch (err) {
      await onBuildError(err);
    }
  }

  async function buildWithTiming() {
    const log_msg = `rollup bundle "${opt.source.name}" (@${Date.now().toString(36)})`;
    console.log(`Building ${log_msg}`);
    console.time(`Built ${log_msg}`);
    try {
      input.cache = bundle;
      console.time(`Compiled ${log_msg}`);
      bundle = await rollup.rollup(input);
      console.timeEnd(`Compiled ${log_msg}`);
      await bundle.write(output);
      await writeFile_p(err_outfile, '');
    } catch (err) {
      await onBuildError(err);
    } finally {
      console.timeEnd(`Built ${log_msg}`);
    }
  }

  async function onBuildError(err) {
    const lines = formatBuildError(err, true);
    if (opt.onBuildError) {
      return opt.onBuildError(err, lines, buildCtx);
    }

    const err_msg = lines ? lines + '\n' : util.inspect(err, { colors: true });

    console.error('\n\n', err_msg, '\n');
    await writeFile_p(err_outfile, err_msg);
  }
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
exports.formatBuildError = formatBuildError;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aW5zcGVjdCwgcHJvbWlzaWZ5fSBmcm9tICd1dGlsJ1xuaW1wb3J0IHt3cml0ZUZpbGV9IGZyb20gJ2ZzJ1xuaW1wb3J0IHtwYXJzZSBhcyBwYXRoX3BhcnNlfSBmcm9tICdwYXRoJ1xuaW1wb3J0IHtleGVjU3luY30gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmNvbnN0IHdyaXRlRmlsZV9wID0gcHJvbWlzaWZ5KHdyaXRlRmlsZSlcblxuZXhwb3J0IGZ1bmN0aW9uIGpzeV9wbHVnaW4oa3dhcmdzKSA6OlxuICBjb25zdCBqc3lfcHJlc2V0ID0gQFtdICdqc3kvbGVhbicsIEB7fSBub19zdGFnZV8zOiB0cnVlLCBtb2R1bGVzOiBmYWxzZVxuICBjb25zdCBwcmVzZXRzID0gW2pzeV9wcmVzZXRdLmNvbmNhdCBAIGt3YXJncy5wcmVzZXRzIHx8IFtdXG5cbiAga3dhcmdzID0gT2JqZWN0LmFzc2lnbiBAXG4gICAgQHt9IGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionLCBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogdHJ1ZVxuICAgIGt3YXJnc1xuICAgIEB7fSBwcmVzZXRzXG5cbiAgcmV0dXJuIHJwaV9iYWJlbChrd2FyZ3MpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIGV4dGVybmFscywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBleHRlcm5hbHMgOjogZXh0ZXJuYWxzID0gb3B0LmV4dGVybmFscyB8fCBbXVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IG9wdC5wbHVnaW5zIHx8IFtdXG4gIGlmIG51bGwgPT0gZm9ybWF0IDo6IGZvcm1hdCA9IG9wdC5mb3JtYXQgfHwgJ2lpZmUnXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuICBpZiBudWxsID09IG9wdC5zb3VyY2UgOjogb3B0LnNvdXJjZSA9IHBhdGhfcGFyc2UgQCBzb3VyY2VcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgZ2xvYmFsTW9kdWxlcyA6OlxuICAgIGNvbnN0IGxfZ2xvYmFsTW9kdWxlcyA9IGdsb2JhbE1vZHVsZXNcbiAgICBnbG9iYWxNb2R1bGVzID0gbW9kdWxlID0+IGxfZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgZXh0ZXJuYWxzID0gbmV3IFNldCBAIGV4dGVybmFsc1xuICBjb25zdCBpbnB1dCA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBpbnB1dDogc291cmNlLCBwbHVnaW5zLFxuICAgICAgICBleHRlcm5hbDogbW9kdWxlID0+XG4gICAgICAgICAgISEgZ2xvYmFsTW9kdWxlcyhtb2R1bGUpXG4gICAgICAgICAgfHwgZXh0ZXJuYWxzLmhhcyhtb2R1bGUpXG5cbiAgICBvcHQuaW5wdXRfb3B0aW9uc1xuXG4gIGlmIGFtZCA6OiBmb3JtYXQgPSAnYW1kJ1xuXG4gIGNvbnN0IG91dHB1dCA9IE9iamVjdC5hc3NpZ24gQCBcbiAgICBAe30gZm9ybWF0XG4gICAgICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgICAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgICAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICAgICAgZ2xvYmFsczogZ2xvYmFsTW9kdWxlc1xuXG4gICAgb3B0Lm91dHB1dF9vcHRpb25zXG5cbiAgaWYgYW1kIDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gKG9wdC5idWlsZENsb3N1cmUgfHwgYXNSb2xsdXBCdWlsZENsb3N1cmUpIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEJ1aWxkRXJyb3IoZXJyLCBqb2luKSA6OlxuICBjb25zdCB7bG9jLCBmcmFtZSwgY29kZUZyYW1lfSA9IGVyclxuICBpZiAhIEAgbG9jIHx8IGZyYW1lIHx8IGNvZGVGcmFtZSA6OiByZXR1cm5cblxuICBjb25zdCBjb2xvcnMgPSAvXFxbXFxkK20vLnRlc3QgQCAoZnJhbWV8fGNvZGVGcmFtZXx8JycpXG4gIGNvbnN0IGhsID0gdiA9PiBpbnNwZWN0IEAgdiwgQHt9IGNvbG9yc1xuXG4gIGNvbnN0IGxpbmVzID0gW11cbiAgbGV0IG1zZyA9IGVyci5tZXNzYWdlXG4gIGlmIGVyci5pZCA6OlxuICAgIC8vIHNpbXBsaWZ5IG91dHB1dCBieSBzcGxpdHRpbmcgZXJyLmlkIHRvIGRpc3RpbmN0IGxpbmVcbiAgICBtc2cgPSBtc2cucmVwbGFjZShgJHtlcnIuaWR9OiBgLCAnJylcblxuICBsaW5lcy5wdXNoIEAgYEJ1aWxkRXJyb3I6ICR7aGwobXNnKX1gXG5cbiAgaWYgbG9jIDo6IGxpbmVzLnB1c2ggQCBgICBpbiAke2hsKGxvYy5maWxlKX0gYXQgJHtobChsb2MubGluZSl9OiR7aGwobG9jLmNvbHVtbil9YFxuICBpZiBlcnIuaWQgOjogbGluZXMucHVzaCBAIGAgIGlkOiAke2hsKGVyci5pZCl9YFxuICBpZiBlcnIuY29kZSA6OiBsaW5lcy5wdXNoIEAgYCAgY29kZTogJHtobChlcnIuY29kZSl9YFxuXG4gIGlmIGZyYW1lIHx8IGNvZGVGcmFtZSA6OlxuICAgIGxpbmVzLnB1c2ggQCAnJywgZnJhbWUgfHwgY29kZUZyYW1lXG5cbiAgaWYgdHJ1ZSA9PT0gam9pbiA6OiByZXR1cm4gbGluZXMuam9pbignXFxuJylcbiAgZWxzZSBpZiBqb2luIDo6IHJldHVybiBsaW5lcy5qb2luKGpvaW4pXG4gIGVsc2UgcmV0dXJuIGxpbmVzXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKGJ1aWxkQ3R4KSA6OlxuICBjb25zdCB7aW5wdXQsIG91dHB1dCwgb3B0fSA9IGJ1aWxkQ3R4XG4gIGNvbnN0IGVycl9vdXRmaWxlID0gYCR7b3V0cHV0LmZpbGV9LmVycm9yYFxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBvcHQubm9fdGltaW5nID8gYnVpbGQgOiBidWlsZFdpdGhUaW1pbmdcblxuICBhc3luYyBmdW5jdGlvbiBidWlsZCgpIDo6XG4gICAgdHJ5IDo6XG4gICAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICAgIGF3YWl0IHdyaXRlRmlsZV9wKGVycl9vdXRmaWxlLCAnJylcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGF3YWl0IG9uQnVpbGRFcnJvcihlcnIpXG5cbiAgYXN5bmMgZnVuY3Rpb24gYnVpbGRXaXRoVGltaW5nKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgICAgYXdhaXQgd3JpdGVGaWxlX3AoZXJyX291dGZpbGUsICcnKVxuICAgIGNhdGNoIGVyciA6OlxuICAgICAgYXdhaXQgb25CdWlsZEVycm9yKGVycilcbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuICBhc3luYyBmdW5jdGlvbiBvbkJ1aWxkRXJyb3IoZXJyKSA6OlxuICAgIGNvbnN0IGxpbmVzID0gZm9ybWF0QnVpbGRFcnJvciBAIGVyciwgdHJ1ZVxuICAgIGlmIG9wdC5vbkJ1aWxkRXJyb3IgOjpcbiAgICAgIHJldHVybiBvcHQub25CdWlsZEVycm9yIEAgZXJyLCBsaW5lcywgYnVpbGRDdHhcblxuICAgIGNvbnN0IGVycl9tc2cgPSBsaW5lc1xuICAgICAgPyBsaW5lcysnXFxuJ1xuICAgICAgOiBpbnNwZWN0KGVyciwge2NvbG9yczogdHJ1ZX0pXG5cbiAgICBjb25zb2xlLmVycm9yIEAgJ1xcblxcbicsIGVycl9tc2csICdcXG4nXG4gICAgYXdhaXQgd3JpdGVGaWxlX3AgQCBlcnJfb3V0ZmlsZSwgZXJyX21zZywgXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChvbl9yZXN0YXJ0KSA6OlxuICBpZiBvbl9yZXN0YXJ0ICYmICdmdW5jdGlvbicgIT09IHR5cGVvZiBvbl9yZXN0YXJ0IDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBvbl9yZXN0YXJ0IHRvIGJlIGEgZnVuY3Rpb25gXG5cbiAgbGV0IHdhdGNoZXJzID0gW11cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIGJ1aWxkT25jZSwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgaWYgISB3YXRjaGVycyA6OiByZXR1cm5cbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgICAgICBpZiBvbl9yZXN0YXJ0IDo6IG9uX3Jlc3RhcnQocGF0aClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICAgIHJlYnVpbGQoKVxuXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIHJlYnVpbGQoKVxuICAgICAgICAgIDUwXG4gICAgICAgIC51bnJlZigpXG4gICAgICByZXR1cm4gc2VsZlxuXG5cbndhdGNoQW5kQnVpbGQuZm9yZXZlciA9IGZ1bmN0aW9uKGNvbW1hbmQ9YGJhYmVsLW5vZGUgcm9sbHVwLmNmZy5qc3kgLS13YXRjaC1pbXBsYCkgOjpcbiAgd2hpbGUgdHJ1ZSA6OlxuICAgIGV4ZWNTeW5jIEAgY29tbWFuZCwgQHt9IHN0ZGlvOiAnaW5oZXJpdCdcbiAgICBjb25zb2xlLmxvZyBAIGBcXG5cXG5SZXN0YXJ0aW5nIHJvbGx1cCB3YXRjaFxcblxcbmBcblxuIl0sIm5hbWVzIjpbIndyaXRlRmlsZV9wIiwicHJvbWlzaWZ5Iiwid3JpdGVGaWxlIiwianN5X3BsdWdpbiIsImt3YXJncyIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInByZXNldHMiLCJjb25jYXQiLCJPYmplY3QiLCJhc3NpZ24iLCJleGNsdWRlIiwiYmFiZWxyYyIsImhpZ2hsaWdodENvZGUiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwiZXh0ZXJuYWxzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsImNyZWF0ZSIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwibF9nbG9iYWxNb2R1bGVzIiwibW9kdWxlIiwiU2V0IiwiaW5wdXQiLCJoYXMiLCJpbnB1dF9vcHRpb25zIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsIm91dHB1dF9vcHRpb25zIiwiYnVpbGRDbG9zdXJlIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJmb3JtYXRCdWlsZEVycm9yIiwiZXJyIiwiam9pbiIsImxvYyIsImZyYW1lIiwiY29kZUZyYW1lIiwiY29sb3JzIiwidGVzdCIsImhsIiwidiIsImluc3BlY3QiLCJsaW5lcyIsIm1zZyIsIm1lc3NhZ2UiLCJpZCIsInJlcGxhY2UiLCJwdXNoIiwiZmlsZSIsImxpbmUiLCJjb2x1bW4iLCJjb2RlIiwiYnVpbGRDdHgiLCJlcnJfb3V0ZmlsZSIsIm5vX3RpbWluZyIsImJ1aWxkIiwiYnVpbGRXaXRoVGltaW5nIiwiY2FjaGUiLCJyb2xsdXAiLCJ3cml0ZSIsIm9uQnVpbGRFcnJvciIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwidGltZUVuZCIsImVycl9tc2ciLCJlcnJvciIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwib25fcmVzdGFydCIsIndhdGNoZXJzIiwic2VsZiIsInJlYnVpbGRPbiIsImJ1aWxkT25jZSIsInJlc3RhcnRPbiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJwYXRoIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzcyIsIl9kZWJvdW5jZSIsInVucmVmIiwiZm9yZXZlciIsImNvbW1hbmQiLCJzdGRpbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFRQSxNQUFNQSxjQUFjQyxlQUFVQyxZQUFWLENBQXBCOztBQUVBLEFBQU8sU0FBU0MsVUFBVCxDQUFvQkMsTUFBcEIsRUFBNEI7UUFDM0JDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7UUFDTUMsVUFBVSxDQUFDSCxVQUFELEVBQWFJLE1BQWIsQ0FBc0JMLE9BQU9JLE9BQVAsSUFBa0IsRUFBeEMsQ0FBaEI7O1dBRVNFLE9BQU9DLE1BQVAsQ0FDUCxFQUFJQyxTQUFTLGlCQUFiLEVBQWdDQyxTQUFTLEtBQXpDLEVBQWdEQyxl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
