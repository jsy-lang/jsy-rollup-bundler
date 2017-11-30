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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbigpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIHJldHVybiBycGlfYmFiZWwgQDpcbiAgICBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgIHByZXNldHM6IFsganN5X3ByZXNldCBdXG4gICAgcGx1Z2luczogW11cbiAgICBiYWJlbHJjOiBmYWxzZVxuICAgIGhpZ2hsaWdodENvZGU6IGZhbHNlXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuYXNzaWduIEAge30sIG9wdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiAhIGZvcm1hdCA6OlxuICAgIGZvcm1hdCA9IGFtZCA/ICdhbWQnIDogJ2lpZmUnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kICYmICdhbWQnID09PSBmb3JtYXQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCJgXG4gICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKHJlYnVpbGQpIDo6XG4gIGxldCBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG4gIGxldCB3YXRjaGVycyA9IFtdXG5cbiAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgIGNvbnN0IHJlYnVpbGRMaXN0ID0gcmVidWlsZFxuICAgIHJlYnVpbGQgPSBhc3luYyAoKSA9PiA6OlxuICAgICAgY29uc3QgbXNnID0gJ1JlYnVpbGRpbmcgZm9yIGNoYW5nZXMnXG4gICAgICBjb25zb2xlLnRpbWUobXNnKVxuICAgICAgdHJ5IDo6XG4gICAgICAgIGF3YWl0IGJ1aWxkQWxsIEAgcmVidWlsZExpc3RcbiAgICAgICAgY29uc29sZS50aW1lRW5kKG1zZylcbiAgICAgIGNhdGNoIGVyciA6OlxuICAgICAgICBjb25zb2xlLmVycm9yIEAgZXJyXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHJlYnVpbGQgdG8gYmUgYSBmdW5jdGlvbiBvciBhcnJheWBcblxuICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICByZWJ1aWxkKClcblxuICBjb25zdCBzZWxmID0gQHt9IHJlYnVpbGRPbiwgcmVzdGFydE9uLCByZWJ1aWxkOiBfcmVidWlsZF9kZWJvdW5jZVxuICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIF9yZWJ1aWxkX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgIGlmIG51bGwgIT09IGlucHJvZ3Jlc3NfY2hhbmdlcyA6OlxuICAgICAgaW5wcm9ncmVzc19jaGFuZ2VzLnB1c2gocGF0aClcbiAgICAgIHJldHVybiBzZWxmXG5cbiAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBbcGF0aF1cbiAgICBzZXRUaW1lb3V0IEBcbiAgICAgICgpID0+IDo6XG4gICAgICAgIGlucHJvZ3Jlc3NfY2hhbmdlcyA9IG51bGxcbiAgICAgICAgcmVidWlsZCgpXG4gICAgICA1MFxuICAgIC51bnJlZigpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIF9yZWJ1aWxkX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIHJlc3RhcnRPbih3YXRjaF9nbG9iKSA6OlxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgcGF0aCA9PiA6OlxuICAgICAgICBjb25zb2xlLmxvZyBAIGBTZXR1cCBjaGFuZ2VkOyBzaHV0dGluZyBkb3duIHdhdGNoZXJzIChcIiR7cGF0aH1cIilgXG4gICAgICAgIGNvbnN0IGxfd2F0Y2hlcnMgPSB3YXRjaGVyc1xuICAgICAgICB3YXRjaGVycyA9IG51bGxcbiAgICAgICAgZm9yIGNvbnN0IGVhY2ggb2YgbF93YXRjaGVycyA6OlxuICAgICAgICAgIGVhY2guY2xvc2UoKVxuXG4gICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsIk9iamVjdCIsImFzc2lnbiIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiaW5wdXQiLCJtb2R1bGUiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJjYWNoZSIsImxvZyIsInJvbGx1cCIsIndyaXRlIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzc19jaGFuZ2VzIiwid2F0Y2hlcnMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWJ1aWxkTGlzdCIsIm1zZyIsInRpbWUiLCJ0aW1lRW5kIiwiZXJyIiwiZXJyb3IiLCJzZWxmIiwicmVidWlsZE9uIiwicmVzdGFydE9uIiwiX3JlYnVpbGRfZGVib3VuY2UiLCJwYXRoIiwicHVzaCIsInVucmVmIiwid2F0Y2hfZ2xvYiIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiXSwibWFwcGluZ3MiOiI7Ozs7O0FBS08sU0FBU0EsVUFBVCxHQUFzQjtRQUNyQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtTQUNPQyxVQUFZO2FBQ1IsaUJBRFE7YUFFUixDQUFFSCxVQUFGLENBRlE7YUFHUixFQUhRO2FBSVIsS0FKUTttQkFLRixLQUxFLEVBQVosQ0FBUDs7O0FBT0YsQUFBTyxTQUFTSSxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxPQUE3QixFQUFzQ0MsTUFBdEMsRUFBOENDLEdBQTlDLEVBQWhC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
