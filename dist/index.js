'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

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
  if (null == globalModules) {
    globalModules = {};
  }
  if (null == plugins) {
    plugins = [];
  }
  if (null == opt.suffix) {
    opt.suffix = opt.production ? '.min' : '';
  }
  if (null == opt.outdir) {
    opt.outdir = './dist/public';
  }

  const input = {
    plugins,
    input: source,
    external: module => !!globalModules[module] };

  if (!format) {
    format = amd ? 'amd' : 'iife';
  }

  const output = {
    format,
    name: opt.source.name,
    file: `${opt.outdir}/${opt.source.name}${opt.suffix}.js`,
    sourcemap: opt.sourcemap,
    globals(module) {
      return globalModules[module];
    } };

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

  function _rebuild_debounce(path) {
    // debounce rapid updates
    if (null !== inprogress_changes) {
      inprogress_changes.push(path);
      return self;
    }

    inprogress_changes = [path];
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
      ignorePermissionErrors: true }).on('change', path => {
      console.log(`Setup changed; shutting down watchers ("${path}")`);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKCkgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgcmV0dXJuIHJwaV9iYWJlbCBAOlxuICAgIGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgcHJlc2V0czogWyBqc3lfcHJlc2V0IF1cbiAgICBwbHVnaW5zOiBbXVxuICAgIGJhYmVscmM6IGZhbHNlXG4gICAgaGlnaGxpZ2h0Q29kZTogZmFsc2VcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0ge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcblxuICBjb25zdCBpbnB1dCA9IEB7fVxuICAgIHBsdWdpbnNcbiAgICBpbnB1dDogc291cmNlXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiAhIGZvcm1hdCA6OlxuICAgIGZvcm1hdCA9IGFtZCA/ICdhbWQnIDogJ2lpZmUnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzKG1vZHVsZSkgOjpcbiAgICAgIHJldHVybiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgIGNvbnNvbGUubG9nIEAgYEJ1aWxkaW5nIHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cImBcbiAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQocmVidWlsZCkgOjpcbiAgbGV0IGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgbGV0IHdhdGNoZXJzID0gW11cblxuICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgY29uc3QgcmVidWlsZExpc3QgPSByZWJ1aWxkXG4gICAgcmVidWlsZCA9IGFzeW5jICgpID0+IDo6XG4gICAgICBjb25zdCBtc2cgPSAnUmVidWlsZGluZyBmb3IgY2hhbmdlcydcbiAgICAgIGNvbnNvbGUudGltZShtc2cpXG4gICAgICB0cnkgOjpcbiAgICAgICAgYXdhaXQgYnVpbGRBbGwgQCByZWJ1aWxkTGlzdFxuICAgICAgICBjb25zb2xlLnRpbWVFbmQobXNnKVxuICAgICAgY2F0Y2ggZXJyIDo6XG4gICAgICAgIGNvbnNvbGUuZXJyb3IgQCBlcnJcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gIHJlYnVpbGQoKVxuXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCByZXN0YXJ0T24sIHJlYnVpbGQ6IF9yZWJ1aWxkX2RlYm91bmNlXG4gIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gX3JlYnVpbGRfZGVib3VuY2UocGF0aCkgOjpcbiAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgaWYgbnVsbCAhPT0gaW5wcm9ncmVzc19jaGFuZ2VzIDo6XG4gICAgICBpbnByb2dyZXNzX2NoYW5nZXMucHVzaChwYXRoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IFtwYXRoXVxuICAgIHNldFRpbWVvdXQgQFxuICAgICAgKCkgPT4gOjpcbiAgICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICAgICAgICByZWJ1aWxkKClcbiAgICAgIDUwXG4gICAgLnVucmVmKClcbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX3JlYnVpbGRfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsImlucHV0IiwibW9kdWxlIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwiY2FjaGUiLCJsb2ciLCJyb2xsdXAiLCJ3cml0ZSIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwicmVidWlsZCIsImlucHJvZ3Jlc3NfY2hhbmdlcyIsIndhdGNoZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVidWlsZExpc3QiLCJtc2ciLCJ0aW1lIiwidGltZUVuZCIsImVyciIsImVycm9yIiwic2VsZiIsInJlYnVpbGRPbiIsInJlc3RhcnRPbiIsIl9yZWJ1aWxkX2RlYm91bmNlIiwicGF0aCIsInB1c2giLCJ1bnJlZiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBSU8sU0FBU0EsVUFBVCxHQUFzQjtRQUNyQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtTQUNPQyxVQUFZO2FBQ1IsaUJBRFE7YUFFUixDQUFFSCxVQUFGLENBRlE7YUFHUixFQUhRO2FBSVIsS0FKUTttQkFLRixLQUxFLEVBQVosQ0FBUDs7O0FBT0YsQUFBTyxTQUFTSSxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxPQUE3QixFQUFzQ0MsTUFBdEMsRUFBOENDLEdBQTlDLEVBQWhCLEVBQW9FO01BQ3RFLGFBQWEsT0FBT0wsTUFBdkIsRUFBZ0M7VUFBTyxJQUFJTSxTQUFKLENBQWlCLGtDQUFqQixDQUFOOztNQUM5QixRQUFRTCxHQUFYLEVBQWlCO1VBQU8sSUFBSUssU0FBSixDQUFpQix1Q0FBakIsQ0FBTjs7TUFDZixRQUFRSixhQUFYLEVBQTJCO29CQUFpQixFQUFoQjs7TUFDekIsUUFBUUMs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
