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
      return bundle;
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
      return bundle;
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

    const rebuildWatcher = chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', _debounce);

    watchers.push(rebuildWatcher);

    // invoke initial build
    _debounce();
    return self;

    function _debounce(path$$1) {
      // debounce rapid updates
      if (false === inprogress) {
        inprogress = true;
        setTimeout(() => {
          inprogress = false;
          _do_rebuild();
        }, 50).unref();
      }
      return self;
    }

    async function _do_rebuild() {
      let lst = await rebuild();
      if (null == lst) {
        return;
      }

      if (!Array.isArray(lst)) {
        lst = [lst];
      }
      for (const bundle of lst) {
        const paths = bundle.modules.map(e => e.id).filter(id => id && !id.includes('/node_modules/') && '\u0000' !== id[0]);

        rebuildWatcher.add(paths);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aW5zcGVjdCwgcHJvbWlzaWZ5fSBmcm9tICd1dGlsJ1xuaW1wb3J0IHt3cml0ZUZpbGV9IGZyb20gJ2ZzJ1xuaW1wb3J0IHtwYXJzZSBhcyBwYXRoX3BhcnNlfSBmcm9tICdwYXRoJ1xuaW1wb3J0IHtleGVjU3luY30gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmNvbnN0IHdyaXRlRmlsZV9wID0gcHJvbWlzaWZ5KHdyaXRlRmlsZSlcblxuZXhwb3J0IGZ1bmN0aW9uIGpzeV9wbHVnaW4oa3dhcmdzKSA6OlxuICBjb25zdCBqc3lfcHJlc2V0ID0gQFtdICdqc3kvbGVhbicsIEB7fSBub19zdGFnZV8zOiB0cnVlLCBtb2R1bGVzOiBmYWxzZVxuICBjb25zdCBwcmVzZXRzID0gW2pzeV9wcmVzZXRdLmNvbmNhdCBAIGt3YXJncy5wcmVzZXRzIHx8IFtdXG5cbiAga3dhcmdzID0gT2JqZWN0LmFzc2lnbiBAXG4gICAgQHt9IGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionLCBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogdHJ1ZVxuICAgIGt3YXJnc1xuICAgIEB7fSBwcmVzZXRzXG5cbiAgcmV0dXJuIHJwaV9iYWJlbChrd2FyZ3MpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIGV4dGVybmFscywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBleHRlcm5hbHMgOjogZXh0ZXJuYWxzID0gb3B0LmV4dGVybmFscyB8fCBbXVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IG9wdC5wbHVnaW5zIHx8IFtdXG4gIGlmIG51bGwgPT0gZm9ybWF0IDo6IGZvcm1hdCA9IG9wdC5mb3JtYXQgfHwgJ2lpZmUnXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuICBpZiBudWxsID09IG9wdC5zb3VyY2UgOjogb3B0LnNvdXJjZSA9IHBhdGhfcGFyc2UgQCBzb3VyY2VcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgZ2xvYmFsTW9kdWxlcyA6OlxuICAgIGNvbnN0IGxfZ2xvYmFsTW9kdWxlcyA9IGdsb2JhbE1vZHVsZXNcbiAgICBnbG9iYWxNb2R1bGVzID0gbW9kdWxlID0+IGxfZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgZXh0ZXJuYWxzID0gbmV3IFNldCBAIGV4dGVybmFsc1xuICBjb25zdCBpbnB1dCA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBpbnB1dDogc291cmNlLCBwbHVnaW5zLFxuICAgICAgICBleHRlcm5hbDogbW9kdWxlID0+XG4gICAgICAgICAgISEgZ2xvYmFsTW9kdWxlcyhtb2R1bGUpXG4gICAgICAgICAgfHwgZXh0ZXJuYWxzLmhhcyhtb2R1bGUpXG5cbiAgICBvcHQuaW5wdXRfb3B0aW9uc1xuXG4gIGlmIGFtZCA6OiBmb3JtYXQgPSAnYW1kJ1xuXG4gIGNvbnN0IG91dHB1dCA9IE9iamVjdC5hc3NpZ24gQCBcbiAgICBAe30gZm9ybWF0XG4gICAgICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgICAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgICAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICAgICAgZ2xvYmFsczogZ2xvYmFsTW9kdWxlc1xuXG4gICAgb3B0Lm91dHB1dF9vcHRpb25zXG5cbiAgaWYgYW1kIDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gKG9wdC5idWlsZENsb3N1cmUgfHwgYXNSb2xsdXBCdWlsZENsb3N1cmUpIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEJ1aWxkRXJyb3IoZXJyLCBqb2luKSA6OlxuICBjb25zdCB7bG9jLCBmcmFtZSwgY29kZUZyYW1lfSA9IGVyclxuICBpZiAhIEAgbG9jIHx8IGZyYW1lIHx8IGNvZGVGcmFtZSA6OiByZXR1cm5cblxuICBjb25zdCBjb2xvcnMgPSAvXFxbXFxkK20vLnRlc3QgQCAoZnJhbWV8fGNvZGVGcmFtZXx8JycpXG4gIGNvbnN0IGhsID0gdiA9PiBpbnNwZWN0IEAgdiwgQHt9IGNvbG9yc1xuXG4gIGNvbnN0IGxpbmVzID0gW11cbiAgbGV0IG1zZyA9IGVyci5tZXNzYWdlXG4gIGlmIGVyci5pZCA6OlxuICAgIC8vIHNpbXBsaWZ5IG91dHB1dCBieSBzcGxpdHRpbmcgZXJyLmlkIHRvIGRpc3RpbmN0IGxpbmVcbiAgICBtc2cgPSBtc2cucmVwbGFjZShgJHtlcnIuaWR9OiBgLCAnJylcblxuICBsaW5lcy5wdXNoIEAgYEJ1aWxkRXJyb3I6ICR7aGwobXNnKX1gXG5cbiAgaWYgbG9jIDo6IGxpbmVzLnB1c2ggQCBgICBpbiAke2hsKGxvYy5maWxlKX0gYXQgJHtobChsb2MubGluZSl9OiR7aGwobG9jLmNvbHVtbil9YFxuICBpZiBlcnIuaWQgOjogbGluZXMucHVzaCBAIGAgIGlkOiAke2hsKGVyci5pZCl9YFxuICBpZiBlcnIuY29kZSA6OiBsaW5lcy5wdXNoIEAgYCAgY29kZTogJHtobChlcnIuY29kZSl9YFxuXG4gIGlmIGZyYW1lIHx8IGNvZGVGcmFtZSA6OlxuICAgIGxpbmVzLnB1c2ggQCAnJywgZnJhbWUgfHwgY29kZUZyYW1lXG5cbiAgaWYgdHJ1ZSA9PT0gam9pbiA6OiByZXR1cm4gbGluZXMuam9pbignXFxuJylcbiAgZWxzZSBpZiBqb2luIDo6IHJldHVybiBsaW5lcy5qb2luKGpvaW4pXG4gIGVsc2UgcmV0dXJuIGxpbmVzXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKGJ1aWxkQ3R4KSA6OlxuICBjb25zdCB7aW5wdXQsIG91dHB1dCwgb3B0fSA9IGJ1aWxkQ3R4XG4gIGNvbnN0IGVycl9vdXRmaWxlID0gYCR7b3V0cHV0LmZpbGV9LmVycm9yYFxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBvcHQubm9fdGltaW5nID8gYnVpbGQgOiBidWlsZFdpdGhUaW1pbmdcblxuICBhc3luYyBmdW5jdGlvbiBidWlsZCgpIDo6XG4gICAgdHJ5IDo6XG4gICAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICAgIGF3YWl0IHdyaXRlRmlsZV9wKGVycl9vdXRmaWxlLCAnJylcbiAgICAgIHJldHVybiBidW5kbGVcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGF3YWl0IG9uQnVpbGRFcnJvcihlcnIpXG5cbiAgYXN5bmMgZnVuY3Rpb24gYnVpbGRXaXRoVGltaW5nKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgICAgYXdhaXQgd3JpdGVGaWxlX3AoZXJyX291dGZpbGUsICcnKVxuICAgICAgcmV0dXJuIGJ1bmRsZVxuICAgIGNhdGNoIGVyciA6OlxuICAgICAgYXdhaXQgb25CdWlsZEVycm9yKGVycilcbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuICBhc3luYyBmdW5jdGlvbiBvbkJ1aWxkRXJyb3IoZXJyKSA6OlxuICAgIGNvbnN0IGxpbmVzID0gZm9ybWF0QnVpbGRFcnJvciBAIGVyciwgdHJ1ZVxuICAgIGlmIG9wdC5vbkJ1aWxkRXJyb3IgOjpcbiAgICAgIHJldHVybiBvcHQub25CdWlsZEVycm9yIEAgZXJyLCBsaW5lcywgYnVpbGRDdHhcblxuICAgIGNvbnN0IGVycl9tc2cgPSBsaW5lc1xuICAgICAgPyBsaW5lcysnXFxuJ1xuICAgICAgOiBpbnNwZWN0KGVyciwge2NvbG9yczogdHJ1ZX0pXG5cbiAgICBjb25zb2xlLmVycm9yIEAgJ1xcblxcbicsIGVycl9tc2csICdcXG4nXG4gICAgYXdhaXQgd3JpdGVGaWxlX3AgQCBlcnJfb3V0ZmlsZSwgZXJyX21zZywgXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChvbl9yZXN0YXJ0KSA6OlxuICBpZiBvbl9yZXN0YXJ0ICYmICdmdW5jdGlvbicgIT09IHR5cGVvZiBvbl9yZXN0YXJ0IDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBvbl9yZXN0YXJ0IHRvIGJlIGEgZnVuY3Rpb25gXG5cbiAgbGV0IHdhdGNoZXJzID0gW11cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIGJ1aWxkT25jZSwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgaWYgISB3YXRjaGVycyA6OiByZXR1cm5cbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgICAgICBpZiBvbl9yZXN0YXJ0IDo6IG9uX3Jlc3RhcnQocGF0aClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBjb25zdCByZWJ1aWxkV2F0Y2hlciA9IGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHdhdGNoZXJzLnB1c2ggQCByZWJ1aWxkV2F0Y2hlclxuXG4gICAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgICBfZGVib3VuY2UoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIF9kb19yZWJ1aWxkKClcbiAgICAgICAgICA1MFxuICAgICAgICAudW5yZWYoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuICAgIGFzeW5jIGZ1bmN0aW9uIF9kb19yZWJ1aWxkKCkgOjpcbiAgICAgIGxldCBsc3QgPSBhd2FpdCByZWJ1aWxkKClcbiAgICAgIGlmIG51bGwgPT0gbHN0IDo6IHJldHVyblxuXG4gICAgICBpZiAhIEFycmF5LmlzQXJyYXkobHN0KSA6OiBsc3QgPSBbbHN0XVxuICAgICAgZm9yIGNvbnN0IGJ1bmRsZSBvZiBsc3QgOjpcbiAgICAgICAgY29uc3QgcGF0aHMgPSBidW5kbGUubW9kdWxlcy5tYXAoZSA9PiBlLmlkKVxuICAgICAgICAgIC5maWx0ZXIgQCBpZCA9PiBpZFxuICAgICAgICAgICAgJiYgISBpZC5pbmNsdWRlcygnL25vZGVfbW9kdWxlcy8nKVxuICAgICAgICAgICAgJiYgKCdcXHUwMDAwJyAhPT0gaWRbMF0pXG5cbiAgICAgICAgcmVidWlsZFdhdGNoZXIuYWRkKHBhdGhzKVxuICAgICAgICAgICAgICAgIFxuXG53YXRjaEFuZEJ1aWxkLmZvcmV2ZXIgPSBmdW5jdGlvbihjb21tYW5kPWBiYWJlbC1ub2RlIHJvbGx1cC5jZmcuanN5IC0td2F0Y2gtaW1wbGApIDo6XG4gIHdoaWxlIHRydWUgOjpcbiAgICBleGVjU3luYyBAIGNvbW1hbmQsIEB7fSBzdGRpbzogJ2luaGVyaXQnXG4gICAgY29uc29sZS5sb2cgQCBgXFxuXFxuUmVzdGFydGluZyByb2xsdXAgd2F0Y2hcXG5cXG5gXG5cbiJdLCJuYW1lcyI6WyJ3cml0ZUZpbGVfcCIsInByb21pc2lmeSIsIndyaXRlRmlsZSIsImpzeV9wbHVnaW4iLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJwcmVzZXRzIiwiY29uY2F0IiwiT2JqZWN0IiwiYXNzaWduIiwiZXhjbHVkZSIsImJhYmVscmMiLCJoaWdobGlnaHRDb2RlIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsImV4dGVybmFscyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsImxfZ2xvYmFsTW9kdWxlcyIsIm1vZHVsZSIsIlNldCIsImlucHV0IiwiaGFzIiwiaW5wdXRfb3B0aW9ucyIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJvdXRwdXRfb3B0aW9ucyIsImJ1aWxkQ2xvc3VyZSIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwiZm9ybWF0QnVpbGRFcnJvciIsImVyciIsImpvaW4iLCJsb2MiLCJmcmFtZSIsImNvZGVGcmFtZSIsImNvbG9ycyIsInRlc3QiLCJobCIsInYiLCJpbnNwZWN0IiwibGluZXMiLCJtc2ciLCJtZXNzYWdlIiwiaWQiLCJyZXBsYWNlIiwicHVzaCIsImZpbGUiLCJsaW5lIiwiY29sdW1uIiwiY29kZSIsImJ1aWxkQ3R4IiwiZXJyX291dGZpbGUiLCJub190aW1pbmciLCJidWlsZCIsImJ1aWxkV2l0aFRpbWluZyIsImNhY2hlIiwicm9sbHVwIiwid3JpdGUiLCJvbkJ1aWxkRXJyb3IiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsInRpbWVFbmQiLCJlcnJfbXNnIiwiZXJyb3IiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsIm9uX3Jlc3RhcnQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwicGF0aCIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwicmVidWlsZCIsImlucHJvZ3Jlc3MiLCJyZWJ1aWxkV2F0Y2hlciIsIl9kZWJvdW5jZSIsInVucmVmIiwiX2RvX3JlYnVpbGQiLCJsc3QiLCJwYXRocyIsImUiLCJmaWx0ZXIiLCJpbmNsdWRlcyIsImFkZCIsImZvcmV2ZXIiLCJjb21tYW5kIiwic3RkaW8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBUUEsTUFBTUEsY0FBY0MsZUFBVUMsWUFBVixDQUFwQjs7QUFFQSxBQUFPLFNBQVNDLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1FBQ01DLFVBQVUsQ0FBQ0gsVUFBRCxFQUFhSSxNQUFiLENBQXNCTCxPQUFPSSxPQUFQLElBQWtCLEVBQXhDLENBQWhCOztXQUVTRSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYixFQUFnQ0MsU0FBUyxLQUF6QyxFQUFnREMsZUFBZSxJQUEvRCxFQURPLEVBRVBWLE1BRk8sRUFHUCxFQUFJSSxPQUFKLEVBSE8sQ0FBVDs7U0FLT08sVUFBVVgsTUFBVixDQUFQOzs7QUFHRixBQUFPLFNBQVNZLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJDLFNBQTdCLEVBQXdDQyxPQUF4QyxFQUFpREMsTUFBakQsRUFBeURDLEdBQXpELEVBQWhCLEVBQStFO01BQ2pGLGFBQWEsT0FBT04sTUFBdkIsRUFBZ0M7VUFBTyxJQUFJTyxTQUFKLENBQWlCLGtDQUFqQixDQUFOOztNQUM5QixRQUFRTixHQUFYLEVBQWlCO1VBQU8sSUFBSU0sU0FBSixDQUFpQix1Q0FBakIsQ0FBTjs7UUFD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
