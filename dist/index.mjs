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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbigpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHJldHVybiBycGlfYmFiZWwgQDpcbiAgICBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgIHByZXNldHM6IFsganN5X3ByZXNldCBdXG4gICAgcGx1Z2luczogW11cbiAgICBiYWJlbHJjOiBmYWxzZVxuICAgIGhpZ2hsaWdodENvZGU6IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuYXNzaWduIEAge30sIG9wdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiAhIGZvcm1hdCA6OlxuICAgIGZvcm1hdCA9IGFtZCA/ICdhbWQnIDogJ2lpZmUnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQocmVidWlsZCkgOjpcbiAgbGV0IGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgbGV0IHdhdGNoZXJzID0gW11cblxuICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICByZWJ1aWxkKClcblxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgcmVzdGFydE9uLCByZWJ1aWxkOiBfcmVidWlsZF9kZWJvdW5jZVxuICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIF9yZWJ1aWxkX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgIGlmIG51bGwgIT09IGlucHJvZ3Jlc3NfY2hhbmdlcyA6OlxuICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzLnB1c2gocGF0aClcbiAgICAgIHJldHVybiBzZWxmXG5cbiAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBbcGF0aF1cbiAgICBzZXRUaW1lb3V0IEBcbiAgICAgICgpID0+IDo6XG4gICAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgICAgICAgcmVidWlsZCgpXG4gICAgICA1MFxuICAgIC51bnJlZigpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9yZWJ1aWxkX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsIk9iamVjdCIsImFzc2lnbiIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiaW5wdXQiLCJtb2R1bGUiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsImNhY2hlIiwicm9sbHVwIiwidGltZUVuZCIsIndyaXRlIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzc19jaGFuZ2VzIiwid2F0Y2hlcnMiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwic2VsZiIsInJlYnVpbGRPbiIsInJlc3RhcnRPbiIsIl9yZWJ1aWxkX2RlYm91bmNlIiwicGF0aCIsInB1c2giLCJ1bnJlZiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIl0sIm1hcHBpbmdzIjoiOzs7OztBQUtPLFNBQVNBLFVBQVQsR0FBc0I7UUFDckJDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7U0FDT0MsVUFBWTthQUNSLGlCQURRO2FBRVIsQ0FBRUgsVUFBRixDQUZRO2FBR1IsRUFIUTthQUlSLEtBSlE7bUJBS0YsS0FMRSxFQUFaLENBQVA7OztBQU9GLEFBQU8sU0FBU0ksTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVND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
