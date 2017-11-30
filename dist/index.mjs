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
      console.time(`Wrote ${log_msg}`);
      await bundle.write(output);
      console.timeEnd(`Wrote ${log_msg}`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbigpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHJldHVybiBycGlfYmFiZWwgQDpcbiAgICBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgIHByZXNldHM6IFsganN5X3ByZXNldCBdXG4gICAgcGx1Z2luczogW11cbiAgICBiYWJlbHJjOiBmYWxzZVxuICAgIGhpZ2hsaWdodENvZGU6IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuYXNzaWduIEAge30sIG9wdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiAhIGZvcm1hdCA6OlxuICAgIGZvcm1hdCA9IGFtZCA/ICdhbWQnIDogJ2lpZmUnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgY29uc29sZS50aW1lIEAgYFdyb3RlICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYFdyb3RlICR7bG9nX21zZ31gXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKHJlYnVpbGQpIDo6XG4gIGxldCBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gIGxldCB3YXRjaGVycyA9IFtdXG5cbiAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgcmVidWlsZCgpXG5cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIHJlc3RhcnRPbiwgcmVidWlsZDogX3JlYnVpbGRfZGVib3VuY2VcbiAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBfcmVidWlsZF9kZWJvdW5jZShwYXRoKSA6OlxuICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICBpZiBudWxsICE9PSBpbnByb2dyZXNzX2NoYW5nZXMgOjpcbiAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcy5wdXNoKHBhdGgpXG4gICAgICByZXR1cm4gc2VsZlxuXG4gICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gW3BhdGhdXG4gICAgc2V0VGltZW91dCBAXG4gICAgICAoKSA9PiA6OlxuICAgICAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gICAgICAgIHJlYnVpbGQoKVxuICAgICAgNTBcbiAgICAudW5yZWYoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfcmVidWlsZF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgIHJldHVybiBzZWxmXG5cbiJdLCJuYW1lcyI6WyJqc3lfcGx1Z2luIiwianN5X3ByZXNldCIsIm5vX3N0YWdlXzMiLCJtb2R1bGVzIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJPYmplY3QiLCJhc3NpZ24iLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsImlucHV0IiwibW9kdWxlIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJjYWNoZSIsInJvbGx1cCIsInRpbWVFbmQiLCJ3cml0ZSIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwicmVidWlsZCIsImlucHJvZ3Jlc3NfY2hhbmdlcyIsIndhdGNoZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInNlbGYiLCJyZWJ1aWxkT24iLCJyZXN0YXJ0T24iLCJfcmVidWlsZF9kZWJvdW5jZSIsInBhdGgiLCJwdXNoIiwidW5yZWYiLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFLTyxTQUFTQSxVQUFULEdBQXNCO1FBQ3JCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1NBQ09DLFVBQVk7YUFDUixpQkFEUTthQUVSLENBQUVILFVBQUYsQ0FGUTth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
