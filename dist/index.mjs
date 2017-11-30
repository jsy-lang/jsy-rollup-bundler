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

export { jsy_plugin, bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbigpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHJldHVybiBycGlfYmFiZWwgQDpcbiAgICBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgIHByZXNldHM6IFsganN5X3ByZXNldCBdXG4gICAgcGx1Z2luczogW11cbiAgICBiYWJlbHJjOiBmYWxzZVxuICAgIGhpZ2hsaWdodENvZGU6IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG5cbiAgY29uc3QgaW5wdXQgPSBAe31cbiAgICBwbHVnaW5zXG4gICAgaW5wdXQ6IHNvdXJjZVxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgISBmb3JtYXQgOjpcbiAgICBmb3JtYXQgPSBhbWQgPyAnYW1kJyA6ICdpaWZlJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFscyhtb2R1bGUpIDo6XG4gICAgICByZXR1cm4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCJgXG4gICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKHJlYnVpbGQpIDo6XG4gIGxldCBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gIGxldCB3YXRjaGVycyA9IFtdXG5cbiAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgIGNvbnN0IHJlYnVpbGRMaXN0ID0gcmVidWlsZFxuICAgIHJlYnVpbGQgPSBhc3luYyAoKSA9PiA6OlxuICAgICAgY29uc3QgbXNnID0gJ1JlYnVpbGRpbmcgZm9yIGNoYW5nZXMnXG4gICAgICBjb25zb2xlLnRpbWUobXNnKVxuICAgICAgdHJ5IDo6XG4gICAgICAgIGF3YWl0IGJ1aWxkQWxsIEAgcmVidWlsZExpc3RcbiAgICAgICAgY29uc29sZS50aW1lRW5kKG1zZylcbiAgICAgIGNhdGNoIGVyciA6OlxuICAgICAgICBjb25zb2xlLmVycm9yIEAgZXJyXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGQsIHJlYnVpbGRPbiwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cbiAgYXN5bmMgZnVuY3Rpb24gX3JlYnVpbGRfZGVib3VuY2UocGF0aCkgOjpcbiAgICA6OiAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBudWxsICE9PSBpbnByb2dyZXNzX2NoYW5nZXMgOjpcbiAgICAgICAgcmV0dXJuIGlucHJvZ3Jlc3NfY2hhbmdlcy5wdXNoKHBhdGgpXG5cbiAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IFtwYXRoXVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UgQCByZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTApLnVucmVmKClcbiAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcblxuICAgIHJldHVybiByZWJ1aWxkKClcblxuICBmdW5jdGlvbiByZWJ1aWxkT24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9yZWJ1aWxkX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJpbnB1dCIsIm1vZHVsZSIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImNhY2hlIiwibG9nIiwicm9sbHVwIiwid3JpdGUiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzX2NoYW5nZXMiLCJ3YXRjaGVycyIsIkFycmF5IiwiaXNBcnJheSIsInJlYnVpbGRMaXN0IiwibXNnIiwidGltZSIsInRpbWVFbmQiLCJlcnIiLCJlcnJvciIsInNlbGYiLCJyZWJ1aWxkT24iLCJyZXN0YXJ0T24iLCJfcmVidWlsZF9kZWJvdW5jZSIsInBhdGgiLCJwdXNoIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJ1bnJlZiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIl0sIm1hcHBpbmdzIjoiOzs7O0FBSU8sU0FBU0EsVUFBVCxHQUFzQjtRQUNyQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtTQUNPQyxVQUFZO2FBQ1IsaUJBRFE7YUFFUixDQUFFSCxVQUFGLENBRlE7YUFHUixFQUhRO2FBSVIsS0FKUTttQkFLRixLQUxFLEVBQVosQ0FBUDs7O0FBT0YsQUFBTyxTQUFTSSxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxPQUE3QixFQUFzQ0MsTUFBdEMsRUFBOENDLEdBQTlDLEVBQWhCLEVBQW9FO01BQ3RFLGFBQWEsT0FBT0wsTUFBdkIsRUFBZ0M7VUFBTyxJQUFJTSxTQUFKLENBQWlCLGtDQUFqQixDQUFOOztNQUM5QixRQUFRTCxHQUFYLEVBQWlCO1VBQU8sSUFBSUssU0FBSixDQUFpQix1Q0FBakIsQ0FBTjs7TUFDZixRQUFRSixhQUFYLEVBQTJCO29CQUFpQixFQUFoQjs7TUFDekIsUUFBUUMsT0FBWCxFQUFxQjtjQUFXLEVBQVY7O01BQ25CLFFBQVFGLElBQUlNLE1B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
