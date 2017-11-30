import { parse } from 'path';
import { rollup as rollup$1 } from 'rollup';
import chokidar from 'chokidar';
import rpi_babel from 'rollup-plugin-babel';

function jsy_plugin(presets, plugins, kwargs) {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  presets = [jsy_preset].concat(presets || []);
  plugins = [].concat(plugins || []);

  kwargs = Object.assign({ exclude: 'node_modules/**',
    babelrc: false, highlightCode: false }, kwargs, { presets, plugins });

  return rpi_babel(kwargs);
}

function bundle({ source, opt, globalModules, plugins, format, amd }) {
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
  if (null == plugins) {
    plugins = opt.plugins || [];
  }
  if (null == opt.suffix) {
    opt.suffix = opt.production ? '.min' : '';
  }
  if (null == opt.outdir) {
    opt.outdir = './dist/public';
  }
  if (null == opt.source) {
    opt.source = parse(source);
  }

  const input = { input: source, plugins,
    external: module => !!globalModules[module] };

  if (!format) {
    format = amd ? 'amd' : 'iife';
  }

  const output = {
    format,
    name: opt.source.name,
    file: `${opt.outdir}/${opt.source.name}${opt.suffix}.js`,
    sourcemap: opt.sourcemap,
    globals: module => globalModules[module] };

  if (amd && 'amd' === format) {
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
      bundle = await rollup$1(input);
      console.timeEnd(`Compiled ${log_msg}`);
      await bundle.write(output);
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

export { jsy_plugin, bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbihwcmVzZXRzLCBwbHVnaW5zLCBrd2FyZ3MpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHByZXNldHMgPSBbanN5X3ByZXNldF0uY29uY2F0IEAgcHJlc2V0cyB8fCBbXVxuICBwbHVnaW5zID0gW10uY29uY2F0IEAgcGx1Z2lucyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgICAgICBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogZmFsc2VcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0cywgcGx1Z2luc1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5leHBvcnQgZnVuY3Rpb24gYnVuZGxlKHtzb3VyY2UsIG9wdCwgZ2xvYmFsTW9kdWxlcywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmICEgZm9ybWF0IDo6XG4gICAgZm9ybWF0ID0gYW1kID8gJ2FtZCcgOiAnaWlmZSdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgIGZpbmFsbHkgOjpcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBCdWlsdCAke2xvZ19tc2d9YFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQoKSA6OlxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgYnVpbGRPbmNlLCByZXN0YXJ0T25cbiAgcmV0dXJuIHNlbGZcblxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBidWlsZE9uY2UoYnVpbGRPbmNlLCB3YXRjaF9nbG9iKSA6OlxuICAgIGlmIEFycmF5LmlzQXJyYXkoYnVpbGRPbmNlKSA6OlxuICAgICAgYnVpbGRPbmNlID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIGJ1aWxkT25jZVxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGJ1aWxkT25jZSA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBidWlsZE9uY2UgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIGlmIHdhdGNoX2dsb2IgOjogcmVzdGFydE9uIEAgd2F0Y2hfZ2xvYlxuXG4gICAgYnVpbGRPbmNlKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbihyZWJ1aWxkLCB3YXRjaF9nbG9iKSA6OlxuICAgIGxldCBpbnByb2dyZXNzID0gZmFsc2VcbiAgICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgICByZWJ1aWxkID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIHJlYnVpbGRcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAgIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gICAgcmVidWlsZCgpXG5cbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICAgIGZ1bmN0aW9uIF9kZWJvdW5jZShwYXRoKSA6OlxuICAgICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgICAgaWYgZmFsc2UgPT09IGlucHJvZ3Jlc3MgOjpcbiAgICAgICAgaW5wcm9ncmVzcyA9IHRydWVcbiAgICAgICAgc2V0VGltZW91dCBAXG4gICAgICAgICAgKCkgPT4gOjpcbiAgICAgICAgICAgIGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgICAgICAgICAgcmVidWlsZCgpXG4gICAgICAgICAgNTBcbiAgICAgICAgLnVucmVmKClcbiAgICAgIHJldHVybiBzZWxmXG5cbiJdLCJuYW1lcyI6WyJqc3lfcGx1Z2luIiwicHJlc2V0cyIsInBsdWdpbnMiLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJjb25jYXQiLCJPYmplY3QiLCJhc3NpZ24iLCJleGNsdWRlIiwiaGlnaGxpZ2h0Q29kZSIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsImlucHV0IiwibW9kdWxlIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJjYWNoZSIsInJvbGx1cCIsInRpbWVFbmQiLCJ3cml0ZSIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwid2F0Y2hlcnMiLCJzZWxmIiwicmVidWlsZE9uIiwiYnVpbGRPbmNlIiwicmVzdGFydE9uIiwid2F0Y2hfZ2xvYiIsInB1c2giLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJwYXRoIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzcyIsIl9kZWJvdW5jZSIsInVucmVmIl0sIm1hcHBpbmdzIjoiOzs7OztBQUtPLFNBQVNBLFVBQVQsQ0FBb0JDLE9BQXBCLEVBQTZCQyxPQUE3QixFQUFzQ0MsTUFBdEMsRUFBOEM7UUFDN0NDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7WUFDVSxDQUFDRixVQUFELEVBQWFHLE1BQWIsQ0FBc0JOLFdBQVcsRUFBakMsQ0FBVjtZQUNVLEdBQUdNLE1BQUgsQ0FBWUwsV0FBVyxFQUF2QixDQUFWOztXQUVTTSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYjthQUNhLEtBRGIsRUFDb0JDLGVBQWUsS0FEbkMsRUFETyxFQUdQUixNQUhPLEVBSVAsRUFBSUYsT0FBSixFQUFhQyxPQUFiLEVBSk8sQ0FBVDs7U0FNT1UsVUFBVVQsTUFBVixDQUFQOzs7QUFFRixBQUFPLFNBQVNVLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJkLE9BQTdCLEVBQXNDZSxNQUF0QyxFQUE4Q0MsR0FBOUMsRUFBaEIsRUFBb0U7TUFDdEUsYUFBYSxPQUFPSixNQUF2QixFQUFnQztVQUFPLElBQUlLLFNBQUosQ0FBaUIsa0NBQWpCLENBQU47O01BQzlCLFFBQVFKLEdBQVgsRUFBaUI7VUFBTyxJQUFJSSxTQUFKLENBQWlCLHVDQUFqQixDQUFOOztRQUNaWCxPQUFP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
