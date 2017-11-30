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
      const { loc, frame } = err;
      if (loc && frame) {
        const lines = ['', '', `${err.message} (${err.code})`, `  in "${loc.file}" at ${loc.line}:${loc.column}"`, '', frame, '', ''];
        console.error(lines.join('\n'));
      } else {
        console.error(err);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7ZXhlY1N5bmN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgICAgICBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogZmFsc2VcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0c1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBleHRlcm5hbHMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5jcmVhdGUgQCBvcHQgLy8gRG9uJ3QgbW9kaWZ5IHRoZSB1bmRlcmx5aW5nIG9iamVjdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gZXh0ZXJuYWxzIDo6IGV4dGVybmFscyA9IG9wdC5leHRlcm5hbHMgfHwgW11cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IGZvcm1hdCA6OiBmb3JtYXQgPSBvcHQuZm9ybWF0IHx8ICdpaWZlJ1xuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgZXh0ZXJuYWxzID0gbmV3IFNldCBAIGV4dGVybmFsc1xuICBjb25zdCBpbnB1dCA9IEB7fSBpbnB1dDogc291cmNlLCBwbHVnaW5zLFxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdIHx8IGV4dGVybmFscy5oYXMobW9kdWxlKVxuXG4gIGlmIGFtZCA6OiBmb3JtYXQgPSAnYW1kJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFsczogbW9kdWxlID0+IGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmIGFtZCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuXG4gICAgY2F0Y2ggZXJyIDo6XG4gICAgICBjb25zdCB7bG9jLCBmcmFtZX0gPSBlcnJcbiAgICAgIGlmIGxvYyAmJiBmcmFtZSA6OlxuICAgICAgICBjb25zdCBsaW5lcyA9IEBbXVxuICAgICAgICAgICcnXG4gICAgICAgICAgJydcbiAgICAgICAgICBgJHtlcnIubWVzc2FnZX0gKCR7ZXJyLmNvZGV9KWBcbiAgICAgICAgICBgICBpbiBcIiR7bG9jLmZpbGV9XCIgYXQgJHtsb2MubGluZX06JHtsb2MuY29sdW1ufVwiYFxuICAgICAgICAgICcnXG4gICAgICAgICAgZnJhbWVcbiAgICAgICAgICAnJ1xuICAgICAgICAgICcnXG4gICAgICAgIGNvbnNvbGUuZXJyb3IgQCBsaW5lcy5qb2luKCdcXG4nKVxuICAgICAgZWxzZSA6OlxuICAgICAgICBjb25zb2xlLmVycm9yIEAgZXJyXG5cbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKG9uX3Jlc3RhcnQpIDo6XG4gIGlmIG9uX3Jlc3RhcnQgJiYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIG9uX3Jlc3RhcnQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIG9uX3Jlc3RhcnQgdG8gYmUgYSBmdW5jdGlvbmBcblxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgYnVpbGRPbmNlLCByZXN0YXJ0T25cbiAgcmV0dXJuIHNlbGZcblxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBpZiAhIHdhdGNoZXJzIDo6IHJldHVyblxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgICAgIGlmIG9uX3Jlc3RhcnQgOjogb25fcmVzdGFydChwYXRoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBidWlsZE9uY2UoYnVpbGRPbmNlLCB3YXRjaF9nbG9iKSA6OlxuICAgIGlmIEFycmF5LmlzQXJyYXkoYnVpbGRPbmNlKSA6OlxuICAgICAgYnVpbGRPbmNlID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIGJ1aWxkT25jZVxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGJ1aWxkT25jZSA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBidWlsZE9uY2UgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIGlmIHdhdGNoX2dsb2IgOjogcmVzdGFydE9uIEAgd2F0Y2hfZ2xvYlxuXG4gICAgYnVpbGRPbmNlKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbihyZWJ1aWxkLCB3YXRjaF9nbG9iKSA6OlxuICAgIGxldCBpbnByb2dyZXNzID0gZmFsc2VcbiAgICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgICByZWJ1aWxkID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIHJlYnVpbGRcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gICAgcmVidWlsZCgpXG5cbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICAgIGZ1bmN0aW9uIF9kZWJvdW5jZShwYXRoKSA6OlxuICAgICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgICAgaWYgZmFsc2UgPT09IGlucHJvZ3Jlc3MgOjpcbiAgICAgICAgaW5wcm9ncmVzcyA9IHRydWVcbiAgICAgICAgc2V0VGltZW91dCBAXG4gICAgICAgICAgKCkgPT4gOjpcbiAgICAgICAgICAgIGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgICAgICAgICAgcmVidWlsZCgpXG4gICAgICAgICAgNTBcbiAgICAgICAgLnVucmVmKClcbiAgICAgIHJldHVybiBzZWxmXG5cblxud2F0Y2hBbmRCdWlsZC5mb3JldmVyID0gZnVuY3Rpb24oY29tbWFuZD1gYmFiZWwtbm9kZSByb2xsdXAuY2ZnLmpzeSAtLXdhdGNoLWltcGxgKSA6OlxuICB3aGlsZSB0cnVlIDo6XG4gICAgZXhlY1N5bmMgQCBjb21tYW5kLCBAe30gc3RkaW86ICdpbmhlcml0J1xuICAgIGNvbnNvbGUubG9nIEAgYFxcblxcblJlc3RhcnRpbmcgcm9sbHVwIHdhdGNoXFxuXFxuYFxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImt3YXJncyIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInByZXNldHMiLCJjb25jYXQiLCJPYmplY3QiLCJhc3NpZ24iLCJleGNsdWRlIiwiaGlnaGxpZ2h0Q29kZSIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJleHRlcm5hbHMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiY3JlYXRlIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJTZXQiLCJpbnB1dCIsIm1vZHVsZSIsImhhcyIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwiY2FjaGUiLCJyb2xsdXAiLCJ0aW1lRW5kIiwid3JpdGUiLCJlcnIiLCJsb2MiLCJmcmFtZSIsImxpbmVzIiwibWVzc2FnZSIsImNvZGUiLCJmaWxlIiwibGluZSIsImNvbHVtbiIsImVycm9yIiwiam9pbiIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwib25fcmVzdGFydCIsIndhdGNoZXJzIiwic2VsZiIsInJlYnVpbGRPbiIsImJ1aWxkT25jZSIsInJlc3RhcnRPbiIsIndhdGNoX2dsb2IiLCJwdXNoIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwicGF0aCIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwicmVidWlsZCIsImlucHJvZ3Jlc3MiLCJfZGVib3VuY2UiLCJ1bnJlZiIsImZvcmV2ZXIiLCJjb21tYW5kIiwic3RkaW8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQU9PLFNBQVNBLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1FBQ01DLFVBQVUsQ0FBQ0gsVUFBRCxFQUFhSSxNQUFiLENBQXNCTCxPQUFPSSxPQUFQLElBQWtCLEVBQXhDLENBQWhCOztXQUVTRSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYjthQUNhLEtBRGIsRUFDb0JDLGVBQWUsS0FEbkMsRUFETyxFQUdQVCxNQUhPLEVBSVAsRUFBSUksT0FBSixFQUpPLENBQVQ7O1NBTU9NLFVBQVVWLE1BQVYsQ0FBUDs7O0FBR0YsQUFBTyxTQUFTVyxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxTQUE3QixFQUF3Q0MsT0FBeEMsRUFBaURDLE1BQWpELEVBQXlE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
