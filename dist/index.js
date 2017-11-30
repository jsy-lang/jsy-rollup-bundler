'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
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

exports.jsy_plugin = jsy_plugin;
exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGpzeV9wbHVnaW4oa3dhcmdzKSA6OlxuICBjb25zdCBqc3lfcHJlc2V0ID0gQFtdICdqc3kvbGVhbicsIEB7fSBub19zdGFnZV8zOiB0cnVlLCBtb2R1bGVzOiBmYWxzZVxuICBjb25zdCBwcmVzZXRzID0gW2pzeV9wcmVzZXRdLmNvbmNhdCBAIGt3YXJncy5wcmVzZXRzIHx8IFtdXG5cbiAga3dhcmdzID0gT2JqZWN0LmFzc2lnbiBAXG4gICAgQHt9IGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgICAgIGJhYmVscmM6IGZhbHNlLCBoaWdobGlnaHRDb2RlOiBmYWxzZVxuICAgIGt3YXJnc1xuICAgIEB7fSBwcmVzZXRzXG5cbiAgcmV0dXJuIHJwaV9iYWJlbChrd2FyZ3MpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIGV4dGVybmFscywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBleHRlcm5hbHMgOjogZXh0ZXJuYWxzID0gb3B0LmV4dGVybmFscyB8fCBbXVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IG9wdC5wbHVnaW5zIHx8IFtdXG4gIGlmIG51bGwgPT0gZm9ybWF0IDo6IGZvcm1hdCA9IG9wdC5mb3JtYXQgfHwgJ2lpZmUnXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuICBpZiBudWxsID09IG9wdC5zb3VyY2UgOjogb3B0LnNvdXJjZSA9IHBhdGhfcGFyc2UgQCBzb3VyY2VcblxuICBleHRlcm5hbHMgPSBuZXcgU2V0IEAgZXh0ZXJuYWxzXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV0gfHwgZXh0ZXJuYWxzLmhhcyhtb2R1bGUpXG5cbiAgaWYgYW1kIDo6IGZvcm1hdCA9ICdhbWQnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kIDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gYXNSb2xsdXBCdWlsZENsb3N1cmUgQDpcbiAgICBpbnB1dCwgb3V0cHV0LCBvcHRcblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKHtpbnB1dCwgb3V0cHV0LCBvcHR9KSA6OlxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiAoKSA6OlxuICAgIGNvbnN0IGxvZ19tc2cgPSBgcm9sbHVwIGJ1bmRsZSBcIiR7b3B0LnNvdXJjZS5uYW1lfVwiIChAJHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX0pYFxuICAgIGNvbnNvbGUubG9nIEAgYEJ1aWxkaW5nICR7bG9nX21zZ31gXG4gICAgY29uc29sZS50aW1lIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG4gICAgdHJ5IDo6XG4gICAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgICAgY29uc29sZS50aW1lIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGNvbnN0IHtjb2RlLCBsb2MsIGZyYW1lfSA9IGVyclxuICAgICAgY29uc3QgbGluZXMgPSBAW11cbiAgICAgICAgJydcbiAgICAgICAgJydcbiAgICAgICAgYCR7ZXJyLm1lc3NhZ2V9ICgke2NvZGV9KWBcbiAgICAgICAgYCAgaW4gXCIke2xvYy5maWxlfVwiIGF0ICR7bG9jLmxpbmV9OiR7bG9jLmNvbHVtbn1cImBcbiAgICAgICAgJydcbiAgICAgICAgZnJhbWVcbiAgICAgICAgJydcbiAgICAgICAgJydcblxuICAgICAgY29uc29sZS5lcnJvciBAIGxpbmVzLmpvaW4oJ1xcbicpXG5cbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKG9uX3Jlc3RhcnQpIDo6XG4gIGlmIG9uX3Jlc3RhcnQgJiYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIG9uX3Jlc3RhcnQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIG9uX3Jlc3RhcnQgdG8gYmUgYSBmdW5jdGlvbmBcblxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgYnVpbGRPbmNlLCByZXN0YXJ0T25cbiAgcmV0dXJuIHNlbGZcblxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBpZiAhIHdhdGNoZXJzIDo6IHJldHVyblxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgICAgIGlmIG9uX3Jlc3RhcnQgOjogb25fcmVzdGFydChwYXRoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBidWlsZE9uY2UoYnVpbGRPbmNlLCB3YXRjaF9nbG9iKSA6OlxuICAgIGlmIEFycmF5LmlzQXJyYXkoYnVpbGRPbmNlKSA6OlxuICAgICAgYnVpbGRPbmNlID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIGJ1aWxkT25jZVxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGJ1aWxkT25jZSA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBidWlsZE9uY2UgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIGlmIHdhdGNoX2dsb2IgOjogcmVzdGFydE9uIEAgd2F0Y2hfZ2xvYlxuXG4gICAgYnVpbGRPbmNlKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbihyZWJ1aWxkLCB3YXRjaF9nbG9iKSA6OlxuICAgIGxldCBpbnByb2dyZXNzID0gZmFsc2VcbiAgICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgICByZWJ1aWxkID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIHJlYnVpbGRcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gICAgcmVidWlsZCgpXG5cbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICAgIGZ1bmN0aW9uIF9kZWJvdW5jZShwYXRoKSA6OlxuICAgICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgICAgaWYgZmFsc2UgPT09IGlucHJvZ3Jlc3MgOjpcbiAgICAgICAgaW5wcm9ncmVzcyA9IHRydWVcbiAgICAgICAgc2V0VGltZW91dCBAXG4gICAgICAgICAgKCkgPT4gOjpcbiAgICAgICAgICAgIGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgICAgICAgICAgcmVidWlsZCgpXG4gICAgICAgICAgNTBcbiAgICAgICAgLnVucmVmKClcbiAgICAgIHJldHVybiBzZWxmXG5cbiJdLCJuYW1lcyI6WyJqc3lfcGx1Z2luIiwia3dhcmdzIiwianN5X3ByZXNldCIsIm5vX3N0YWdlXzMiLCJtb2R1bGVzIiwicHJlc2V0cyIsImNvbmNhdCIsIk9iamVjdCIsImFzc2lnbiIsImV4Y2x1ZGUiLCJoaWdobGlnaHRDb2RlIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsImV4dGVybmFscyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsIlNldCIsImlucHV0IiwibW9kdWxlIiwiaGFzIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJjYWNoZSIsInJvbGx1cCIsInRpbWVFbmQiLCJ3cml0ZSIsImVyciIsImNvZGUiLCJsb2MiLCJmcmFtZSIsImxpbmVzIiwibWVzc2FnZSIsImZpbGUiLCJsaW5lIiwiY29sdW1uIiwiZXJyb3IiLCJqb2luIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJvbl9yZXN0YXJ0Iiwid2F0Y2hlcnMiLCJzZWxmIiwicmVidWlsZE9uIiwiYnVpbGRPbmNlIiwicmVzdGFydE9uIiwid2F0Y2hfZ2xvYiIsInB1c2giLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJwYXRoIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzcyIsIl9kZWJvdW5jZSIsInVucmVmIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQU1PLFNBQVNBLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1FBQ01DLFVBQVUsQ0FBQ0gsVUFBRCxFQUFhSSxNQUFiLENBQXNCTCxPQUFPSSxPQUFQLElBQWtCLEVBQXhDLENBQWhCOztXQUVTRSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYjthQUNhLEtBRGIsRUFDb0JDLGVBQWUsS0FEbkMsRUFETyxFQUdQVCxNQUhPLEVBSVAsRUFBSUksT0FBSixFQUpPLENBQVQ7O1NBTU9NLFVBQVVWLE1BQVYsQ0FBUDs7O0FBR0YsQUFBTyxTQUFTVyxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxTQUE3QixFQUF3Q0MsT0FBeEMsRUFBaURDLE1BQWpELEVBQXlEQyxHQUF6RCxFQUFoQixFQUErRTtNQUNqRixhQUFhLE9BQU9OLE1BQXZCLEVBQWdDO1VBQU8sSUFBSU8sU0FBSixDQUFpQixrQ0FBakIsQ0FBTjs7TUFDOUIsUUFBUU4sR0FBWCxFQUFpQjtVQUFPLElBQUlNLFNBQUosQ0FBaUIsdUNBQWpCLENBQU47O1FBQ1piLE9BQU9jLE1BQVAsQ0FBZ0JQLEdBQWhCO0dBQU47TUFDRyxRQUFRQyxhQUFYLEVBQTJCO29CQUFpQkQsSUFBSUMsYUFBSixJQUFxQixFQUFyQzs7TUFDekIsUUFBUUMsU0FBWCxFQUF1QjtnQkFBYUYsSUFBSUUsU0FBSixJQUFpQixFQUE3Qjs7TUFDckIsUUFBUUMsT0FBWCxFQUFxQjtjQUFXSCxJQUFJRyxPQUFKLElBQWUsRUFBekI7O01BQ25CLFFBQVFDLE1BQVgsRUFBb0I7YUFBVUos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
