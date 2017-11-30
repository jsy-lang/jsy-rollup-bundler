import { parse } from 'path';
import { rollup as rollup$1 } from 'rollup';
import chokidar from 'chokidar';
import rpi_babel from 'rollup-plugin-babel';

function jsy_plugin(kwargs) {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  const presets = [jsy_preset].concat(kwargs.presets || []);

  kwargs = Object.assign({ exclude: 'node_modules/**',
    babelrc: false, highlightCode: false }, kwargs, { presets });

  return rpi_babel(kwargs);
}

function bundle({ source, opt, globalModules, externals, plugins, format, amd }) {
  if ('string' !== typeof source) {
    throw new TypeError(`Expected string source parameter`);
  }
  if (null == opt) {
    throw new TypeError(`Expected valid "opt" object parameter`);
  }
  opt = Object.create(opt // Don't modify the underlying object
  );
  if (null == globalModules) {
    globalModules = opt.globalModules || {};
  }
  if (null == externals) {
    externals = opt.externals || [];
  }
  if (null == plugins) {
    plugins = opt.plugins || [];
  }
  if (null == format) {
    format = opt.format || 'iife';
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

  externals = new Set(externals);
  const input = { input: source, plugins,
    external: module => !!globalModules[module] || externals.has(module) };

  if (amd) {
    format = 'amd';
  }

  const output = {
    format,
    name: opt.source.name,
    file: `${opt.outdir}/${opt.source.name}${opt.suffix}.js`,
    sourcemap: opt.sourcemap,
    globals: module => globalModules[module] };

  if (amd) {
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
      bundle = await rollup$1(input);
      console.timeEnd(`Compiled ${log_msg}`);
      await bundle.write(output);
    } catch (err) {
      const { code, loc, frame } = err;
      const lines = ['', '', `${err.message} (${code})`, `  in "${loc.file}" at ${loc.line}:${loc.column}"`, '', frame, '', ''];

      console.error(lines.join('\n'));
    } finally {
      console.timeEnd(`Built ${log_msg}`);
    }
  };
}

function buildAll(buildList) {
  return Promise.all(buildList.map(builder => builder()));
}

function watchAndBuild() {
  let watchers = [];
  const self = { rebuildOn, buildOnce, restartOn };
  return self;

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

  function buildOnce(buildOnce, watch_glob) {
    if (Array.isArray(buildOnce)) {
      buildOnce = buildAll.bind(null, buildOnce);
    }

    if ('function' !== typeof buildOnce) {
      throw new TypeError(`Expected buildOnce to be a function or array`);
    }

    if (watch_glob) {
      restartOn(watch_glob);
    }

    buildOnce();
    return self;
  }

  function rebuildOn(rebuild, watch_glob) {
    let inprogress = false;
    if (Array.isArray(rebuild)) {
      rebuild = buildAll.bind(null, rebuild);
    }

    if ('function' !== typeof rebuild) {
      throw new TypeError(`Expected rebuild to be a function or array`);
    }

    // invoke initial build
    rebuild();

    watchers.push(chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', _debounce));

    return self;

    function _debounce(path$$1) {
      // debounce rapid updates
      if (false === inprogress) {
        inprogress = true;
        setTimeout(() => {
          inprogress = false;
          rebuild();
        }, 50).unref();
      }
      return self;
    }
  }
}

export { jsy_plugin, bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJ1xuICAgICAgICBiYWJlbHJjOiBmYWxzZSwgaGlnaGxpZ2h0Q29kZTogZmFsc2VcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0c1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBleHRlcm5hbHMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5jcmVhdGUgQCBvcHQgLy8gRG9uJ3QgbW9kaWZ5IHRoZSB1bmRlcmx5aW5nIG9iamVjdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gZXh0ZXJuYWxzIDo6IGV4dGVybmFscyA9IG9wdC5leHRlcm5hbHMgfHwgW11cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IGZvcm1hdCA6OiBmb3JtYXQgPSBvcHQuZm9ybWF0IHx8ICdpaWZlJ1xuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgZXh0ZXJuYWxzID0gbmV3IFNldCBAIGV4dGVybmFsc1xuICBjb25zdCBpbnB1dCA9IEB7fSBpbnB1dDogc291cmNlLCBwbHVnaW5zLFxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdIHx8IGV4dGVybmFscy5oYXMobW9kdWxlKVxuXG4gIGlmIGFtZCA6OiBmb3JtYXQgPSAnYW1kJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFsczogbW9kdWxlID0+IGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmIGFtZCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIGFzUm9sbHVwQnVpbGRDbG9zdXJlIEA6XG4gICAgaW5wdXQsIG91dHB1dCwgb3B0XG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSh7aW5wdXQsIG91dHB1dCwgb3B0fSkgOjpcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gKCkgOjpcbiAgICBjb25zdCBsb2dfbXNnID0gYHJvbGx1cCBidW5kbGUgXCIke29wdC5zb3VyY2UubmFtZX1cIiAoQCR7RGF0ZS5ub3coKS50b1N0cmluZygzNil9KWBcbiAgICBjb25zb2xlLmxvZyBAIGBCdWlsZGluZyAke2xvZ19tc2d9YFxuICAgIGNvbnNvbGUudGltZSBAIGBCdWlsdCAke2xvZ19tc2d9YFxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGNvbnNvbGUudGltZSBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYnVuZGxlID0gYXdhaXQgcm9sbHVwKGlucHV0KVxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuXG4gICAgY2F0Y2ggZXJyIDo6XG4gICAgICBjb25zdCB7Y29kZSwgbG9jLCBmcmFtZX0gPSBlcnJcbiAgICAgIGNvbnN0IGxpbmVzID0gQFtdXG4gICAgICAgICcnXG4gICAgICAgICcnXG4gICAgICAgIGAke2Vyci5tZXNzYWdlfSAoJHtjb2RlfSlgXG4gICAgICAgIGAgIGluIFwiJHtsb2MuZmlsZX1cIiBhdCAke2xvYy5saW5lfToke2xvYy5jb2x1bW59XCJgXG4gICAgICAgICcnXG4gICAgICAgIGZyYW1lXG4gICAgICAgICcnXG4gICAgICAgICcnXG5cbiAgICAgIGNvbnNvbGUuZXJyb3IgQCBsaW5lcy5qb2luKCdcXG4nKVxuXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZCgpIDo6XG4gIGxldCB3YXRjaGVycyA9IFtdXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCBidWlsZE9uY2UsIHJlc3RhcnRPblxuICByZXR1cm4gc2VsZlxuXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIGJ1aWxkT25jZShidWlsZE9uY2UsIHdhdGNoX2dsb2IpIDo6XG4gICAgaWYgQXJyYXkuaXNBcnJheShidWlsZE9uY2UpIDo6XG4gICAgICBidWlsZE9uY2UgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgYnVpbGRPbmNlXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgYnVpbGRPbmNlIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIGJ1aWxkT25jZSB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgaWYgd2F0Y2hfZ2xvYiA6OiByZXN0YXJ0T24gQCB3YXRjaF9nbG9iXG5cbiAgICBidWlsZE9uY2UoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHJlYnVpbGQsIHdhdGNoX2dsb2IpIDo6XG4gICAgbGV0IGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgICByZWJ1aWxkKClcblxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gICAgZnVuY3Rpb24gX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBmYWxzZSA9PT0gaW5wcm9ncmVzcyA6OlxuICAgICAgICBpbnByb2dyZXNzID0gdHJ1ZVxuICAgICAgICBzZXRUaW1lb3V0IEBcbiAgICAgICAgICAoKSA9PiA6OlxuICAgICAgICAgICAgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgICAgICAgICByZWJ1aWxkKClcbiAgICAgICAgICA1MFxuICAgICAgICAudW5yZWYoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJwcmVzZXRzIiwiY29uY2F0IiwiT2JqZWN0IiwiYXNzaWduIiwiZXhjbHVkZSIsImhpZ2hsaWdodENvZGUiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwiZXh0ZXJuYWxzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsImNyZWF0ZSIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiU2V0IiwiaW5wdXQiLCJtb2R1bGUiLCJoYXMiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsImNhY2hlIiwicm9sbHVwIiwidGltZUVuZCIsIndyaXRlIiwiZXJyIiwiY29kZSIsImxvYyIsImZyYW1lIiwibGluZXMiLCJtZXNzYWdlIiwiZmlsZSIsImxpbmUiLCJjb2x1bW4iLCJlcnJvciIsImpvaW4iLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsIndhdGNoZXJzIiwic2VsZiIsInJlYnVpbGRPbiIsImJ1aWxkT25jZSIsInJlc3RhcnRPbiIsIndhdGNoX2dsb2IiLCJwdXNoIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwicGF0aCIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwicmVidWlsZCIsImlucHJvZ3Jlc3MiLCJfZGVib3VuY2UiLCJ1bnJlZiJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFNTyxTQUFTQSxVQUFULENBQW9CQyxNQUFwQixFQUE0QjtRQUMzQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtRQUNNQyxVQUFVLENBQUNILFVBQUQsRUFBYUksTUFBYixDQUFzQkwsT0FBT0ksT0FBUCxJQUFrQixFQUF4QyxDQUFoQjs7V0FFU0UsT0FBT0MsTUFBUCxDQUNQLEVBQUlDLFNBQVMsaUJBQWI7YUFDYSxLQURiLEVBQ29CQyxlQUFlLEtBRG5DLEVBRE8sRUFHUFQsTUFITyxFQUlQLEVBQUlJLE9BQUosRUFKTyxDQUFUOztTQU1PTSxVQUFVVixNQUFWLENBQVA7OztBQUdGLEFBQU8sU0FBU1csTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVNDLEdBQVQsRUFBY0MsYUFBZCxFQUE2QkMsU0FBN0IsRUFBd0NDLE9BQXhDLEVBQWlEQyxNQUFqRCxFQUF5REMsR0FBekQsRUFBaEIsRUFBK0U7TUFDakYsYUFBYSxPQUFPTixNQUF2QixFQUFnQztVQUFPLElBQUlPLFNBQUosQ0FBaUIsa0NBQWpCLENBQU47O01BQzlCLFFBQVFOLEdBQVgsRUFBaUI7VUFBTyxJQUFJTSxTQUFKLENBQWlCLHVDQUFqQixDQUFOOztRQUNaYixPQUFPYyxNQUFQLENBQWdCUCxHQUFoQjtHQUFOO01BQ0csUUFBUUMsYUFBWCxFQUEyQjtvQkFBaUJELElBQUlDLGFBQUosSUFBcUIsRUFBckM7O01BQ3pCLFFBQVFDLFNBQVgsRUFBdUI7Z0JBQWFGLElBQUlFLFNBQUosSUFBaUIsRUFBN0I7O01BQ3JCLFFBQVFDLE9BQVgsRUFBcUI7Y0FBV0gsSUFBSUcsT0FBSixJQUFlLEVBQXpCOztNQUNuQixRQUFRQyxNQUFYLEVBQW9CO2FBQVVKLElBQUlJLE1BQUosSUFBYyxNQUF2Qjs7TUFDbEIsUUFBUUosSUFBSVEsTUFBZixFQUF3QjtRQUFLQSxNQUFKLEdBQWFSLElBQUlTLFVBQUosR0FBaUIsTUFBakIsR0FBMEIsRUFBdkM7O01BQ3RCLFFBQVFULElBQUlVLE1BQWYsRUFBd0I7UUFBS0EsTUFBSixHQUFhLGVBQWI7O01BQ3RCLFFBQVFWLElBQUlELE1BQWYsRUFBd0I7UUFBS0EsTUFBSixHQUFhWSxNQUFhWixNQUFiLENBQWI7OztjQUViLElBQUlhLEdBQUosQ0FBVVYsU0FBVixDQUFaO1FBQ01XLFFBQVEsRUFBSUEsT0FBT2QsTUFBWCxFQUFtQkksT0FBbkI7Y0FDRlcsVUFBVSxDQUFDLENBQUViLGNBQWNhLE1BQWQsQ0FBSCxJQUE0QlosVUFBVWEsR0FBVixDQUFjRCxNQUFkLENBRHBDLEVBQWQ7O01BR0dULEdBQUgsRUFBUzthQUFVLEtBQVQ7OztRQUVKVyxTQUFTO1VBQUE7VUFFUGhCLElBQUlELE1BQUosQ0FBV2tCLElBRko7VUFHTixHQUFFakIsSUFBSVUsTUFBTyxJQUFHVixJQUFJRCxNQUFKLENBQVdrQixJQUFLLEdBQUVqQixJQUFJUSxNQUFPLEtBSHZDO2VBSUZSLElBQUlrQixTQUpGO2FBS0pKLFVBQVViLGNBQWNhLE1BQWQsQ0FMTixFQUFmOztNQU9HVCxHQUFILEVBQVM7V0FBUUEsR0FBUCxHQUFhQSxHQUFiOzs7U0FFSGMscUJBQXVCO1NBQUEsRUFDckJILE1BRHFCLEVBQ2JoQixHQURhLEVBQXZCLENBQVA7OztBQUdGLEFBQU8sU0FBU21CLG9CQUFULENBQThCLEVBQUNOLEtBQUQsRUFBUUcsTUFBUixFQUFnQmhCLEdBQWhCLEVBQTlCLEVBQW9EO01BQ3JERixNQUFKO1NBQ08sa0JBQWtCO1VBQ2pCc0IsVUFBVyxrQkFBaUJwQixJQUFJRCxNQUFKLENBQVdrQixJQUFLLE9BQU1JLEtBQUtDLEdBQUwsR0FBV0MsUUFBWCxDQUFvQixFQUFwQixDQUF3QixHQUFoRjtZQUNRQyxHQUFSLENBQWUsWUFBV0osT0FBUSxFQUFsQztZQUNRSyxJQUFSLENBQWdCLFNBQVFMLE9BQVEsRUFBaEM7UUFDSTtZQUNJTSxLQUFOLEdBQWM1QixNQUFkO2NBQ1EyQixJQUFSLENBQWdCLFlBQVdMLE9BQVEsRUFBbkM7ZUFDUyxNQUFNTyxTQUFPZCxLQUFQLENBQWY7Y0FDUWUsT0FBUixDQUFtQixZQUFXUixPQUFRLEVBQXRDO1lBQ010QixPQUFPK0IsS0FBUCxDQUFhYixNQUFiLENBQU47S0FMRixDQU9BLE9BQU1jLEdBQU4sRUFBWTtZQUNKLEVBQUNDLElBQUQsRUFBT0MsR0FBUCxFQUFZQyxLQUFaLEtBQXFCSCxHQUEzQjtZQUNNSSxRQUFRLENBQ1osRUFEWSxFQUVaLEVBRlksRUFHWCxHQUFFSixJQUFJSyxPQUFRLEtBQUlKLElBQUssR0FIWixFQUlYLFNBQVFDLElBQUlJLElBQUssUUFBT0osSUFBSUssSUFBSyxJQUFHTCxJQUFJTSxNQUFPLEdBSnBDLEVBS1osRUFMWSxFQU1aTCxLQU5ZLEVBT1osRUFQWSxFQVFaLEVBUlksQ0FBZDs7Y0FVUU0sS0FBUixDQUFnQkwsTUFBTU0sSUFBTixDQUFXLElBQVgsQ0FBaEI7S0FuQkYsU0FxQlE7Y0FDRVosT0FBUixDQUFtQixTQUFRUixPQUFRLEVBQW5DOztHQTFCSjs7O0FBNkJGLEFBQU8sU0FBU3FCLFFBQVQsQ0FBa0JDLFNBQWxCLEVBQTZCO1NBQzNCQyxRQUFRQyxHQUFSLENBQWNGLFVBQVVHLEdBQVYsQ0FDbkJDLFdBQVdBLFNBRFEsQ0FBZCxDQUFQOzs7QUFJRixBQUFPLFNBQVNDLGFBQVQsR0FBeUI7TUFDMUJDLFdBQVcsRUFBZjtRQUNNQyxPQUFPLEVBQUlDLFNBQUosRUFBZUMsU0FBZixFQUEwQkMsU0FBMUIsRUFBYjtTQUNPSCxJQUFQOztXQUdTRyxTQUFULENBQW1CQyxVQUFuQixFQUErQjthQUNwQkMsSUFBVCxDQUFnQkMsU0FDYkMsS0FEYSxDQUNMSCxVQURLLEVBQ087cUJBQ0osSUFESTs4QkFFSyxJQUZMLEVBRFAsRUFLYkksRUFMYSxDQUtSLFFBTFEsRUFLRUMsV0FBUTtjQUNkbEMsR0FBUixDQUFlLDJDQUEwQ2tDLE9BQUssSUFBOUQ7WUFDTUMsYUFBYVgsUUFBbkI7aUJBQ1csSUFBWDtXQUNJLE1BQU1ZLElBQVYsSUFBa0JELFVBQWxCLEVBQStCO2FBQ3hCRSxLQUFMOztLQVZVLENBQWhCOztXQVlPWixJQUFQOzs7V0FFT0UsU0FBVCxDQUFtQkEsU0FBbkIsRUFBOEJFLFVBQTlCLEVBQTBDO1FBQ3JDUyxNQUFNQyxPQUFOLENBQWNaLFNBQWQsQ0FBSCxFQUE4QjtrQkFDaEJWLFNBQVN1QixJQUFULENBQWdCLElBQWhCLEVBQXNCYixTQUF0QixDQUFaOzs7UUFFQyxlQUFlLE9BQU9BLFNBQXpCLEVBQXFDO1lBQzdCLElBQUk3QyxTQUFKLENBQWlCLDhDQUFqQixDQUFOOzs7UUFFQytDLFVBQUgsRUFBZ0I7Z0JBQWFBLFVBQVo7Ozs7V0FHVkosSUFBUDs7O1dBRU9DLFNBQVQsQ0FBbUJlLE9BQW5CLEVBQTRCWixVQUE1QixFQUF3QztRQUNsQ2EsYUFBYSxLQUFqQjtRQUNHSixNQUFNQyxPQUFOLENBQWNFLE9BQWQsQ0FBSCxFQUE0QjtnQkFDaEJ4QixTQUFTdUIsSUFBVCxDQUFnQixJQUFoQixFQUFzQkMsT0FBdEIsQ0FBVjs7O1FBRUMsZUFBZSxPQUFPQSxPQUF6QixFQUFtQztZQUMzQixJQUFJM0QsU0FBSixDQUFpQiw0Q0FBakIsQ0FBTjs7Ozs7O2FBS09nRCxJQUFULENBQWdCQyxTQUNiQyxLQURhLENBQ0xILFVBREssRUFDTztxQkFDSixJQURJOzhCQUVLLElBRkwsRUFEUCxFQUtiSSxFQUxhLENBS1IsUUFMUSxFQUtFVSxTQUxGLENBQWhCOztXQU9PbEIsSUFBUDs7YUFFU2tCLFNBQVQsQ0FBbUJULE9BQW5CLEVBQXlCOztVQUVwQixVQUFVUSxVQUFiLEVBQTBCO3FCQUNYLElBQWI7bUJBRUUsTUFBTTt1QkFDUyxLQUFiOztTQUZKLEVBSUUsRUFKRixFQUtDRSxLQUxEOzthQU1LbkIsSUFBUDs7Ozs7OzsifQ==
