import { parse } from 'path';
import { execSync } from 'child_process';
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

function watchAndBuild(on_restart) {
  if (on_restart && 'function' !== typeof on_restart) {
    throw new TypeError(`Expected on_restart to be a function`);
  }

  let watchers = [];
  const self = { rebuildOn, buildOnce, restartOn };
  return self;

  function restartOn(watch_glob) {
    watchers.push(chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', path$$1 => {
      if (!watchers) {
        return;
      }
      console.log(`Setup changed; shutting down watchers ("${path$$1}")`);
      const l_watchers = watchers;
      watchers = null;
      for (const each of l_watchers) {
        each.close();
      }

      if (on_restart) {
        on_restart(path$$1);
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

watchAndBuild.forever = function (command = `babel-node rollup.cfg.jsy --watch-impl`) {
  while (true) {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n\nRestarting rollup watch\n\n`);
  }
};

export { jsy_plugin, bundle, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge2V4ZWNTeW5jfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0IHtyb2xsdXB9IGZyb20gJ3JvbGx1cCdcbmltcG9ydCBjaG9raWRhciBmcm9tICdjaG9raWRhcidcbmltcG9ydCBycGlfYmFiZWwgZnJvbSAncm9sbHVwLXBsdWdpbi1iYWJlbCdcblxuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbihrd2FyZ3MpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIGNvbnN0IHByZXNldHMgPSBbanN5X3ByZXNldF0uY29uY2F0IEAga3dhcmdzLnByZXNldHMgfHwgW11cblxuICBrd2FyZ3MgPSBPYmplY3QuYXNzaWduIEBcbiAgICBAe30gZXhjbHVkZTogJ25vZGVfbW9kdWxlcy8qKidcbiAgICAgICAgYmFiZWxyYzogZmFsc2UsIGhpZ2hsaWdodENvZGU6IGZhbHNlXG4gICAga3dhcmdzXG4gICAgQHt9IHByZXNldHNcblxuICByZXR1cm4gcnBpX2JhYmVsKGt3YXJncylcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVuZGxlKHtzb3VyY2UsIG9wdCwgZ2xvYmFsTW9kdWxlcywgZXh0ZXJuYWxzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuY3JlYXRlIEAgb3B0IC8vIERvbid0IG1vZGlmeSB0aGUgdW5kZXJseWluZyBvYmplY3RcbiAgaWYgbnVsbCA9PSBnbG9iYWxNb2R1bGVzIDo6IGdsb2JhbE1vZHVsZXMgPSBvcHQuZ2xvYmFsTW9kdWxlcyB8fCB7fVxuICBpZiBudWxsID09IGV4dGVybmFscyA6OiBleHRlcm5hbHMgPSBvcHQuZXh0ZXJuYWxzIHx8IFtdXG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBmb3JtYXQgOjogZm9ybWF0ID0gb3B0LmZvcm1hdCB8fCAnaWlmZSdcbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGV4dGVybmFscyA9IG5ldyBTZXQgQCBleHRlcm5hbHNcbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXSB8fCBleHRlcm5hbHMuaGFzKG1vZHVsZSlcblxuICBpZiBhbWQgOjogZm9ybWF0ID0gJ2FtZCdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcblxuICAgIGNhdGNoIGVyciA6OlxuICAgICAgY29uc3Qge2NvZGUsIGxvYywgZnJhbWV9ID0gZXJyXG4gICAgICBjb25zdCBsaW5lcyA9IEBbXVxuICAgICAgICAnJ1xuICAgICAgICAnJ1xuICAgICAgICBgJHtlcnIubWVzc2FnZX0gKCR7Y29kZX0pYFxuICAgICAgICBgICBpbiBcIiR7bG9jLmZpbGV9XCIgYXQgJHtsb2MubGluZX06JHtsb2MuY29sdW1ufVwiYFxuICAgICAgICAnJ1xuICAgICAgICBmcmFtZVxuICAgICAgICAnJ1xuICAgICAgICAnJ1xuXG4gICAgICBjb25zb2xlLmVycm9yIEAgbGluZXMuam9pbignXFxuJylcblxuICAgIGZpbmFsbHkgOjpcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBCdWlsdCAke2xvZ19tc2d9YFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQob25fcmVzdGFydCkgOjpcbiAgaWYgb25fcmVzdGFydCAmJiAnZnVuY3Rpb24nICE9PSB0eXBlb2Ygb25fcmVzdGFydCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgb25fcmVzdGFydCB0byBiZSBhIGZ1bmN0aW9uYFxuXG4gIGxldCB3YXRjaGVycyA9IFtdXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCBidWlsZE9uY2UsIHJlc3RhcnRPblxuICByZXR1cm4gc2VsZlxuXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGlmICEgd2F0Y2hlcnMgOjogcmV0dXJuXG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICAgICAgaWYgb25fcmVzdGFydCA6OiBvbl9yZXN0YXJ0KHBhdGgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIGJ1aWxkT25jZShidWlsZE9uY2UsIHdhdGNoX2dsb2IpIDo6XG4gICAgaWYgQXJyYXkuaXNBcnJheShidWlsZE9uY2UpIDo6XG4gICAgICBidWlsZE9uY2UgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgYnVpbGRPbmNlXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgYnVpbGRPbmNlIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIGJ1aWxkT25jZSB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgaWYgd2F0Y2hfZ2xvYiA6OiByZXN0YXJ0T24gQCB3YXRjaF9nbG9iXG5cbiAgICBidWlsZE9uY2UoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHJlYnVpbGQsIHdhdGNoX2dsb2IpIDo6XG4gICAgbGV0IGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgICByZWJ1aWxkKClcblxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gICAgZnVuY3Rpb24gX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBmYWxzZSA9PT0gaW5wcm9ncmVzcyA6OlxuICAgICAgICBpbnByb2dyZXNzID0gdHJ1ZVxuICAgICAgICBzZXRUaW1lb3V0IEBcbiAgICAgICAgICAoKSA9PiA6OlxuICAgICAgICAgICAgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgICAgICAgICByZWJ1aWxkKClcbiAgICAgICAgICA1MFxuICAgICAgICAudW5yZWYoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuXG53YXRjaEFuZEJ1aWxkLmZvcmV2ZXIgPSBmdW5jdGlvbihjb21tYW5kPWBiYWJlbC1ub2RlIHJvbGx1cC5jZmcuanN5IC0td2F0Y2gtaW1wbGApIDo6XG4gIHdoaWxlIHRydWUgOjpcbiAgICBleGVjU3luYyBAIGNvbW1hbmQsIEB7fSBzdGRpbzogJ2luaGVyaXQnXG4gICAgY29uc29sZS5sb2cgQCBgXFxuXFxuUmVzdGFydGluZyByb2xsdXAgd2F0Y2hcXG5cXG5gXG5cbiJdLCJuYW1lcyI6WyJqc3lfcGx1Z2luIiwia3dhcmdzIiwianN5X3ByZXNldCIsIm5vX3N0YWdlXzMiLCJtb2R1bGVzIiwicHJlc2V0cyIsImNvbmNhdCIsIk9iamVjdCIsImFzc2lnbiIsImV4Y2x1ZGUiLCJoaWdobGlnaHRDb2RlIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsImV4dGVybmFscyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsIlNldCIsImlucHV0IiwibW9kdWxlIiwiaGFzIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJjYWNoZSIsInJvbGx1cCIsInRpbWVFbmQiLCJ3cml0ZSIsImVyciIsImNvZGUiLCJsb2MiLCJmcmFtZSIsImxpbmVzIiwibWVzc2FnZSIsImZpbGUiLCJsaW5lIiwiY29sdW1uIiwiZXJyb3IiLCJqb2luIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJvbl9yZXN0YXJ0Iiwid2F0Y2hlcnMiLCJzZWxmIiwicmVidWlsZE9uIiwiYnVpbGRPbmNlIiwicmVzdGFydE9uIiwid2F0Y2hfZ2xvYiIsInB1c2giLCJjaG9raWRhciIsIndhdGNoIiwib24iLCJwYXRoIiwibF93YXRjaGVycyIsImVhY2giLCJjbG9zZSIsIkFycmF5IiwiaXNBcnJheSIsImJpbmQiLCJyZWJ1aWxkIiwiaW5wcm9ncmVzcyIsIl9kZWJvdW5jZSIsInVucmVmIiwiZm9yZXZlciIsImNvbW1hbmQiLCJzdGRpbyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBT08sU0FBU0EsVUFBVCxDQUFvQkMsTUFBcEIsRUFBNEI7UUFDM0JDLGFBQWEsQ0FBSSxVQUFKLEVBQWdCLEVBQUlDLFlBQVksSUFBaEIsRUFBc0JDLFNBQVMsS0FBL0IsRUFBaEIsQ0FBbkI7UUFDTUMsVUFBVSxDQUFDSCxVQUFELEVBQWFJLE1BQWIsQ0FBc0JMLE9BQU9JLE9BQVAsSUFBa0IsRUFBeEMsQ0FBaEI7O1dBRVNFLE9BQU9DLE1BQVAsQ0FDUCxFQUFJQyxTQUFTLGlCQUFiO2FBQ2EsS0FEYixFQUNvQkMsZUFBZSxLQURuQyxFQURPLEVBR1BULE1BSE8sRUFJUCxFQUFJSSxPQUFKLEVBSk8sQ0FBVDs7U0FNT00sVUFBVVYsTUFBVixDQUFQOzs7QUFHRixBQUFPLFNBQVNXLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJDLFNBQTdCLEVBQXdDQyxPQUF4QyxFQUFpREMsTUFBakQsRUFBeURDLEdBQXpELEVBQWhCLEVBQStFO01BQ2pGLGFBQWEsT0FBT04sTUFBdkIsRUFBZ0M7VUFBTyxJQUFJTyxTQUFKLENBQWlCLGtDQUFqQixDQUFOOztNQUM5QixR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
