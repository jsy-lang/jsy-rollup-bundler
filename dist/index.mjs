import { rollup as rollup$1 } from 'rollup';
import chokidar from 'chokidar';

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

export { bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuXG5leHBvcnQgZnVuY3Rpb24gYnVuZGxlKHtzb3VyY2UsIG9wdCwgZ2xvYmFsTW9kdWxlcywgcGx1Z2lucywgZm9ybWF0LCBhbWR9KSA6OlxuICBpZiAnc3RyaW5nJyAhPT0gdHlwZW9mIHNvdXJjZSA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHN0cmluZyBzb3VyY2UgcGFyYW1ldGVyYFxuICBpZiBudWxsID09IG9wdCA6OiB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIHZhbGlkIFwib3B0XCIgb2JqZWN0IHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBnbG9iYWxNb2R1bGVzIDo6IGdsb2JhbE1vZHVsZXMgPSB7fVxuICBpZiBudWxsID09IHBsdWdpbnMgOjogcGx1Z2lucyA9IFtdXG4gIGlmIG51bGwgPT0gb3B0LnN1ZmZpeCA6OiBvcHQuc3VmZml4ID0gb3B0LnByb2R1Y3Rpb24gPyAnLm1pbicgOiAnJ1xuICBpZiBudWxsID09IG9wdC5vdXRkaXIgOjogb3B0Lm91dGRpciA9ICcuL2Rpc3QvcHVibGljJ1xuXG4gIGNvbnN0IGlucHV0ID0gQHt9XG4gICAgcGx1Z2luc1xuICAgIGlucHV0OiBzb3VyY2VcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmICEgZm9ybWF0IDo6XG4gICAgZm9ybWF0ID0gYW1kID8gJ2FtZCcgOiAnaWlmZSdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHMobW9kdWxlKSA6OlxuICAgICAgcmV0dXJuIGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmIGFtZCAmJiAnYW1kJyA9PT0gZm9ybWF0IDo6IG91dHB1dC5hbWQgPSBhbWRcblxuICByZXR1cm4gYXNSb2xsdXBCdWlsZENsb3N1cmUgQDpcbiAgICBpbnB1dCwgb3V0cHV0LCBvcHRcblxuZXhwb3J0IGZ1bmN0aW9uIGFzUm9sbHVwQnVpbGRDbG9zdXJlKHtpbnB1dCwgb3V0cHV0LCBvcHR9KSA6OlxuICBsZXQgYnVuZGxlXG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiAoKSA6OlxuICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgcm9sbHVwIGJ1bmRsZSBcIiR7b3B0LnNvdXJjZS5uYW1lfVwiYFxuICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICBhd2FpdCBidW5kbGUud3JpdGUob3V0cHV0KVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRBbGwoYnVpbGRMaXN0KSA6OlxuICByZXR1cm4gUHJvbWlzZS5hbGwgQCBidWlsZExpc3QubWFwIEBcbiAgICBidWlsZGVyID0+IGJ1aWxkZXIoKVxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChyZWJ1aWxkKSA6OlxuICBsZXQgaW5wcm9ncmVzc19jaGFuZ2VzID0gbnVsbFxuICBsZXQgd2F0Y2hlcnMgPSBbXVxuXG4gIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICBjb25zdCByZWJ1aWxkTGlzdCA9IHJlYnVpbGRcbiAgICByZWJ1aWxkID0gYXN5bmMgKCkgPT4gOjpcbiAgICAgIGNvbnN0IG1zZyA9ICdSZWJ1aWxkaW5nIGZvciBjaGFuZ2VzJ1xuICAgICAgY29uc29sZS50aW1lKG1zZylcbiAgICAgIHRyeSA6OlxuICAgICAgICBhd2FpdCBidWlsZEFsbCBAIHJlYnVpbGRMaXN0XG4gICAgICAgIGNvbnNvbGUudGltZUVuZChtc2cpXG4gICAgICBjYXRjaCBlcnIgOjpcbiAgICAgICAgY29uc29sZS5lcnJvciBAIGVyclxuXG4gIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiByZWJ1aWxkIDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIHJlc3RhcnRPblxuICByZXR1cm4gc2VsZlxuXG4gIGFzeW5jIGZ1bmN0aW9uIF9yZWJ1aWxkX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgOjogLy8gZGVib3VuY2UgcmFwaWQgdXBkYXRlc1xuICAgICAgaWYgbnVsbCAhPT0gaW5wcm9ncmVzc19jaGFuZ2VzIDo6XG4gICAgICAgIHJldHVybiBpbnByb2dyZXNzX2NoYW5nZXMucHVzaChwYXRoKVxuXG4gICAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBbcGF0aF1cbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlIEAgcmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwKS51bnJlZigpXG4gICAgICBpbnByb2dyZXNzX2NoYW5nZXMgPSBudWxsXG5cbiAgICByZXR1cm4gcmVidWlsZCgpXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfcmVidWlsZF9kZWJvdW5jZVxuXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgIHJldHVybiBzZWxmXG5cbiJdLCJuYW1lcyI6WyJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJpbnB1dCIsIm1vZHVsZSIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImNhY2hlIiwibG9nIiwicm9sbHVwIiwid3JpdGUiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzX2NoYW5nZXMiLCJ3YXRjaGVycyIsIkFycmF5IiwiaXNBcnJheSIsInJlYnVpbGRMaXN0IiwibXNnIiwidGltZSIsInRpbWVFbmQiLCJlcnIiLCJlcnJvciIsInNlbGYiLCJyZWJ1aWxkT24iLCJyZXN0YXJ0T24iLCJfcmVidWlsZF9kZWJvdW5jZSIsInBhdGgiLCJwdXNoIiwicmVzb2x2ZSIsInNldFRpbWVvdXQiLCJ1bnJlZiIsIndhdGNoX2dsb2IiLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNs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
