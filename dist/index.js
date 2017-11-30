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
      console.time(`Compiled ${log_msg}`);
      bundle = await rollup.rollup(input);
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

exports.jsy_plugin = jsy_plugin;
exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKCkgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgcmV0dXJuIHJwaV9iYWJlbCBAOlxuICAgIGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgcHJlc2V0czogWyBqc3lfcHJlc2V0IF1cbiAgICBwbHVnaW5zOiBbXVxuICAgIGJhYmVscmM6IGZhbHNlXG4gICAgaGlnaGxpZ2h0Q29kZTogZmFsc2VcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5hc3NpZ24gQCB7fSwgb3B0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmICEgZm9ybWF0IDo6XG4gICAgZm9ybWF0ID0gYW1kID8gJ2FtZCcgOiAnaWlmZSdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuICAgIGZpbmFsbHkgOjpcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBCdWlsdCAke2xvZ19tc2d9YFxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChyZWJ1aWxkKSA6OlxuICBsZXQgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuXG4gIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICByZWJ1aWxkID0gYnVpbGRBbGwuYmluZCBAIG51bGwsIHJlYnVpbGRcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gIHJlYnVpbGQoKVxuXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCByZXN0YXJ0T24sIHJlYnVpbGQ6IF9yZWJ1aWxkX2RlYm91bmNlXG4gIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gX3JlYnVpbGRfZGVib3VuY2UocGF0aCkgOjpcbiAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgaWYgbnVsbCAhPT0gaW5wcm9ncmVzc19jaGFuZ2VzIDo6XG4gICAgICBpbnByb2dyZXNzX2NoYW5nZXMucHVzaChwYXRoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IFtwYXRoXVxuICAgIHNldFRpbWVvdXQgQFxuICAgICAgKCkgPT4gOjpcbiAgICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICAgICAgICByZWJ1aWxkKClcbiAgICAgIDUwXG4gICAgLnVucmVmKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX3JlYnVpbGRfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiT2JqZWN0IiwiYXNzaWduIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJpbnB1dCIsIm1vZHVsZSIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwiY2FjaGUiLCJyb2xsdXAiLCJ0aW1lRW5kIiwid3JpdGUiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzX2NoYW5nZXMiLCJ3YXRjaGVycyIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJzZWxmIiwicmVidWlsZE9uIiwicmVzdGFydE9uIiwiX3JlYnVpbGRfZGVib3VuY2UiLCJwYXRoIiwicHVzaCIsInVucmVmIiwid2F0Y2hfZ2xvYiIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBS08sU0FBU0EsVUFBVCxHQUFzQjtRQUNyQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtTQUNPQyxVQUFZO2FBQ1IsaUJBRFE7YUFFUixDQUFFSCxVQUFGLENBRlE7YUFHUixFQUhRO2FBSVIsS0FKUTttQkFLRixLQUxFLEVBQVosQ0FBUDs7O0FBT0YsQUFBTyxTQUFTSSxNQUFULENBQWdCLEVBQUNDLE1BQUQs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
