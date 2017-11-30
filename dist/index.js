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
    input.cache = bundle;
    console.log(`Building rollup bundle "${opt.source.name}"`);
    bundle = await rollup.rollup(input);
    await bundle.write(output);
  };
}

function buildAll(buildList) {
  return Promise.all(buildList.map(builder => builder()));
}

function watchAndBuild(rebuild) {
  let inprogress_changes = null;
  let watchers = [];

  if (Array.isArray(rebuild)) {
    const rebuildList = rebuild;
    rebuild = async () => {
      const msg = 'Rebuilding for changes';
      console.time(msg);
      try {
        await buildAll(rebuildList);
        console.timeEnd(msg);
      } catch (err) {
        console.error(err);
      }
    };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKCkgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgcmV0dXJuIHJwaV9iYWJlbCBAOlxuICAgIGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgcHJlc2V0czogWyBqc3lfcHJlc2V0IF1cbiAgICBwbHVnaW5zOiBbXVxuICAgIGJhYmVscmM6IGZhbHNlXG4gICAgaGlnaGxpZ2h0Q29kZTogZmFsc2VcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5hc3NpZ24gQCB7fSwgb3B0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmICEgZm9ybWF0IDo6XG4gICAgZm9ybWF0ID0gYW1kID8gJ2FtZCcgOiAnaWlmZSdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgIGNvbnNvbGUubG9nIEAgYEJ1aWxkaW5nIHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cImBcbiAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQocmVidWlsZCkgOjpcbiAgbGV0IGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgbGV0IHdhdGNoZXJzID0gW11cblxuICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgY29uc3QgcmVidWlsZExpc3QgPSByZWJ1aWxkXG4gICAgcmVidWlsZCA9IGFzeW5jICgpID0+IDo6XG4gICAgICBjb25zdCBtc2cgPSAnUmVidWlsZGluZyBmb3IgY2hhbmdlcydcbiAgICAgIGNvbnNvbGUudGltZShtc2cpXG4gICAgICB0cnkgOjpcbiAgICAgICAgYXdhaXQgYnVpbGRBbGwgQCByZWJ1aWxkTGlzdFxuICAgICAgICBjb25zb2xlLnRpbWVFbmQobXNnKVxuICAgICAgY2F0Y2ggZXJyIDo6XG4gICAgICAgIGNvbnNvbGUuZXJyb3IgQCBlcnJcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gIHJlYnVpbGQoKVxuXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCByZXN0YXJ0T24sIHJlYnVpbGQ6IF9yZWJ1aWxkX2RlYm91bmNlXG4gIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gX3JlYnVpbGRfZGVib3VuY2UocGF0aCkgOjpcbiAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgaWYgbnVsbCAhPT0gaW5wcm9ncmVzc19jaGFuZ2VzIDo6XG4gICAgICBpbnByb2dyZXNzX2NoYW5nZXMucHVzaChwYXRoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IFtwYXRoXVxuICAgIHNldFRpbWVvdXQgQFxuICAgICAgKCkgPT4gOjpcbiAgICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICAgICAgICByZWJ1aWxkKClcbiAgICAgIDUwXG4gICAgLnVucmVmKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX3JlYnVpbGRfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiT2JqZWN0IiwiYXNzaWduIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJpbnB1dCIsIm1vZHVsZSIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImNhY2hlIiwibG9nIiwicm9sbHVwIiwid3JpdGUiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzX2NoYW5nZXMiLCJ3YXRjaGVycyIsIkFycmF5IiwiaXNBcnJheSIsInJlYnVpbGRMaXN0IiwibXNnIiwidGltZSIsInRpbWVFbmQiLCJlcnIiLCJlcnJvciIsInNlbGYiLCJyZWJ1aWxkT24iLCJyZXN0YXJ0T24iLCJfcmVidWlsZF9kZWJvdW5jZSIsInBhdGgiLCJwdXNoIiwidW5yZWYiLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFLTyxTQUFTQSxVQUFULEdBQXNCO1FBQ3JCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1NBQ09DLFVBQVk7YUFDUixpQkFEUTthQUVSLENBQUVILFVBQUYsQ0FGUTthQUdSLEVBSFE7YUFJUixLQUpRO21CQUtGLEtBTEUsRUFBWixDQUFQOzs7QUFPRixBQUFPLFNBQVNJLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJDLE9BQTdCLEVBQXNDQyxNQUF0QyxFQUE4Q0MsR0FBOUMs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
