import { parse } from 'path';
import { rollup as rollup$1 } from 'rollup';
import chokidar from 'chokidar';
import rpi_babel from 'rollup-plugin-babel';

function jsy_plugin() {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  return rpi_babel({
    exclude: 'node_modules/**',
    presets: [jsy_preset],
    plugins: [],
    babelrc: false,
    highlightCode: false });
}

function bundle({ source, opt, globalModules, plugins, format, amd }) {
  if ('string' !== typeof source) {
    throw new TypeError(`Expected string source parameter`);
  }
  if (null == opt) {
    throw new TypeError(`Expected valid "opt" object parameter`);
  }
  opt = Object.assign({}, opt);
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
      bundle = await rollup$1(input);
      await bundle.write(output);
    } finally {
      console.timeEnd(`Built ${log_msg}`);
    }
  };
}

function buildAll(buildList) {
  return Promise.all(buildList.map(builder => builder()));
}

function watchAndBuild(rebuild) {
  let inprogress_changes = null;
  let watchers = [];

  if (Array.isArray(rebuild)) {
    rebuild = buildAll.bind(null, rebuild);
  }

  if ('function' !== typeof rebuild) {
    throw new TypeError(`Expected rebuild to be a function or array`);
  }

  // invoke initial build
  rebuild();

  const self = { rebuildOn, restartOn, rebuild: _rebuild_debounce };
  return self;

  function _rebuild_debounce(path$$1) {
    // debounce rapid updates
    if (null !== inprogress_changes) {
      inprogress_changes.push(path$$1);
      return self;
    }

    inprogress_changes = [path$$1];
    setTimeout(() => {
      inprogress_changes = null;
      rebuild();
    }, 50).unref();
    return self;
  }

  function rebuildOn(watch_glob) {
    watchers.push(chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', _rebuild_debounce));

    return self;
  }

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
}

export { jsy_plugin, bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbigpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHJldHVybiBycGlfYmFiZWwgQDpcbiAgICBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgIHByZXNldHM6IFsganN5X3ByZXNldCBdXG4gICAgcGx1Z2luczogW11cbiAgICBiYWJlbHJjOiBmYWxzZVxuICAgIGhpZ2hsaWdodENvZGU6IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuYXNzaWduIEAge30sIG9wdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiAhIGZvcm1hdCA6OlxuICAgIGZvcm1hdCA9IGFtZCA/ICdhbWQnIDogJ2lpZmUnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgIGZpbmFsbHkgOjpcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBCdWlsdCAke2xvZ19tc2d9YFxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChyZWJ1aWxkKSA6OlxuICBsZXQgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuXG4gIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICByZWJ1aWxkID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIHJlYnVpbGRcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gIHJlYnVpbGQoKVxuXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCByZXN0YXJ0T24sIHJlYnVpbGQ6IF9yZWJ1aWxkX2RlYm91bmNlXG4gIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gX3JlYnVpbGRfZGVib3VuY2UocGF0aCkgOjpcbiAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgaWYgbnVsbCAhPT0gaW5wcm9ncmVzc19jaGFuZ2VzIDo6XG4gICAgICBpbnByb2dyZXNzX2NoYW5nZXMucHVzaChwYXRoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IFtwYXRoXVxuICAgIHNldFRpbWVvdXQgQFxuICAgICAgKCkgPT4gOjpcbiAgICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICAgICAgICByZWJ1aWxkKClcbiAgICAgIDUwXG4gICAgLnVucmVmKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX3JlYnVpbGRfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiT2JqZWN0IiwiYXNzaWduIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJpbnB1dCIsIm1vZHVsZSIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwiY2FjaGUiLCJyb2xsdXAiLCJ3cml0ZSIsInRpbWVFbmQiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzX2NoYW5nZXMiLCJ3YXRjaGVycyIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJzZWxmIiwicmVidWlsZE9uIiwicmVzdGFydE9uIiwiX3JlYnVpbGRfZGVib3VuY2UiLCJwYXRoIiwicHVzaCIsInVucmVmIiwid2F0Y2hfZ2xvYiIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7O0FBS08sU0FBU0EsVUFBVCxHQUFzQjtRQUNyQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtTQUNPQyxVQUFZO2FBQ1IsaUJBRFE7YUFFUixDQUFFSCxVQUFGLENBRlE7YUFHUixFQUhRO2FBSVIsS0FKUTttQkFLRixLQUxFLEVBQVosQ0FBUDs7O0FBT0YsQUFBTyxTQUFTSSxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxPQUE3QixFQUFzQ0MsTUFBdEMsRUFBOENDLEdBQTlDLEVBQWhCLEVBQW9FO01BQ3RFLGFBQWEsT0FBT0wsTUFBdkIs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
