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
      const { loc, frame } = err;
      if (loc && frame) {
        const lines = ['', '', `${err.message} (${err.code})`, `  in "${loc.file}" at ${loc.line}:${loc.column}"`, '', frame, '', ''];
        console.error(lines.join('\n'));
      } else {
        console.error(err);
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3BhcnNlIGFzIHBhdGhfcGFyc2V9IGZyb20gJ3BhdGgnXG5pbXBvcnQge2V4ZWNTeW5jfSBmcm9tICdjaGlsZF9wcm9jZXNzJ1xuaW1wb3J0IHtyb2xsdXB9IGZyb20gJ3JvbGx1cCdcbmltcG9ydCBjaG9raWRhciBmcm9tICdjaG9raWRhcidcbmltcG9ydCBycGlfYmFiZWwgZnJvbSAncm9sbHVwLXBsdWdpbi1iYWJlbCdcblxuXG5leHBvcnQgZnVuY3Rpb24ganN5X3BsdWdpbihrd2FyZ3MpIDo6XG4gIGNvbnN0IGpzeV9wcmVzZXQgPSBAW10gJ2pzeS9sZWFuJywgQHt9IG5vX3N0YWdlXzM6IHRydWUsIG1vZHVsZXM6IGZhbHNlXG4gIGNvbnN0IHByZXNldHMgPSBbanN5X3ByZXNldF0uY29uY2F0IEAga3dhcmdzLnByZXNldHMgfHwgW11cblxuICBrd2FyZ3MgPSBPYmplY3QuYXNzaWduIEBcbiAgICBAe30gZXhjbHVkZTogJ25vZGVfbW9kdWxlcy8qKidcbiAgICAgICAgYmFiZWxyYzogZmFsc2UsIGhpZ2hsaWdodENvZGU6IGZhbHNlXG4gICAga3dhcmdzXG4gICAgQHt9IHByZXNldHNcblxuICByZXR1cm4gcnBpX2JhYmVsKGt3YXJncylcblxuXG5leHBvcnQgZnVuY3Rpb24gYnVuZGxlKHtzb3VyY2UsIG9wdCwgZ2xvYmFsTW9kdWxlcywgZXh0ZXJuYWxzLCBwbHVnaW5zLCBmb3JtYXQsIGFtZH0pIDo6XG4gIGlmICdzdHJpbmcnICE9PSB0eXBlb2Ygc291cmNlIDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgc3RyaW5nIHNvdXJjZSBwYXJhbWV0ZXJgXG4gIGlmIG51bGwgPT0gb3B0IDo6IHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgdmFsaWQgXCJvcHRcIiBvYmplY3QgcGFyYW1ldGVyYFxuICBvcHQgPSBPYmplY3QuY3JlYXRlIEAgb3B0IC8vIERvbid0IG1vZGlmeSB0aGUgdW5kZXJseWluZyBvYmplY3RcbiAgaWYgbnVsbCA9PSBnbG9iYWxNb2R1bGVzIDo6IGdsb2JhbE1vZHVsZXMgPSBvcHQuZ2xvYmFsTW9kdWxlcyB8fCB7fVxuICBpZiBudWxsID09IGV4dGVybmFscyA6OiBleHRlcm5hbHMgPSBvcHQuZXh0ZXJuYWxzIHx8IFtdXG4gIGlmIG51bGwgPT0gcGx1Z2lucyA6OiBwbHVnaW5zID0gb3B0LnBsdWdpbnMgfHwgW11cbiAgaWYgbnVsbCA9PSBmb3JtYXQgOjogZm9ybWF0ID0gb3B0LmZvcm1hdCB8fCAnaWlmZSdcbiAgaWYgbnVsbCA9PSBvcHQuc3VmZml4IDo6IG9wdC5zdWZmaXggPSBvcHQucHJvZHVjdGlvbiA/ICcubWluJyA6ICcnXG4gIGlmIG51bGwgPT0gb3B0Lm91dGRpciA6OiBvcHQub3V0ZGlyID0gJy4vZGlzdC9wdWJsaWMnXG4gIGlmIG51bGwgPT0gb3B0LnNvdXJjZSA6OiBvcHQuc291cmNlID0gcGF0aF9wYXJzZSBAIHNvdXJjZVxuXG4gIGV4dGVybmFscyA9IG5ldyBTZXQgQCBleHRlcm5hbHNcbiAgY29uc3QgaW5wdXQgPSBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICBleHRlcm5hbDogbW9kdWxlID0+ICEhIGdsb2JhbE1vZHVsZXNbbW9kdWxlXSB8fCBleHRlcm5hbHMuaGFzKG1vZHVsZSlcblxuICBpZiBhbWQgOjogZm9ybWF0ID0gJ2FtZCdcblxuICBjb25zdCBvdXRwdXQgPSBAe31cbiAgICBmb3JtYXRcbiAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICBmaWxlOiBgJHtvcHQub3V0ZGlyfS8ke29wdC5zb3VyY2UubmFtZX0ke29wdC5zdWZmaXh9LmpzYFxuICAgIHNvdXJjZW1hcDogb3B0LnNvdXJjZW1hcFxuICAgIGdsb2JhbHM6IG1vZHVsZSA9PiBnbG9iYWxNb2R1bGVzW21vZHVsZV1cblxuICBpZiBhbWQgOjogb3V0cHV0LmFtZCA9IGFtZFxuXG4gIHJldHVybiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5leHBvcnQgZnVuY3Rpb24gYXNSb2xsdXBCdWlsZENsb3N1cmUoe2lucHV0LCBvdXRwdXQsIG9wdH0pIDo6XG4gIGxldCBidW5kbGVcbiAgcmV0dXJuIGFzeW5jIGZ1bmN0aW9uICgpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcblxuICAgIGNhdGNoIGVyciA6OlxuICAgICAgY29uc3Qge2xvYywgZnJhbWV9ID0gZXJyXG4gICAgICBpZiBsb2MgJiYgZnJhbWUgOjpcbiAgICAgICAgY29uc3QgbGluZXMgPSBAW11cbiAgICAgICAgICAnJ1xuICAgICAgICAgICcnXG4gICAgICAgICAgYCR7ZXJyLm1lc3NhZ2V9ICgke2Vyci5jb2RlfSlgXG4gICAgICAgICAgYCAgaW4gXCIke2xvYy5maWxlfVwiIGF0ICR7bG9jLmxpbmV9OiR7bG9jLmNvbHVtbn1cImBcbiAgICAgICAgICAnJ1xuICAgICAgICAgIGZyYW1lXG4gICAgICAgICAgJydcbiAgICAgICAgICAnJ1xuICAgICAgICBjb25zb2xlLmVycm9yIEAgbGluZXMuam9pbignXFxuJylcbiAgICAgIGVsc2UgOjpcbiAgICAgICAgY29uc29sZS5lcnJvciBAIGVyclxuXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQWxsKGJ1aWxkTGlzdCkgOjpcbiAgcmV0dXJuIFByb21pc2UuYWxsIEAgYnVpbGRMaXN0Lm1hcCBAXG4gICAgYnVpbGRlciA9PiBidWlsZGVyKClcblxuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hBbmRCdWlsZChvbl9yZXN0YXJ0KSA6OlxuICBpZiBvbl9yZXN0YXJ0ICYmICdmdW5jdGlvbicgIT09IHR5cGVvZiBvbl9yZXN0YXJ0IDo6XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBvbl9yZXN0YXJ0IHRvIGJlIGEgZnVuY3Rpb25gXG5cbiAgbGV0IHdhdGNoZXJzID0gW11cbiAgY29uc3Qgc2VsZiA9IEB7fSByZWJ1aWxkT24sIGJ1aWxkT25jZSwgcmVzdGFydE9uXG4gIHJldHVybiBzZWxmXG5cblxuICBmdW5jdGlvbiByZXN0YXJ0T24od2F0Y2hfZ2xvYikgOjpcbiAgICB3YXRjaGVycy5wdXNoIEAgY2hva2lkYXJcbiAgICAgIC53YXRjaCBAIHdhdGNoX2dsb2IsIEB7fVxuICAgICAgICBpZ25vcmVJbml0aWFsOiB0cnVlXG4gICAgICAgIGlnbm9yZVBlcm1pc3Npb25FcnJvcnM6IHRydWVcblxuICAgICAgLm9uIEAgJ2NoYW5nZScsIHBhdGggPT4gOjpcbiAgICAgICAgaWYgISB3YXRjaGVycyA6OiByZXR1cm5cbiAgICAgICAgY29uc29sZS5sb2cgQCBgU2V0dXAgY2hhbmdlZDsgc2h1dHRpbmcgZG93biB3YXRjaGVycyAoXCIke3BhdGh9XCIpYFxuICAgICAgICBjb25zdCBsX3dhdGNoZXJzID0gd2F0Y2hlcnNcbiAgICAgICAgd2F0Y2hlcnMgPSBudWxsXG4gICAgICAgIGZvciBjb25zdCBlYWNoIG9mIGxfd2F0Y2hlcnMgOjpcbiAgICAgICAgICBlYWNoLmNsb3NlKClcblxuICAgICAgICBpZiBvbl9yZXN0YXJ0IDo6IG9uX3Jlc3RhcnQocGF0aClcblxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gYnVpbGRPbmNlKGJ1aWxkT25jZSwgd2F0Y2hfZ2xvYikgOjpcbiAgICBpZiBBcnJheS5pc0FycmF5KGJ1aWxkT25jZSkgOjpcbiAgICAgIGJ1aWxkT25jZSA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCBidWlsZE9uY2VcblxuICAgIGlmICdmdW5jdGlvbicgIT09IHR5cGVvZiBidWlsZE9uY2UgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgYnVpbGRPbmNlIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICBpZiB3YXRjaF9nbG9iIDo6IHJlc3RhcnRPbiBAIHdhdGNoX2dsb2JcblxuICAgIGJ1aWxkT25jZSgpXG4gICAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiByZWJ1aWxkT24ocmVidWlsZCwgd2F0Y2hfZ2xvYikgOjpcbiAgICBsZXQgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgaWYgQXJyYXkuaXNBcnJheShyZWJ1aWxkKSA6OlxuICAgICAgcmVidWlsZCA9IGJ1aWxkQWxsLmJpbmQgQCBudWxsLCByZWJ1aWxkXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVidWlsZCA6OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCByZWJ1aWxkIHRvIGJlIGEgZnVuY3Rpb24gb3IgYXJyYXlgXG5cbiAgICAvLyBpbnZva2UgaW5pdGlhbCBidWlsZFxuICAgIHJlYnVpbGQoKVxuXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBfZGVib3VuY2VcblxuICAgIHJldHVybiBzZWxmXG5cbiAgICBmdW5jdGlvbiBfZGVib3VuY2UocGF0aCkgOjpcbiAgICAgIC8vIGRlYm91bmNlIHJhcGlkIHVwZGF0ZXNcbiAgICAgIGlmIGZhbHNlID09PSBpbnByb2dyZXNzIDo6XG4gICAgICAgIGlucHJvZ3Jlc3MgPSB0cnVlXG4gICAgICAgIHNldFRpbWVvdXQgQFxuICAgICAgICAgICgpID0+IDo6XG4gICAgICAgICAgICBpbnByb2dyZXNzID0gZmFsc2VcbiAgICAgICAgICAgIHJlYnVpbGQoKVxuICAgICAgICAgIDUwXG4gICAgICAgIC51bnJlZigpXG4gICAgICByZXR1cm4gc2VsZlxuXG5cbndhdGNoQW5kQnVpbGQuZm9yZXZlciA9IGZ1bmN0aW9uKGNvbW1hbmQ9YGJhYmVsLW5vZGUgcm9sbHVwLmNmZy5qc3kgLS13YXRjaC1pbXBsYCkgOjpcbiAgd2hpbGUgdHJ1ZSA6OlxuICAgIGV4ZWNTeW5jIEAgY29tbWFuZCwgQHt9IHN0ZGlvOiAnaW5oZXJpdCdcbiAgICBjb25zb2xlLmxvZyBAIGBcXG5cXG5SZXN0YXJ0aW5nIHJvbGx1cCB3YXRjaFxcblxcbmBcblxuIl0sIm5hbWVzIjpbImpzeV9wbHVnaW4iLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJwcmVzZXRzIiwiY29uY2F0IiwiT2JqZWN0IiwiYXNzaWduIiwiZXhjbHVkZSIsImhpZ2hsaWdodENvZGUiLCJycGlfYmFiZWwiLCJidW5kbGUiLCJzb3VyY2UiLCJvcHQiLCJnbG9iYWxNb2R1bGVzIiwiZXh0ZXJuYWxzIiwicGx1Z2lucyIsImZvcm1hdCIsImFtZCIsIlR5cGVFcnJvciIsImNyZWF0ZSIsInN1ZmZpeCIsInByb2R1Y3Rpb24iLCJvdXRkaXIiLCJwYXRoX3BhcnNlIiwiU2V0IiwiaW5wdXQiLCJtb2R1bGUiLCJoYXMiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwiYXNSb2xsdXBCdWlsZENsb3N1cmUiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsImNhY2hlIiwicm9sbHVwIiwidGltZUVuZCIsIndyaXRlIiwiZXJyIiwibG9jIiwiZnJhbWUiLCJsaW5lcyIsIm1lc3NhZ2UiLCJjb2RlIiwiZmlsZSIsImxpbmUiLCJjb2x1bW4iLCJlcnJvciIsImpvaW4iLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsIm9uX3Jlc3RhcnQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwicHVzaCIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsInBhdGgiLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzIiwiX2RlYm91bmNlIiwidW5yZWYiLCJmb3JldmVyIiwiY29tbWFuZCIsInN0ZGlvIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFPTyxTQUFTQSxVQUFULENBQW9CQyxNQUFwQixFQUE0QjtRQUMzQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtRQUNNQyxVQUFVLENBQUNILFVBQUQsRUFBYUksTUFBYixDQUFzQkwsT0FBT0ksT0FBUCxJQUFrQixFQUF4QyxDQUFoQjs7V0FFU0UsT0FBT0MsTUFBUCxDQUNQLEVBQUlDLFNBQVMsaUJBQWI7YUFDYSxLQURiLEVBQ29CQyxlQUFlLEtBRG5DLEVBRE8sRUFHUFQsTUFITyxFQUlQLEVBQUlJLE9BQUosRUFKTyxDQUFUOztTQU1PTSxVQUFVVixNQUFWLENBQVA7OztBQUdGLEFBQU8sU0FBU1csTUFBVCxDQUFnQixFQUFDQyxNQUFELEVBQVNDLEdBQVQsRUFBY0MsYUFBZCxFQUE2QkMsU0FBN0IsRUFBd0NDLE9BQXhDLEVBQWlEQyxNQUFqRCxFQUF5REMsR0FB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
