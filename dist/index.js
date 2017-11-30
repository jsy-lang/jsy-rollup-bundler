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
  //const plugins = [].concat @ kwargs.plugins || []

  kwargs = Object.assign({ exclude: 'node_modules/**',
    babelrc: false, highlightCode: false }, kwargs, { presets, plugins });

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

function watchAndBuild() {
  let watchers = [];
  const self = { rebuildOn, buildOnce, restartOn };
  return self;

  function restartOn(watch_glob) {
    watchers.push(chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', path$$1 => {
      console.log(`Setup changed; shutting down watchers ("${path$$1}")`);
      const l_watchers = watchers;
      watchers = null;
      for (const each of l_watchers) {
        each.close();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuICAvL2NvbnN0IHBsdWdpbnMgPSBbXS5jb25jYXQgQCBrd2FyZ3MucGx1Z2lucyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgICAgICBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogZmFsc2VcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0cywgcGx1Z2luc1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5leHBvcnQgZnVuY3Rpb24gYnVuZGxlKHtzb3VyY2UsIG9wdCwgZ2xvYmFsTW9kdWxlcywgZXh0ZXJuYWxzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuY3JlYXRlIEAgb3B0IC8vIERvbid0IG1vZGlmeSB0aGUgdW5kZXJseWluZyBvYmplY3RcbiAgaWYgbnVsbCA9PSBnbG9iYWxNb2R1bGVzIDo6IGdsb2JhbE1vZHVsZXMgPSBvcHQuZ2xvYmFsTW9kdWxlcyB8fCB7fVxuICBpZiBudWxsID09IGV4dGVybmFscyA6OiBleHRlcm5hbHMgPSBvcHQuZXh0ZXJuYWxzIHx8IFtdXG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBmb3JtYXQgOjogZm9ybWF0ID0gb3B0LmZvcm1hdCB8fCAnaWlmZSdcbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGV4dGVybmFscyA9IG5ldyBTZXQgQCBleHRlcm5hbHNcbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXSB8fCBleHRlcm5hbHMuaGFzKG1vZHVsZSlcblxuICBpZiBhbWQgOjogZm9ybWF0ID0gJ2FtZCdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcblxuICAgIGNhdGNoIGVyciA6OlxuICAgICAgY29uc3Qge2NvZGUsIGxvYywgZnJhbWV9ID0gZXJyXG4gICAgICBjb25zdCBsaW5lcyA9IEBbXVxuICAgICAgICAnJ1xuICAgICAgICAnJ1xuICAgICAgICBgJHtlcnIubWVzc2FnZX0gKCR7Y29kZX0pYFxuICAgICAgICBgICBpbiBcIiR7bG9jLmZpbGV9XCIgYXQgJHtsb2MubGluZX06JHtsb2MuY29sdW1ufVwiYFxuICAgICAgICAnJ1xuICAgICAgICBmcmFtZVxuICAgICAgICAnJ1xuICAgICAgICAnJ1xuXG4gICAgICBjb25zb2xlLmVycm9yIEAgbGluZXMuam9pbignXFxuJylcblxuICAgIGZpbmFsbHkgOjpcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBCdWlsdCAke2xvZ19tc2d9YFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQoKSA6OlxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgYnVpbGRPbmNlLCByZXN0YXJ0T25cbiAgcmV0dXJuIHNlbGZcblxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBidWlsZE9uY2UoYnVpbGRPbmNlLCB3YXRjaF9nbG9iKSA6OlxuICAgIGlmIEFycmF5LmlzQXJyYXkoYnVpbGRPbmNlKSA6OlxuICAgICAgYnVpbGRPbmNlID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIGJ1aWxkT25jZVxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGJ1aWxkT25jZSA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBidWlsZE9uY2UgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIGlmIHdhdGNoX2dsb2IgOjogcmVzdGFydE9uIEAgd2F0Y2hfZ2xvYlxuXG4gICAgYnVpbGRPbmNlKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbihyZWJ1aWxkLCB3YXRjaF9nbG9iKSA6OlxuICAgIGxldCBpbnByb2dyZXNzID0gZmFsc2VcbiAgICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgICByZWJ1aWxkID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIHJlYnVpbGRcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gICAgcmVidWlsZCgpXG5cbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICAgIGZ1bmN0aW9uIF9kZWJvdW5jZShwYXRoKSA6OlxuICAgICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgICAgaWYgZmFsc2UgPT09IGlucHJvZ3Jlc3MgOjpcbiAgICAgICAgaW5wcm9ncmVzcyA9IHRydWVcbiAgICAgICAgc2V0VGltZW91dCBAXG4gICAgICAgICAgKCkgPT4gOjpcbiAgICAgICAgICAgIGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgICAgICAgICAgcmVidWlsZCgpXG4gICAgICAgICAgNTBcbiAgICAgICAgLnVucmVmKClcbiAgICAgIHJldHVybiBzZWxmXG5cbiJdLCJuYW1lcyI6WyJqc3lfcGx1Z2luIiwia3dhcmdzIiwianN5X3ByZXNldCIsIm5vX3N0YWdlXzMiLCJtb2R1bGVzIiwicHJlc2V0cyIsImNvbmNhdCIsIk9iamVjdCIsImFzc2lnbiIsImV4Y2x1ZGUiLCJoaWdobGlnaHRDb2RlIiwicGx1Z2lucyIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJleHRlcm5hbHMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsIlNldCIsImlucHV0IiwibW9kdWxlIiwiaGFzIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJjYWNoZSIsInJvbGx1cCIsInRpbWVFbmQiLCJ3cml0ZSIsImVyciIsImNvZGUiLCJsb2MiLCJmcmFtZSIsImxpbmVzIiwibWVzc2FnZSIsImZpbGUiLCJsaW5lIiwiY29sdW1uIiwiZXJyb3IiLCJqb2luIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwicHVzaCIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsInBhdGgiLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzIiwiX2RlYm91bmNlIiwidW5yZWYiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBS08sU0FBU0EsVUFBVCxDQUFvQkMsTUFBcEIsRUFBNEI7UUFDM0JDLGFBQWEsQ0FB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
