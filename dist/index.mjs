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
    bundle = await rollup$1(input);
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

export { jsy_plugin, bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbigpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHJldHVybiBycGlfYmFiZWwgQDpcbiAgICBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgIHByZXNldHM6IFsganN5X3ByZXNldCBdXG4gICAgcGx1Z2luczogW11cbiAgICBiYWJlbHJjOiBmYWxzZVxuICAgIGhpZ2hsaWdodENvZGU6IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG5cbiAgY29uc3QgaW5wdXQgPSBAe31cbiAgICBwbHVnaW5zXG4gICAgaW5wdXQ6IHNvdXJjZVxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgISBmb3JtYXQgOjpcbiAgICBmb3JtYXQgPSBhbWQgPyAnYW1kJyA6ICdpaWZlJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFscyhtb2R1bGUpIDo6XG4gICAgICByZXR1cm4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCJgXG4gICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKHJlYnVpbGQpIDo6XG4gIGxldCBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gIGxldCB3YXRjaGVycyA9IFtdXG5cbiAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgIGNvbnN0IHJlYnVpbGRMaXN0ID0gcmVidWlsZFxuICAgIHJlYnVpbGQgPSBhc3luYyAoKSA9PiA6OlxuICAgICAgY29uc3QgbXNnID0gJ1JlYnVpbGRpbmcgZm9yIGNoYW5nZXMnXG4gICAgICBjb25zb2xlLnRpbWUobXNnKVxuICAgICAgdHJ5IDo6XG4gICAgICAgIGF3YWl0IGJ1aWxkQWxsIEAgcmVidWlsZExpc3RcbiAgICAgICAgY29uc29sZS50aW1lRW5kKG1zZylcbiAgICAgIGNhdGNoIGVyciA6OlxuICAgICAgICBjb25zb2xlLmVycm9yIEAgZXJyXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICByZWJ1aWxkKClcblxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgcmVzdGFydE9uLCByZWJ1aWxkOiBfcmVidWlsZF9kZWJvdW5jZVxuICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIF9yZWJ1aWxkX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgIGlmIG51bGwgIT09IGlucHJvZ3Jlc3NfY2hhbmdlcyA6OlxuICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzLnB1c2gocGF0aClcbiAgICAgIHJldHVybiBzZWxmXG5cbiAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBbcGF0aF1cbiAgICBzZXRUaW1lb3V0IEBcbiAgICAgICgpID0+IDo6XG4gICAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgICAgICAgcmVidWlsZCgpXG4gICAgICA1MFxuICAgIC51bnJlZigpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9yZWJ1aWxkX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJpbnB1dCIsIm1vZHVsZSIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImNhY2hlIiwibG9nIiwicm9sbHVwIiwid3JpdGUiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzX2NoYW5nZXMiLCJ3YXRjaGVycyIsIkFycmF5IiwiaXNBcnJheSIsInJlYnVpbGRMaXN0IiwibXNnIiwidGltZSIsInRpbWVFbmQiLCJlcnIiLCJlcnJvciIsInNlbGYiLCJyZWJ1aWxkT24iLCJyZXN0YXJ0T24iLCJfcmVidWlsZF9kZWJvdW5jZSIsInBhdGgiLCJwdXNoIiwidW5yZWYiLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUlPLFNBQVNBLFVBQVQsR0FBc0I7UUFDckJDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7U0FDT0MsVUFBWTthQUNSLGlCQURRO2FBRVIsQ0FBRUgsVUFBRixDQUZRO2FBR1IsRUFIUTthQUlSLEtBSlE7bUJBS0YsS0FMRSxFQUFaLENBQVA7OztBQU9GLEFBQU8sU0FBU0ksTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVNDLEdBQVQsRUFBY0MsYUFBZCxFQUE2QkMsT0FBN0IsRUFBc0NDLE1BQXRDLEVBQThDQyxHQUE5QyxFQUFoQixFQUFvRTtNQUN0RSxhQUFhLE9BQU9MLE1BQXZCLEVBQWdDO1VBQU8sSUFBSU0sU0FBSixDQUFpQixrQ0FBakIsQ0FBTjs7TUFDOUIsUUFBUUwsR0FBWCxFQUFpQjtVQUFPLElBQUlLLFNBQUosQ0FBaUIsdUNBQWpCLENBQU47O01BQ2YsUUFBUUosYUFBWCxFQUEyQjtvQkFBaUIsRUFBaEI7O01BQ3pCLFFBQVFDLE9BQVgs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
