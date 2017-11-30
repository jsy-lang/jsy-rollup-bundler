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
  if (null == on_restart) {
    on_restart = () => {
      console.log('Restarting');
      child_process.fork();
      process.exit(0);
    };
  }

  if ('function' !== typeof on_restart) {
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

      on_restart(path$$1);
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

exports.jsy_plugin = jsy_plugin;
exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2VzcydcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGpzeV9wbHVnaW4oa3dhcmdzKSA6OlxuICBjb25zdCBqc3lfcHJlc2V0ID0gQFtdICdqc3kvbGVhbicsIEB7fSBub19zdGFnZV8zOiB0cnVlLCBtb2R1bGVzOiBmYWxzZVxuICBjb25zdCBwcmVzZXRzID0gW2pzeV9wcmVzZXRdLmNvbmNhdCBAIGt3YXJncy5wcmVzZXRzIHx8IFtdXG5cbiAga3dhcmdzID0gT2JqZWN0LmFzc2lnbiBAXG4gICAgQHt9IGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgICAgIGJhYmVscmM6IGZhbHNlLCBoaWdobGlnaHRDb2RlOiBmYWxzZVxuICAgIGt3YXJnc1xuICAgIEB7fSBwcmVzZXRzXG5cbiAgcmV0dXJuIHJwaV9iYWJlbChrd2FyZ3MpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIGV4dGVybmFscywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBleHRlcm5hbHMgOjogZXh0ZXJuYWxzID0gb3B0LmV4dGVybmFscyB8fCBbXVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IG9wdC5wbHVnaW5zIHx8IFtdXG4gIGlmIG51bGwgPT0gZm9ybWF0IDo6IGZvcm1hdCA9IG9wdC5mb3JtYXQgfHwgJ2lpZmUnXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuICBpZiBudWxsID09IG9wdC5zb3VyY2UgOjogb3B0LnNvdXJjZSA9IHBhdGhfcGFyc2UgQCBzb3VyY2VcblxuICBleHRlcm5hbHMgPSBuZXcgU2V0IEAgZXh0ZXJuYWxzXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV0gfHwgZXh0ZXJuYWxzLmhhcyhtb2R1bGUpXG5cbiAgaWYgYW1kIDo6IGZvcm1hdCA9ICdhbWQnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kIDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gYXNSb2xsdXBCdWlsZENsb3N1cmUgQDpcbiAgICBpbnB1dCwgb3V0cHV0LCBvcHRcblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKHtpbnB1dCwgb3V0cHV0LCBvcHR9KSA6OlxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiAoKSA6OlxuICAgIGNvbnN0IGxvZ19tc2cgPSBgcm9sbHVwIGJ1bmRsZSBcIiR7b3B0LnNvdXJjZS5uYW1lfVwiIChAJHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX0pYFxuICAgIGNvbnNvbGUubG9nIEAgYEJ1aWxkaW5nICR7bG9nX21zZ31gXG4gICAgY29uc29sZS50aW1lIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG4gICAgdHJ5IDo6XG4gICAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgICAgY29uc29sZS50aW1lIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGNvbnN0IHtjb2RlLCBsb2MsIGZyYW1lfSA9IGVyclxuICAgICAgY29uc3QgbGluZXMgPSBAW11cbiAgICAgICAgJydcbiAgICAgICAgJydcbiAgICAgICAgYCR7ZXJyLm1lc3NhZ2V9ICgke2NvZGV9KWBcbiAgICAgICAgYCAgaW4gXCIke2xvYy5maWxlfVwiIGF0ICR7bG9jLmxpbmV9OiR7bG9jLmNvbHVtbn1cImBcbiAgICAgICAgJydcbiAgICAgICAgZnJhbWVcbiAgICAgICAgJydcbiAgICAgICAgJydcblxuICAgICAgY29uc29sZS5lcnJvciBAIGxpbmVzLmpvaW4oJ1xcbicpXG5cbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKG9uX3Jlc3RhcnQpIDo6XG4gIGlmIG51bGwgPT0gb25fcmVzdGFydCA6OlxuICAgIG9uX3Jlc3RhcnQgPSAoKSA9PiA6OlxuICAgICAgY29uc29sZS5sb2cgQCAnUmVzdGFydGluZydcbiAgICAgIGZvcmsoKVxuICAgICAgcHJvY2Vzcy5leGl0KDApXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIG9uX3Jlc3RhcnQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIG9uX3Jlc3RhcnQgdG8gYmUgYSBmdW5jdGlvbmBcblxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgYnVpbGRPbmNlLCByZXN0YXJ0T25cbiAgcmV0dXJuIHNlbGZcblxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBpZiAhIHdhdGNoZXJzIDo6IHJldHVyblxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgICAgIG9uX3Jlc3RhcnQocGF0aClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICAgIHJlYnVpbGQoKVxuXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIHJlYnVpbGQoKVxuICAgICAgICAgIDUwXG4gICAgICAgIC51bnJlZigpXG4gICAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImt3YXJncyIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInByZXNldHMiLCJjb25jYXQiLCJPYmplY3QiLCJhc3NpZ24iLCJleGNsdWRlIiwiaGlnaGxpZ2h0Q29kZSIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJleHRlcm5hbHMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiY3JlYXRlIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJTZXQiLCJpbnB1dCIsIm1vZHVsZSIsImhhcyIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwiY2FjaGUiLCJyb2xsdXAiLCJ0aW1lRW5kIiwid3JpdGUiLCJlcnIiLCJjb2RlIiwibG9jIiwiZnJhbWUiLCJsaW5lcyIsIm1lc3NhZ2UiLCJmaWxlIiwibGluZSIsImNvbHVtbiIsImVycm9yIiwiam9pbiIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwib25fcmVzdGFydCIsImV4aXQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwicHVzaCIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsInBhdGgiLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzIiwiX2RlYm91bmNlIiwidW5yZWYiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQU9PLFNBQVNBLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1FBQ01DLFVBQVUsQ0FBQ0gsVUFBRCxFQUFhSSxNQUFiLENBQXNCTCxPQUFPSSxPQUFQLElBQWtCLEVBQXhDLENBQWhCOztXQUVTRSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYjthQUNhLEtBRGIsRUFDb0JDLGVBQWUsS0FEbkMsRUFETyxFQUdQVCxNQUhPLEVBSVAsRUFBSUksT0FBSixFQUpPLENBQVQ7O1NBTU9NLFVBQVVWLE1BQVYsQ0FBUDs7O0FBR0YsQUFBTyxTQUFTVyxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxTQUE3QixFQUF3Q0MsT0FBeEMsRUFBaURDLE1BQWpELEVBQXlEQyxHQUF6RCxFQUFoQixFQUErRTtNQUNqRixhQUFhLE9BQU9OLE1BQXZCLEVBQWdDO1VBQU8sSUFBSU8sU0FBSixDQUFpQixrQ0FBakIsQ0FBTjs7TUFDOUIsUUFBUU4sR0FBWCxFQUFpQjtVQUFPLElBQUlNLFNBQUosQ0FBaUIsdUNBQWpCLENBQU47O1FBQ1piLE9BQU9jLE1BQVAsQ0FBZ0JQLEdBQWhCO0dBQU47TUFDRyxRQUFRQyxhQUFYLEVBQTJCO29CQUFpQkQsSUFBSUMsYUFBSixJQUFxQixF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
