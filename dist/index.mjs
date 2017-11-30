import { parse } from 'path';
import { rollup as rollup$1 } from 'rollup';
import chokidar from 'chokidar';
import rpi_babel from 'rollup-plugin-babel';

function jsy_plugin(kwargs) {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  const presets = [jsy_preset].concat(kwargs.presets || []);
  //const plugins = [].concat @ kwargs.plugins || []

  kwargs = Object.assign({ exclude: 'node_modules/**',
    babelrc: false, highlightCode: false }, kwargs, { presets, plugins });

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbihrd2FyZ3MpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIGNvbnN0IHByZXNldHMgPSBbanN5X3ByZXNldF0uY29uY2F0IEAga3dhcmdzLnByZXNldHMgfHwgW11cbiAgLy9jb25zdCBwbHVnaW5zID0gW10uY29uY2F0IEAga3dhcmdzLnBsdWdpbnMgfHwgW11cblxuICBrd2FyZ3MgPSBPYmplY3QuYXNzaWduIEBcbiAgICBAe30gZXhjbHVkZTogJ25vZGVfbW9kdWxlcy8qKidcbiAgICAgICAgYmFiZWxyYzogZmFsc2UsIGhpZ2hsaWdodENvZGU6IGZhbHNlXG4gICAga3dhcmdzXG4gICAgQHt9IHByZXNldHMsIHBsdWdpbnNcblxuICByZXR1cm4gcnBpX2JhYmVsKGt3YXJncylcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1bmRsZSh7c291cmNlLCBvcHQsIGdsb2JhbE1vZHVsZXMsIGV4dGVybmFscywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgb3B0ID0gT2JqZWN0LmNyZWF0ZSBAIG9wdCAvLyBEb24ndCBtb2RpZnkgdGhlIHVuZGVybHlpbmcgb2JqZWN0XG4gIGlmIG51bGwgPT0gZ2xvYmFsTW9kdWxlcyA6OiBnbG9iYWxNb2R1bGVzID0gb3B0Lmdsb2JhbE1vZHVsZXMgfHwge31cbiAgaWYgbnVsbCA9PSBleHRlcm5hbHMgOjogZXh0ZXJuYWxzID0gb3B0LmV4dGVybmFscyB8fCBbXVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IG9wdC5wbHVnaW5zIHx8IFtdXG4gIGlmIG51bGwgPT0gZm9ybWF0IDo6IGZvcm1hdCA9IG9wdC5mb3JtYXQgfHwgJ2lpZmUnXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuICBpZiBudWxsID09IG9wdC5zb3VyY2UgOjogb3B0LnNvdXJjZSA9IHBhdGhfcGFyc2UgQCBzb3VyY2VcblxuICBleHRlcm5hbHMgPSBuZXcgU2V0IEAgZXh0ZXJuYWxzXG4gIGNvbnN0IGlucHV0ID0gQHt9IGlucHV0OiBzb3VyY2UsIHBsdWdpbnMsXG4gICAgZXh0ZXJuYWw6IG1vZHVsZSA9PiAhISBnbG9iYWxNb2R1bGVzW21vZHVsZV0gfHwgZXh0ZXJuYWxzLmhhcyhtb2R1bGUpXG5cbiAgaWYgYW1kIDo6IGZvcm1hdCA9ICdhbWQnXG5cbiAgY29uc3Qgb3V0cHV0ID0gQHt9XG4gICAgZm9ybWF0XG4gICAgbmFtZTogb3B0LnNvdXJjZS5uYW1lXG4gICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICBzb3VyY2VtYXA6IG9wdC5zb3VyY2VtYXBcbiAgICBnbG9iYWxzOiBtb2R1bGUgPT4gZ2xvYmFsTW9kdWxlc1ttb2R1bGVdXG5cbiAgaWYgYW1kIDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gYXNSb2xsdXBCdWlsZENsb3N1cmUgQDpcbiAgICBpbnB1dCwgb3V0cHV0LCBvcHRcblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKHtpbnB1dCwgb3V0cHV0LCBvcHR9KSA6OlxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiAoKSA6OlxuICAgIGNvbnN0IGxvZ19tc2cgPSBgcm9sbHVwIGJ1bmRsZSBcIiR7b3B0LnNvdXJjZS5uYW1lfVwiIChAJHtEYXRlLm5vdygpLnRvU3RyaW5nKDM2KX0pYFxuICAgIGNvbnNvbGUubG9nIEAgYEJ1aWxkaW5nICR7bG9nX21zZ31gXG4gICAgY29uc29sZS50aW1lIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG4gICAgdHJ5IDo6XG4gICAgICBpbnB1dC5jYWNoZSA9IGJ1bmRsZVxuICAgICAgY29uc29sZS50aW1lIEAgYENvbXBpbGVkICR7bG9nX21zZ31gXG4gICAgICBidW5kbGUgPSBhd2FpdCByb2xsdXAoaW5wdXQpXG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG5cbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGNvbnN0IHtjb2RlLCBsb2MsIGZyYW1lfSA9IGVyclxuICAgICAgY29uc3QgbGluZXMgPSBAW11cbiAgICAgICAgJydcbiAgICAgICAgJydcbiAgICAgICAgYCR7ZXJyLm1lc3NhZ2V9ICgke2NvZGV9KWBcbiAgICAgICAgYCAgaW4gXCIke2xvYy5maWxlfVwiIGF0ICR7bG9jLmxpbmV9OiR7bG9jLmNvbHVtbn1cImBcbiAgICAgICAgJydcbiAgICAgICAgZnJhbWVcbiAgICAgICAgJydcbiAgICAgICAgJydcblxuICAgICAgY29uc29sZS5lcnJvciBAIGxpbmVzLmpvaW4oJ1xcbicpXG5cbiAgICBmaW5hbGx5IDo6XG4gICAgICBjb25zb2xlLnRpbWVFbmQgQCBgQnVpbHQgJHtsb2dfbXNnfWBcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaEFuZEJ1aWxkKCkgOjpcbiAgbGV0IHdhdGNoZXJzID0gW11cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIGJ1aWxkT25jZSwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICAgIHJlYnVpbGQoKVxuXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIHJlYnVpbGQoKVxuICAgICAgICAgIDUwXG4gICAgICAgIC51bnJlZigpXG4gICAgICByZXR1cm4gc2VsZlxuXG4iXSwibmFtZXMiOlsianN5X3BsdWdpbiIsImt3YXJncyIsImpzeV9wcmVzZXQiLCJub19zdGFnZV8zIiwibW9kdWxlcyIsInByZXNldHMiLCJjb25jYXQiLCJPYmplY3QiLCJhc3NpZ24iLCJleGNsdWRlIiwiaGlnaGxpZ2h0Q29kZSIsInBsdWdpbnMiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwiZXh0ZXJuYWxzIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiY3JlYXRlIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJTZXQiLCJpbnB1dCIsIm1vZHVsZSIsImhhcyIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImxvZ19tc2ciLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJsb2ciLCJ0aW1lIiwiY2FjaGUiLCJyb2xsdXAiLCJ0aW1lRW5kIiwid3JpdGUiLCJlcnIiLCJjb2RlIiwibG9jIiwiZnJhbWUiLCJsaW5lcyIsIm1lc3NhZ2UiLCJmaWxlIiwibGluZSIsImNvbHVtbiIsImVycm9yIiwiam9pbiIsImJ1aWxkQWxsIiwiYnVpbGRMaXN0IiwiUHJvbWlzZSIsImFsbCIsIm1hcCIsImJ1aWxkZXIiLCJ3YXRjaEFuZEJ1aWxkIiwid2F0Y2hlcnMiLCJzZWxmIiwicmVidWlsZE9uIiwiYnVpbGRPbmNlIiwicmVzdGFydE9uIiwid2F0Y2hfZ2xvYiIsInB1c2giLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJwYXRoIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzcyIsIl9kZWJvdW5jZSIsInVucmVmIl0sIm1hcHBpbmdzIjoiOzs7OztBQUtPLFNBQVNBLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFB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
