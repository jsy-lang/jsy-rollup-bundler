'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var rollup = require('rollup');
var chokidar = _interopDefault(require('chokidar'));
var rpi_babel = _interopDefault(require('rollup-plugin-babel'));

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
    opt.source = path.parse(source);
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
      bundle = await rollup.rollup(input);
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

exports.jsy_plugin = jsy_plugin;
exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKCkgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgcmV0dXJuIHJwaV9iYWJlbCBAOlxuICAgIGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgcHJlc2V0czogWyBqc3lfcHJlc2V0IF1cbiAgICBwbHVnaW5zOiBbXVxuICAgIGJhYmVscmM6IGZhbHNlXG4gICAgaGlnaGxpZ2h0Q29kZTogZmFsc2VcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5hc3NpZ24gQCB7fSwgb3B0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmICEgZm9ybWF0IDo6XG4gICAgZm9ybWF0ID0gYW1kID8gJ2FtZCcgOiAnaWlmZSdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKHJlYnVpbGQpIDo6XG4gIGxldCBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gIGxldCB3YXRjaGVycyA9IFtdXG5cbiAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgcmVidWlsZCgpXG5cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIHJlc3RhcnRPbiwgcmVidWlsZDogX3JlYnVpbGRfZGVib3VuY2VcbiAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBfcmVidWlsZF9kZWJvdW5jZShwYXRoKSA6OlxuICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICBpZiBudWxsICE9PSBpbnByb2dyZXNzX2NoYW5nZXMgOjpcbiAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcy5wdXNoKHBhdGgpXG4gICAgICByZXR1cm4gc2VsZlxuXG4gICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gW3BhdGhdXG4gICAgc2V0VGltZW91dCBAXG4gICAgICAoKSA9PiA6OlxuICAgICAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gICAgICAgIHJlYnVpbGQoKVxuICAgICAgNTBcbiAgICAudW5yZWYoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfcmVidWlsZF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgIHJldHVybiBzZWxmXG5cbiJdLCJuYW1lcyI6WyJqc3lfcGx1Z2luIiwianN5X3ByZXNldCIsIm5vX3N0YWdlXzMiLCJtb2R1bGVzIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJPYmplY3QiLCJhc3NpZ24iLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsImlucHV0IiwibW9kdWxlIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJjYWNoZSIsInJvbGx1cCIsIndyaXRlIiwidGltZUVuZCIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwicmVidWlsZCIsImlucHJvZ3Jlc3NfY2hhbmdlcyIsIndhdGNoZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInNlbGYiLCJyZWJ1aWxkT24iLCJyZXN0YXJ0T24iLCJfcmVidWlsZF9kZWJvdW5jZSIsInBhdGgiLCJwdXNoIiwidW5yZWYiLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFLTyxTQUFTQSxVQUFULEdBQXNCO1FBQ3JCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1NBQ09DLFVBQVk7YUFDUixpQkFEUTthQUVSLENBQUVILFVBQUYsQ0FGUTthQUdSLEVBSFE7YUFJUixLQUpRO21CQUtGLEtBTEUsRUFBWixDQUFQOzs7QUFPRixBQUFPLFNBQVNJLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJDLE9BQTdCLEVBQXNDQyxNQUF0QyxFQUE4Q0MsR0FBOUMsRUFBaEIsRUFBb0U7TUFDdEUsYUFBYSxPQUFPTCxN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
