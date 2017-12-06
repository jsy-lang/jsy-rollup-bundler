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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aW5zcGVjdCwgcHJvbWlzaWZ5fSBmcm9tICd1dGlsJ1xuaW1wb3J0IHt3cml0ZUZpbGV9IGZyb20gJ2ZzJ1xuaW1wb3J0IHtwYXJzZSBhcyBwYXRoX3BhcnNlfSBmcm9tICdwYXRoJ1xuaW1wb3J0IHtleGVjU3luY30gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmNvbnN0IHdyaXRlRmlsZV9wID0gcHJvbWlzaWZ5KHdyaXRlRmlsZSlcblxuZXhwb3J0IGZ1bmN0aW9uIGpzeV9wbHVnaW4oa3dhcmdzKSA6OlxuICBjb25zdCBqc3lfcHJlc2V0ID0gQFtdICdqc3kvbGVhbicsIEB7fSBub19zdGFnZV8zOiB0cnVlLCBtb2R1bGVzOiBmYWxzZVxuICBjb25zdCBwcmVzZXRzID0gW2pzeV9wcmVzZXRdLmNvbmNhdCBAIGt3YXJncy5wcmVzZXRzIHx8IFtdXG5cbiAga3dhcmdzID0gT2JqZWN0LmFzc2lnbiBAXG4gICAgQHt9IGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionLCBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogdHJ1ZVxuICAgIGt3YXJnc1xuICAgIEB7fSBwcmVzZXRzXG5cbiAgcmV0dXJuIHJwaV9iYWJlbChrd2FyZ3MpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIGV4dGVybmFscywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBleHRlcm5hbHMgOjogZXh0ZXJuYWxzID0gb3B0LmV4dGVybmFscyB8fCBbXVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IG9wdC5wbHVnaW5zIHx8IFtdXG4gIGlmIG51bGwgPT0gZm9ybWF0IDo6IGZvcm1hdCA9IG9wdC5mb3JtYXQgfHwgJ2lpZmUnXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuICBpZiBudWxsID09IG9wdC5zb3VyY2UgOjogb3B0LnNvdXJjZSA9IHBhdGhfcGFyc2UgQCBzb3VyY2VcblxuICBleHRlcm5hbHMgPSBuZXcgU2V0IEAgZXh0ZXJuYWxzXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV0gfHwgZXh0ZXJuYWxzLmhhcyhtb2R1bGUpXG5cbiAgaWYgYW1kIDo6IGZvcm1hdCA9ICdhbWQnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kIDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gKG9wdC5idWlsZENsb3N1cmUgfHwgYXNSb2xsdXBCdWlsZENsb3N1cmUpIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEJ1aWxkRXJyb3IoZXJyLCBqb2luKSA6OlxuICBjb25zdCB7bG9jLCBmcmFtZSwgY29kZUZyYW1lfSA9IGVyclxuICBpZiAhIEAgbG9jIHx8IGZyYW1lIHx8IGNvZGVGcmFtZSA6OiByZXR1cm5cblxuICBjb25zdCBjb2xvcnMgPSAvXFxbXFxkK20vLnRlc3QgQCAoZnJhbWV8fGNvZGVGcmFtZXx8JycpXG4gIGNvbnN0IGhsID0gdiA9PiBpbnNwZWN0IEAgdiwgQHt9IGNvbG9yc1xuXG4gIGNvbnN0IGxpbmVzID0gW11cbiAgbGV0IG1zZyA9IGVyci5tZXNzYWdlXG4gIGlmIGVyci5pZCA6OlxuICAgIC8vIHNpbXBsaWZ5IG91dHB1dCBieSBzcGxpdHRpbmcgZXJyLmlkIHRvIGRpc3RpbmN0IGxpbmVcbiAgICBtc2cgPSBtc2cucmVwbGFjZShgJHtlcnIuaWR9OiBgLCAnJylcblxuICBsaW5lcy5wdXNoIEAgYEJ1aWxkRXJyb3I6ICR7aGwobXNnKX1gXG5cbiAgaWYgbG9jIDo6IGxpbmVzLnB1c2ggQCBgICBpbiAke2hsKGxvYy5maWxlKX0gYXQgJHtobChsb2MubGluZSl9OiR7aGwobG9jLmNvbHVtbil9YFxuICBpZiBlcnIuaWQgOjogbGluZXMucHVzaCBAIGAgIGlkOiAke2hsKGVyci5pZCl9YFxuICBpZiBlcnIuY29kZSA6OiBsaW5lcy5wdXNoIEAgYCAgY29kZTogJHtobChlcnIuY29kZSl9YFxuXG4gIGlmIGZyYW1lIHx8IGNvZGVGcmFtZSA6OlxuICAgIGxpbmVzLnB1c2ggQCAnJywgZnJhbWUgfHwgY29kZUZyYW1lXG5cbiAgaWYgdHJ1ZSA9PT0gam9pbiA6OiByZXR1cm4gbGluZXMuam9pbignXFxuJylcbiAgZWxzZSBpZiBqb2luIDo6IHJldHVybiBsaW5lcy5qb2luKGpvaW4pXG4gIGVsc2UgcmV0dXJuIGxpbmVzXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKGJ1aWxkQ3R4KSA6OlxuICBjb25zdCB7aW5wdXQsIG91dHB1dCwgb3B0fSA9IGJ1aWxkQ3R4XG4gIGNvbnN0IGVycl9vdXRmaWxlID0gYCR7b3V0cHV0LmZpbGV9LmVycm9yYFxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBvcHQubm9fdGltaW5nID8gYnVpbGQgOiBidWlsZFdpdGhUaW1pbmdcblxuICBhc3luYyBmdW5jdGlvbiBidWlsZCgpIDo6XG4gICAgdHJ5IDo6XG4gICAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICAgIGF3YWl0IHdyaXRlRmlsZV9wKGVycl9vdXRmaWxlLCAnJylcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGF3YWl0IG9uQnVpbGRFcnJvcihlcnIpXG5cbiAgYXN5bmMgZnVuY3Rpb24gYnVpbGRXaXRoVGltaW5nKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgICAgYXdhaXQgd3JpdGVGaWxlX3AoZXJyX291dGZpbGUsICcnKVxuICAgIGNhdGNoIGVyciA6OlxuICAgICAgYXdhaXQgb25CdWlsZEVycm9yKGVycilcbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuICBhc3luYyBmdW5jdGlvbiBvbkJ1aWxkRXJyb3IoZXJyKSA6OlxuICAgIGNvbnN0IGxpbmVzID0gZm9ybWF0QnVpbGRFcnJvciBAIGVyciwgdHJ1ZVxuICAgIGlmIG9wdC5vbkJ1aWxkRXJyb3IgOjpcbiAgICAgIHJldHVybiBvcHQub25CdWlsZEVycm9yIEAgZXJyLCBsaW5lcywgYnVpbGRDdHhcblxuICAgIGNvbnN0IGVycl9tc2cgPSBsaW5lc1xuICAgICAgPyBsaW5lcysnXFxuJ1xuICAgICAgOiBpbnNwZWN0KGVyciwge2NvbG9yczogdHJ1ZX0pXG5cbiAgICBjb25zb2xlLmVycm9yIEAgJ1xcblxcbicsIGVycl9tc2csICdcXG4nXG4gICAgYXdhaXQgd3JpdGVGaWxlX3AgQCBlcnJfb3V0ZmlsZSwgZXJyX21zZywgXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChvbl9yZXN0YXJ0KSA6OlxuICBpZiBvbl9yZXN0YXJ0ICYmICdmdW5jdGlvbicgIT09IHR5cGVvZiBvbl9yZXN0YXJ0IDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBvbl9yZXN0YXJ0IHRvIGJlIGEgZnVuY3Rpb25gXG5cbiAgbGV0IHdhdGNoZXJzID0gW11cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIGJ1aWxkT25jZSwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgaWYgISB3YXRjaGVycyA6OiByZXR1cm5cbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgICAgICBpZiBvbl9yZXN0YXJ0IDo6IG9uX3Jlc3RhcnQocGF0aClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICAgIHJlYnVpbGQoKVxuXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIHJlYnVpbGQoKVxuICAgICAgICAgIDUwXG4gICAgICAgIC51bnJlZigpXG4gICAgICByZXR1cm4gc2VsZlxuXG5cbndhdGNoQW5kQnVpbGQuZm9yZXZlciA9IGZ1bmN0aW9uKGNvbW1hbmQ9YGJhYmVsLW5vZGUgcm9sbHVwLmNmZy5qc3kgLS13YXRjaC1pbXBsYCkgOjpcbiAgd2hpbGUgdHJ1ZSA6OlxuICAgIGV4ZWNTeW5jIEAgY29tbWFuZCwgQHt9IHN0ZGlvOiAnaW5oZXJpdCdcbiAgICBjb25zb2xlLmxvZyBAIGBcXG5cXG5SZXN0YXJ0aW5nIHJvbGx1cCB3YXRjaFxcblxcbmBcblxuIl0sIm5hbWVzIjpbIndyaXRlRmlsZV9wIiwicHJvbWlzaWZ5Iiwid3JpdGVGaWxlIiwianN5X3BsdWdpbiIsImt3YXJncyIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInByZXNldHMiLCJjb25jYXQiLCJPYmplY3QiLCJhc3NpZ24iLCJleGNsdWRlIiwiYmFiZWxyYyIsImhpZ2hsaWdodENvZGUiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwiZXh0ZXJuYWxzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsImNyZWF0ZSIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiU2V0IiwiaW5wdXQiLCJtb2R1bGUiLCJoYXMiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYnVpbGRDbG9zdXJlIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJmb3JtYXRCdWlsZEVycm9yIiwiZXJyIiwiam9pbiIsImxvYyIsImZyYW1lIiwiY29kZUZyYW1lIiwiY29sb3JzIiwidGVzdCIsImhsIiwidiIsImluc3BlY3QiLCJsaW5lcyIsIm1zZyIsIm1lc3NhZ2UiLCJpZCIsInJlcGxhY2UiLCJwdXNoIiwiZmlsZSIsImxpbmUiLCJjb2x1bW4iLCJjb2RlIiwiYnVpbGRDdHgiLCJlcnJfb3V0ZmlsZSIsIm5vX3RpbWluZyIsImJ1aWxkIiwiYnVpbGRXaXRoVGltaW5nIiwiY2FjaGUiLCJyb2xsdXAiLCJ3cml0ZSIsIm9uQnVpbGRFcnJvciIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwidGltZUVuZCIsImVycl9tc2ciLCJlcnJvciIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwib25fcmVzdGFydCIsIndhdGNoZXJzIiwic2VsZiIsInJlYnVpbGRPbiIsImJ1aWxkT25jZSIsInJlc3RhcnRPbiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJwYXRoIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzcyIsIl9kZWJvdW5jZSIsInVucmVmIiwiZm9yZXZlciIsImNvbW1hbmQiLCJzdGRpbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFRQSxNQUFNQSxjQUFjQyxlQUFVQyxZQUFWLENBQXBCOztBQUVBLEFBQU8sU0FBU0MsVUFBVCxDQUFvQkMsTUFBcEIsRUFBNEI7UUFDM0JDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7UUFDTUMsVUFBVSxDQUFDSCxVQUFELEVBQWFJLE1BQWIsQ0FBc0JMLE9BQU9JLE9BQVAsSUFBa0IsRUFBeEMsQ0FBaEI7O1dBRVNFLE9BQU9DLE1BQVAsQ0FDUCxFQUFJQyxTQUFTLGlCQUFiLEVBQWdDQyxTQUFTLEtBQXpDLEVBQWdEQyxlQUFlLElBQS9ELEVBRE8sRUFFUFYsTUFGTyxFQUdQLEVBQUlJLE9BQUosRUFITyxDQUFUOztTQUtPTyxVQUFVWCxNQUFWLENBQVA7OztBQUdGLEFBQU8sU0FBU1ksTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVNDLEdBQVQsRUFBY0MsYUFBZCxFQUE2QkMsU0FBN0IsRUFBd0NDLE9BQXhDLEVBQWlEQyxNQUFqRCxFQUF5REMsR0FBekQsRUFBaEIsRUFBK0U7TUFDakYsYUFBYSxPQUFPTixNQUF2QixFQUFnQztVQUFPLElBQUlPLFNBQUosQ0FBaUIsa0NBQWpCLENBQU47O01BQzlCLFFBQVFOLEdBQVgsRUFBaUI7VUFBTyxJQUFJTSxTQUFKLENBQWlC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
