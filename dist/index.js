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

exports.jsy_plugin = jsy_plugin;
exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKCkgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgcmV0dXJuIHJwaV9iYWJlbCBAOlxuICAgIGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgcHJlc2V0czogWyBqc3lfcHJlc2V0IF1cbiAgICBwbHVnaW5zOiBbXVxuICAgIGJhYmVscmM6IGZhbHNlXG4gICAgaGlnaGxpZ2h0Q29kZTogZmFsc2VcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5hc3NpZ24gQCB7fSwgb3B0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmICEgZm9ybWF0IDo6XG4gICAgZm9ybWF0ID0gYW1kID8gJ2FtZCcgOiAnaWlmZSdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBjb25zb2xlLnRpbWUgQCBgV3JvdGUgJHtsb2dfbXNnfWBcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgV3JvdGUgJHtsb2dfbXNnfWBcbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQocmVidWlsZCkgOjpcbiAgbGV0IGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgbGV0IHdhdGNoZXJzID0gW11cblxuICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICByZWJ1aWxkKClcblxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgcmVzdGFydE9uLCByZWJ1aWxkOiBfcmVidWlsZF9kZWJvdW5jZVxuICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIF9yZWJ1aWxkX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgIGlmIG51bGwgIT09IGlucHJvZ3Jlc3NfY2hhbmdlcyA6OlxuICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzLnB1c2gocGF0aClcbiAgICAgIHJldHVybiBzZWxmXG5cbiAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBbcGF0aF1cbiAgICBzZXRUaW1lb3V0IEBcbiAgICAgICgpID0+IDo6XG4gICAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgICAgICAgcmVidWlsZCgpXG4gICAgICA1MFxuICAgIC51bnJlZigpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9yZWJ1aWxkX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsIk9iamVjdCIsImFzc2lnbiIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiaW5wdXQiLCJtb2R1bGUiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsImNhY2hlIiwicm9sbHVwIiwidGltZUVuZCIsIndyaXRlIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzc19jaGFuZ2VzIiwid2F0Y2hlcnMiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwic2VsZiIsInJlYnVpbGRPbiIsInJlc3RhcnRPbiIsIl9yZWJ1aWxkX2RlYm91bmNlIiwicGF0aCIsInB1c2giLCJ1bnJlZiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUtPLFNBQVNBLFVBQVQsR0FBc0I7UUFDckJDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7U0FDT0MsVUFBWTthQUNSLGlCQURRO2FBRVIsQ0FBRUgsVUFBRixDQUZRO2FBR1IsRUFIUTthQUlSLEtBSlE7bUJBS0YsS0FMRSxFQUFaLENBQVA7OztBQU9GLEFBQU8sU0FBU0ksTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVNDLEdBQVQsRUFBY0MsYUFBZCxFQUE2QkMsT0FBN0IsRUFBc0NDLE1BQXRDLEVBQThDQyxHQUE5QyxFQUFoQixFQUFvRTtNQUN0RSxhQUFhLE9BQU9MLE1BQXZCLEVBQWdDO1VBQU8sSUFBSU0sU0FBSixDQUFpQixrQ0FBakIsQ0FBTjs7TUFDOUIsUUFBUUwsR0FBWCxFQUFpQjtVQUFPLElBQUlLLFNBQUosQ0FBaUIsdUNBQWpCLENBQU47O1FBQ1pDLE9BQU9DLE1BQVAsQ0FBZ0IsRUFBaEIsRUFBb0JQLEdBQXBCLENBQU47TUFDRyxRQUFRQyxhQUFYLEVBQTJCO29CQUFpQkQsSUFBSUMsYUFBSixJQUFxQixFQUFyQzs7TUFDekIsUUFBUUMsT0FBWCxFQUFxQjtjQUFXRixJQUFJRSxPQUFKLElBQWUsRUFBekI7O01BQ25CLFFBQVFGLElBQUlRLE1BQWYsRUFBd0I7UUFBS0EsTUFBSixHQUFhUixJQUFJUyxVQUFKLEdBQWlCLE1BQWpCLEdBQTBCLEVBQXZDOztNQUN0QixRQUFRVCxJQUFJVSxNQUFmLEVBQXdCO1FBQUtBLE1BQUosR0FBYSxlQUFiOztNQUN0QixRQUFRVixJQUFJRCxNQUFmLEVBQXdCO1FBQUtBLE1BQUosR0FBYVksV0FBYVosTUFBYixDQUFiOzs7UUFFbkJhLFFBQVEsRUFBSUEsT0FBT2IsTUFBWCxFQUFtQkcsT0FBbkI7Y0FDRlcsVUFBVSxDQUFDLENBQUVaLGNBQWNZLE1BQWQsQ0FEWCxFQUFkOztNQUdHLENBQUVWLE1BQUwsRUFBYzthQUNIQyxNQUFNLEtBQU4sR0FBYyxNQUF2Qjs7O1FBRUlVLFNBQVM7VUFBQTtVQUVQZCxJQUFJRCxNQUFKLENBQVdnQixJQUZKO1VBR04sR0FBRWYsSUFBSVUsTUFBTyxJQUFHVixJQUFJRCxNQUFKLENBQVdnQixJQUFLLEdBQUVmLElBQUlRLE1BQU8sS0FIdkM7ZUFJRlIsSUFBSWdCLFNBSkY7YUFLSkgsVUFBVVosY0FBY1ksTUFBZCxDQUxOLEVBQWY7O01BT0dULE9BQU8sVUFBVUQsTUFBcEIsRUFBNkI7V0FBUUMsR0FBUCxHQUFhQSxHQUFiOzs7U0FFdkJhLHFCQUF1QjtTQUFBLEVBQ3JCSCxNQURxQixFQUNiZCxHQURhLEVBQXZCLENBQVA7OztBQUdGLEFBQU8sU0FBU2lCLG9CQUFULENBQThCLEVBQUNMLEtBQUQsRUFBUUUsTUFBUixFQUFnQmQsR0FBaEIsRUFBOUIsRUFBb0Q7TUFDckRGLE1BQUo7U0FDTyxrQkFBa0I7VUFDakJvQixVQUFXLGtCQUFpQmxCLElBQUlELE1BQUosQ0FBV2dCLElBQUssT0FBTUksS0FBS0MsR0FBTCxHQUFXQyxRQUFYLENBQW9CLEVBQXBCLENBQXdCLEdBQWhGO1lBQ1FDLEdBQVIsQ0FBZSxZQUFXSixPQUFRLEVBQWxDO1lBQ1FLLElBQVIsQ0FBZ0IsU0FBUUwsT0FBUSxFQUFoQztRQUNJO1lBQ0lNLEtBQU4sR0FBYzFCLE1BQWQ7Y0FDUXlCLElBQVIsQ0FBZ0IsWUFBV0wsT0FBUSxFQUFuQztlQUNTLE1BQU1PLGNBQU9iLEtBQVAsQ0FBZjtjQUNRYyxPQUFSLENBQW1CLFlBQVdSLE9BQVEsRUFBdEM7Y0FDUUssSUFBUixDQUFnQixTQUFRTCxPQUFRLEVBQWhDO1lBQ01wQixPQUFPNkIsS0FBUCxDQUFhYixNQUFiLENBQU47Y0FDUVksT0FBUixDQUFtQixTQUFRUixPQUFRLEVBQW5DO0tBUEYsU0FRUTtjQUNFUSxPQUFSLENBQW1CLFNBQVFSLE9BQVEsRUFBbkM7O0dBYko7OztBQWVGLEFBQU8sU0FBU1UsUUFBVCxDQUFrQkMsU0FBbEIsRUFBNkI7U0FDM0JDLFFBQVFDLEdBQVIsQ0FBY0YsVUFBVUcsR0FBVixDQUNuQkMsV0FBV0EsU0FEUSxDQUFkLENBQVA7OztBQUdGLEFBQU8sU0FBU0MsYUFBVCxDQUF1QkMsT0FBdkIsRUFBZ0M7TUFDakNDLHFCQUFxQixJQUF6QjtNQUNJQyxXQUFXLEVBQWY7O01BRUdDLE1BQU1DLE9BQU4sQ0FBY0osT0FBZCxDQUFILEVBQTRCO2NBQ2hCUCxTQUFTWSxJQUFULENBQWdCLElBQWhCLEVBQXNCTCxPQUF0QixDQUFWOzs7TUFFQyxlQUFlLE9BQU9BLE9BQXpCLEVBQW1DO1VBQzNCLElBQUk5QixTQUFKLENBQWlCLDRDQUFqQixDQUFOOzs7Ozs7UUFLSW9DLE9BQU8sRUFBSUMsU0FBSixFQUFlQyxTQUFmLEVBQTBCUixTQUFTUyxpQkFBbkMsRUFBYjtTQUNPSCxJQUFQOztXQUVTRyxpQkFBVCxDQUEyQkMsT0FBM0IsRUFBaUM7O1FBRTVCLFNBQVNULGtCQUFaLEVBQWlDO3lCQUNaVSxJQUFuQixDQUF3QkQsT0FBeEI7YUFDT0osSUFBUDs7O3lCQUVtQixDQUFDSSxPQUFELENBQXJCO2VBRUUsTUFBTTsyQkFDaUIsSUFBckI7O0tBRkosRUFJRSxFQUpGLEVBS0NFLEtBTEQ7V0FNT04sSUFBUDs7O1dBRU9DLFNBQVQsQ0FBbUJNLFVBQW5CLEVBQStCO2FBQ3BCRixJQUFULENBQWdCRyxTQUNiQyxLQURhLENBQ0xGLFVBREssRUFDTztxQkFDSixJQURJOzhCQUVLLElBRkwsRUFEUCxFQUtiRyxFQUxhLENBS1IsUUFMUSxFQUtFUCxpQkFMRixDQUFoQjs7V0FPT0gsSUFBUDs7O1dBRU9FLFNBQVQsQ0FBbUJLLFVBQW5CLEVBQStCO2FBQ3BCRixJQUFULENBQWdCRyxTQUNiQyxLQURhLENBQ0xGLFVBREssRUFDTztxQkFDSixJQURJOzhCQUVLLElBRkwsRUFEUCxFQUtiRyxFQUxhLENBS1IsUUFMUSxFQUtFTixXQUFRO2NBQ2R2QixHQUFSLENBQWUsMkNBQTBDdUIsT0FBSyxJQUE5RDtZQUNNTyxhQUFhZixRQUFuQjtpQkFDVyxJQUFYO1dBQ0ksTUFBTWdCLElBQVYsSUFBa0JELFVBQWxCLEVBQStCO2FBQ3hCRSxLQUFMOztLQVZVLENBQWhCOztXQVlPYixJQUFQOzs7Ozs7Ozs7OyJ9
