'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var rollup = require('rollup');
var chokidar = _interopDefault(require('chokidar'));

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

  const self = { rebuildOn, restartOn };
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

exports.bundle = bundle;
exports.asRollupBuildClosure = asRollupBuildClosure;
exports.buildAll = buildAll;
exports.watchAndBuild = watchAndBuild;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvaW5kZXguanN5Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cm9sbHVwfSBmcm9tICdyb2xsdXAnXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG5cbiAgY29uc3QgaW5wdXQgPSBAe31cbiAgICBwbHVnaW5zXG4gICAgaW5wdXQ6IHNvdXJjZVxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgISBmb3JtYXQgOjpcbiAgICBmb3JtYXQgPSBhbWQgPyAnYW1kJyA6ICdpaWZlJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFscyhtb2R1bGUpIDo6XG4gICAgICByZXR1cm4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCJgXG4gICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKHJlYnVpbGQpIDo6XG4gIGxldCBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gIGxldCB3YXRjaGVycyA9IFtdXG5cbiAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgIGNvbnN0IHJlYnVpbGRMaXN0ID0gcmVidWlsZFxuICAgIHJlYnVpbGQgPSBhc3luYyAoKSA9PiA6OlxuICAgICAgY29uc3QgbXNnID0gJ1JlYnVpbGRpbmcgZm9yIGNoYW5nZXMnXG4gICAgICBjb25zb2xlLnRpbWUobXNnKVxuICAgICAgdHJ5IDo6XG4gICAgICAgIGF3YWl0IGJ1aWxkQWxsIEAgcmVidWlsZExpc3RcbiAgICAgICAgY29uc29sZS50aW1lRW5kKG1zZylcbiAgICAgIGNhdGNoIGVyciA6OlxuICAgICAgICBjb25zb2xlLmVycm9yIEAgZXJyXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cbiAgYXN5bmMgZnVuY3Rpb24gX3JlYnVpbGRfZGVib3VuY2UocGF0aCkgOjpcbiAgICA6OiAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBudWxsICE9PSBpbnByb2dyZXNzX2NoYW5nZXMgOjpcbiAgICAgICAgcmV0dXJuIGlucHJvZ3Jlc3NfY2hhbmdlcy5wdXNoKHBhdGgpXG5cbiAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IFtwYXRoXVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UgQCByZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTApLnVucmVmKClcbiAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcblxuICAgIHJldHVybiByZWJ1aWxkKClcblxuICBmdW5jdGlvbiByZWJ1aWxkT24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9yZWJ1aWxkX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsImlucHV0IiwibW9kdWxlIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwiY2FjaGUiLCJsb2ciLCJyb2xsdXAiLCJ3cml0ZSIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwicmVidWlsZCIsImlucHJvZ3Jlc3NfY2hhbmdlcyIsIndhdGNoZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVidWlsZExpc3QiLCJtc2ciLCJ0aW1lIiwidGltZUVuZCIsImVyciIsImVycm9yIiwic2VsZiIsInJlYnVpbGRPbiIsInJlc3RhcnRPbiIsIl9yZWJ1aWxkX2RlYm91bmNlIiwicGF0aCIsInB1c2giLCJyZXNvbHZlIiwic2V0VGltZW91dCIsInVucmVmIiwid2F0Y2hfZ2xvYiIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xv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
