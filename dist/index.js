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

  const self = { rebuild, rebuildOn, restartOn };
  return self;

  async function _rebuild_debounce(path) {
    {
      // debounce rapid updates
      if (null !== inprogress_changes) {
        return inprogress_changes.push(path);
      }

      inprogress_changes = [path];
      await new Promise(resolve => setTimeout(resolve, 50).unref());
      inprogress_changes = null;
    }

    return rebuild();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5pbXBvcnQgcnBpX2JhYmVsIGZyb20gJ3JvbGx1cC1wbHVnaW4tYmFiZWwnXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKCkgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgcmV0dXJuIHJwaV9iYWJlbCBAOlxuICAgIGV4Y2x1ZGU6ICdub2RlX21vZHVsZXMvKionXG4gICAgcHJlc2V0czogWyBqc3lfcHJlc2V0IF1cbiAgICBwbHVnaW5zOiBbXVxuICAgIGJhYmVscmM6IGZhbHNlXG4gICAgaGlnaGxpZ2h0Q29kZTogZmFsc2VcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0ge31cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBbXVxuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcblxuICBjb25zdCBpbnB1dCA9IEB7fVxuICAgIHBsdWdpbnNcbiAgICBpbnB1dDogc291cmNlXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiAhIGZvcm1hdCA6OlxuICAgIGZvcm1hdCA9IGFtZCA/ICdhbWQnIDogJ2lpZmUnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzKG1vZHVsZSkgOjpcbiAgICAgIHJldHVybiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgJiYgJ2FtZCcgPT09IGZvcm1hdCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgIGNvbnNvbGUubG9nIEAgYEJ1aWxkaW5nIHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cImBcbiAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQocmVidWlsZCkgOjpcbiAgbGV0IGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgbGV0IHdhdGNoZXJzID0gW11cblxuICBpZiBBcnJheS5pc0FycmF5KHJlYnVpbGQpIDo6XG4gICAgY29uc3QgcmVidWlsZExpc3QgPSByZWJ1aWxkXG4gICAgcmVidWlsZCA9IGFzeW5jICgpID0+IDo6XG4gICAgICBjb25zdCBtc2cgPSAnUmVidWlsZGluZyBmb3IgY2hhbmdlcydcbiAgICAgIGNvbnNvbGUudGltZShtc2cpXG4gICAgICB0cnkgOjpcbiAgICAgICAgYXdhaXQgYnVpbGRBbGwgQCByZWJ1aWxkTGlzdFxuICAgICAgICBjb25zb2xlLnRpbWVFbmQobXNnKVxuICAgICAgY2F0Y2ggZXJyIDo6XG4gICAgICAgIGNvbnNvbGUuZXJyb3IgQCBlcnJcblxuICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZCwgcmVidWlsZE9uLCByZXN0YXJ0T25cbiAgcmV0dXJuIHNlbGZcblxuICBhc3luYyBmdW5jdGlvbiBfcmVidWlsZF9kZWJvdW5jZShwYXRoKSA6OlxuICAgIDo6IC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIG51bGwgIT09IGlucHJvZ3Jlc3NfY2hhbmdlcyA6OlxuICAgICAgICByZXR1cm4gaW5wcm9ncmVzc19jaGFuZ2VzLnB1c2gocGF0aClcblxuICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gW3BhdGhdXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSBAIHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MCkudW5yZWYoKVxuICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuXG4gICAgcmV0dXJuIHJlYnVpbGQoKVxuXG4gIGZ1bmN0aW9uIHJlYnVpbGRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX3JlYnVpbGRfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsImlucHV0IiwibW9kdWxlIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwiY2FjaGUiLCJsb2ciLCJyb2xsdXAiLCJ3cml0ZSIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwicmVidWlsZCIsImlucHJvZ3Jlc3NfY2hhbmdlcyIsIndhdGNoZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVidWlsZExpc3QiLCJtc2ciLCJ0aW1lIiwidGltZUVuZCIsImVyciIsImVycm9yIiwic2VsZiIsInJlYnVpbGRPbiIsInJlc3RhcnRPbiIsIl9yZWJ1aWxkX2RlYm91bmNlIiwicGF0aCIsInB1c2giLCJyZXNvbHZlIiwic2V0VGltZW91dCIsInVucmVmIiwid2F0Y2hfZ2xvYiIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFJTyxTQUFTQSxVQUFULEdBQXNCO1FBQ3JCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1NBQ09DLFVBQVk7YUFDUixpQkFEUTthQUVSLENBQUVILFVBQUYsQ0FGUTthQUdSLEVBSFE7YUFJUixLQUpRO21CQUtGLEtBTEUsRUFBWixDQUFQOzs7QUFPRixBQUFPLFNBQVNJLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJDLE9BQTdCLEVBQXNDQyxNQUF0QyxFQUE4Q0MsR0FBOUMsRUFBaEIsRUFBb0U7TUFDdEUsYUFBYSxPQUFPTCxNQUF2QixFQUFnQztVQUFPLElBQUlNLFNBQUosQ0FBaUIsa0NBQWpCLENBQU47O01BQzlCLFFBQVFMLEdBQVgsRUFBaUI7VUFBTyxJQUFJSyxTQUFKLENBQWlCLHVDQUFqQixDQUFOOztNQUNmLFFBQVFKLGFBQVgsRUFBMkI7b0JBQWlCLEVBQWhCOztNQUN6QixRQUFRQyxPQUFYLEVBQXFCO2NBQVcsRUFBVjs7TUFDbkIsUUFBUUYsSUFB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
