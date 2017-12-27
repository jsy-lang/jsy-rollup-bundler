import { inspect, promisify } from 'util';
import { writeFile } from 'fs';
import { parse } from 'path';
import { execSync } from 'child_process';
import { rollup as rollup$1 } from 'rollup';
import chokidar from 'chokidar';
import rpi_babel from 'rollup-plugin-babel';

const writeFile_p = promisify(writeFile);

function jsy_plugin(kwargs) {
  const jsy_preset = ['jsy/lean', { no_stage_3: true, modules: false }];
  const presets = [jsy_preset].concat(kwargs.presets || []);

  kwargs = Object.assign({ exclude: 'node_modules/**', babelrc: false, highlightCode: true }, kwargs, { presets });

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

  if ('function' !== typeof globalModules) {
    const l_globalModules = globalModules;
    globalModules = module => l_globalModules[module];
  }

  externals = new Set(externals);
  const input = Object.assign({ input: source, plugins,
    external: module => !!globalModules(module) || externals.has(module) }, opt.input_options);

  if (amd) {
    format = 'amd';
  }

  const output = Object.assign({ format,
    name: opt.source.name,
    file: `${opt.outdir}/${opt.source.name}${opt.suffix}.js`,
    sourcemap: opt.sourcemap,
    globals: globalModules }, opt.output_options);

  if (amd) {
    output.amd = amd;
  }

  return (opt.buildClosure || asRollupBuildClosure)({
    input, output, opt });
}

function formatBuildError(err, join) {
  const { loc, frame, codeFrame } = err;
  if (!(loc || frame || codeFrame)) {
    return;
  }

  const colors = /\[\d+m/.test(frame || codeFrame || '');
  const hl = v => inspect(v, { colors });

  const lines = [];
  let msg = err.message;
  if (err.id) {
    // simplify output by splitting err.id to distinct line
    msg = msg.replace(`${err.id}: `, '');
  }

  lines.push(`BuildError: ${hl(msg)}`);

  if (loc) {
    lines.push(`  in ${hl(loc.file)} at ${hl(loc.line)}:${hl(loc.column)}`);
  }
  if (err.id) {
    lines.push(`  id: ${hl(err.id)}`);
  }
  if (err.code) {
    lines.push(`  code: ${hl(err.code)}`);
  }

  if (frame || codeFrame) {
    lines.push('', frame || codeFrame);
  }

  if (true === join) {
    return lines.join('\n');
  } else if (join) {
    return lines.join(join);
  } else return lines;
}

function asRollupBuildClosure(buildCtx) {
  const { input, output, opt } = buildCtx;
  const err_outfile = `${output.file}.error`;
  let bundle;
  return opt.no_timing ? build : buildWithTiming;

  async function build() {
    try {
      input.cache = bundle;
      bundle = await rollup$1(input);
      await bundle.write(output);
      await writeFile_p(err_outfile, '');
      return bundle;
    } catch (err) {
      await onBuildError(err);
    }
  }

  async function buildWithTiming() {
    const log_msg = `rollup bundle "${opt.source.name}" (@${Date.now().toString(36)})`;
    console.log(`Building ${log_msg}`);
    console.time(`Built ${log_msg}`);
    try {
      input.cache = bundle;
      console.time(`Compiled ${log_msg}`);
      bundle = await rollup$1(input);
      console.timeEnd(`Compiled ${log_msg}`);
      await bundle.write(output);
      await writeFile_p(err_outfile, '');
      return bundle;
    } catch (err) {
      await onBuildError(err);
    } finally {
      console.timeEnd(`Built ${log_msg}`);
    }
  }

  async function onBuildError(err) {
    const lines = formatBuildError(err, true);
    if (opt.onBuildError) {
      return opt.onBuildError(err, lines, buildCtx);
    }

    const err_msg = lines ? lines + '\n' : inspect(err, { colors: true });

    console.error('\n\n', err_msg, '\n');
    await writeFile_p(err_outfile, err_msg);
  }
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

    const rebuildWatcher = chokidar.watch(watch_glob, {
      ignoreInitial: true,
      ignorePermissionErrors: true }).on('change', _debounce);

    watchers.push(rebuildWatcher);

    // invoke initial build
    _debounce();
    return self;

    function _debounce(path$$1) {
      // debounce rapid updates
      if (false === inprogress) {
        inprogress = true;
        setTimeout(() => {
          inprogress = false;
          _do_rebuild();
        }, 50).unref();
      }
      return self;
    }

    async function _do_rebuild() {
      let lst = await rebuild();
      if (null == lst) {
        return;
      }

      if (!Array.isArray(lst)) {
        lst = [lst];
      }
      for (const bundle of lst) {
        const paths = bundle.modules.map(e => e.id).filter(id => id && !id.includes('/node_modules/') && '\u0000' !== id[0]);

        rebuildWatcher.add(paths);
      }
    }
  }
}

watchAndBuild.forever = function (command = `babel-node rollup.cfg.jsy --watch-impl`) {
  while (true) {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n\nRestarting rollup watch\n\n`);
  }
};

export { jsy_plugin, bundle, formatBuildError, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2luc3BlY3QsIHByb21pc2lmeX0gZnJvbSAndXRpbCdcbmltcG9ydCB7d3JpdGVGaWxlfSBmcm9tICdmcydcbmltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7ZXhlY1N5bmN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5jb25zdCB3cml0ZUZpbGVfcCA9IHByb21pc2lmeSh3cml0ZUZpbGUpXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJywgYmFiZWxyYzogZmFsc2UsIGhpZ2hsaWdodENvZGU6IHRydWVcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0c1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBleHRlcm5hbHMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5jcmVhdGUgQCBvcHQgLy8gRG9uJ3QgbW9kaWZ5IHRoZSB1bmRlcmx5aW5nIG9iamVjdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gZXh0ZXJuYWxzIDo6IGV4dGVybmFscyA9IG9wdC5leHRlcm5hbHMgfHwgW11cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IGZvcm1hdCA6OiBmb3JtYXQgPSBvcHQuZm9ybWF0IHx8ICdpaWZlJ1xuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGdsb2JhbE1vZHVsZXMgOjpcbiAgICBjb25zdCBsX2dsb2JhbE1vZHVsZXMgPSBnbG9iYWxNb2R1bGVzXG4gICAgZ2xvYmFsTW9kdWxlcyA9IG1vZHVsZSA9PiBsX2dsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGV4dGVybmFscyA9IG5ldyBTZXQgQCBleHRlcm5hbHNcbiAgY29uc3QgaW5wdXQgPSBPYmplY3QuYXNzaWduIEBcbiAgICBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICAgICAgZXh0ZXJuYWw6IG1vZHVsZSA9PlxuICAgICAgICAgICEhIGdsb2JhbE1vZHVsZXMobW9kdWxlKVxuICAgICAgICAgIHx8IGV4dGVybmFscy5oYXMobW9kdWxlKVxuXG4gICAgb3B0LmlucHV0X29wdGlvbnNcblxuICBpZiBhbWQgOjogZm9ybWF0ID0gJ2FtZCdcblxuICBjb25zdCBvdXRwdXQgPSBPYmplY3QuYXNzaWduIEAgXG4gICAgQHt9IGZvcm1hdFxuICAgICAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICAgICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICAgICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgICAgIGdsb2JhbHM6IGdsb2JhbE1vZHVsZXNcblxuICAgIG9wdC5vdXRwdXRfb3B0aW9uc1xuXG4gIGlmIGFtZCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIChvcHQuYnVpbGRDbG9zdXJlIHx8IGFzUm9sbHVwQnVpbGRDbG9zdXJlKSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRCdWlsZEVycm9yKGVyciwgam9pbikgOjpcbiAgY29uc3Qge2xvYywgZnJhbWUsIGNvZGVGcmFtZX0gPSBlcnJcbiAgaWYgISBAIGxvYyB8fCBmcmFtZSB8fCBjb2RlRnJhbWUgOjogcmV0dXJuXG5cbiAgY29uc3QgY29sb3JzID0gL1xcW1xcZCttLy50ZXN0IEAgKGZyYW1lfHxjb2RlRnJhbWV8fCcnKVxuICBjb25zdCBobCA9IHYgPT4gaW5zcGVjdCBAIHYsIEB7fSBjb2xvcnNcblxuICBjb25zdCBsaW5lcyA9IFtdXG4gIGxldCBtc2cgPSBlcnIubWVzc2FnZVxuICBpZiBlcnIuaWQgOjpcbiAgICAvLyBzaW1wbGlmeSBvdXRwdXQgYnkgc3BsaXR0aW5nIGVyci5pZCB0byBkaXN0aW5jdCBsaW5lXG4gICAgbXNnID0gbXNnLnJlcGxhY2UoYCR7ZXJyLmlkfTogYCwgJycpXG5cbiAgbGluZXMucHVzaCBAIGBCdWlsZEVycm9yOiAke2hsKG1zZyl9YFxuXG4gIGlmIGxvYyA6OiBsaW5lcy5wdXNoIEAgYCAgaW4gJHtobChsb2MuZmlsZSl9IGF0ICR7aGwobG9jLmxpbmUpfToke2hsKGxvYy5jb2x1bW4pfWBcbiAgaWYgZXJyLmlkIDo6IGxpbmVzLnB1c2ggQCBgICBpZDogJHtobChlcnIuaWQpfWBcbiAgaWYgZXJyLmNvZGUgOjogbGluZXMucHVzaCBAIGAgIGNvZGU6ICR7aGwoZXJyLmNvZGUpfWBcblxuICBpZiBmcmFtZSB8fCBjb2RlRnJhbWUgOjpcbiAgICBsaW5lcy5wdXNoIEAgJycsIGZyYW1lIHx8IGNvZGVGcmFtZVxuXG4gIGlmIHRydWUgPT09IGpvaW4gOjogcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG4gIGVsc2UgaWYgam9pbiA6OiByZXR1cm4gbGluZXMuam9pbihqb2luKVxuICBlbHNlIHJldHVybiBsaW5lc1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZShidWlsZEN0eCkgOjpcbiAgY29uc3Qge2lucHV0LCBvdXRwdXQsIG9wdH0gPSBidWlsZEN0eFxuICBjb25zdCBlcnJfb3V0ZmlsZSA9IGAke291dHB1dC5maWxlfS5lcnJvcmBcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gb3B0Lm5vX3RpbWluZyA/IGJ1aWxkIDogYnVpbGRXaXRoVGltaW5nXG5cbiAgYXN5bmMgZnVuY3Rpb24gYnVpbGQoKSA6OlxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG4gICAgICBhd2FpdCB3cml0ZUZpbGVfcChlcnJfb3V0ZmlsZSwgJycpXG4gICAgICByZXR1cm4gYnVuZGxlXG4gICAgY2F0Y2ggZXJyIDo6XG4gICAgICBhd2FpdCBvbkJ1aWxkRXJyb3IoZXJyKVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGJ1aWxkV2l0aFRpbWluZygpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICAgIGF3YWl0IHdyaXRlRmlsZV9wKGVycl9vdXRmaWxlLCAnJylcbiAgICAgIHJldHVybiBidW5kbGVcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGF3YWl0IG9uQnVpbGRFcnJvcihlcnIpXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cbiAgYXN5bmMgZnVuY3Rpb24gb25CdWlsZEVycm9yKGVycikgOjpcbiAgICBjb25zdCBsaW5lcyA9IGZvcm1hdEJ1aWxkRXJyb3IgQCBlcnIsIHRydWVcbiAgICBpZiBvcHQub25CdWlsZEVycm9yIDo6XG4gICAgICByZXR1cm4gb3B0Lm9uQnVpbGRFcnJvciBAIGVyciwgbGluZXMsIGJ1aWxkQ3R4XG5cbiAgICBjb25zdCBlcnJfbXNnID0gbGluZXNcbiAgICAgID8gbGluZXMrJ1xcbidcbiAgICAgIDogaW5zcGVjdChlcnIsIHtjb2xvcnM6IHRydWV9KVxuXG4gICAgY29uc29sZS5lcnJvciBAICdcXG5cXG4nLCBlcnJfbXNnLCAnXFxuJ1xuICAgIGF3YWl0IHdyaXRlRmlsZV9wIEAgZXJyX291dGZpbGUsIGVycl9tc2csIFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQob25fcmVzdGFydCkgOjpcbiAgaWYgb25fcmVzdGFydCAmJiAnZnVuY3Rpb24nICE9PSB0eXBlb2Ygb25fcmVzdGFydCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgb25fcmVzdGFydCB0byBiZSBhIGZ1bmN0aW9uYFxuXG4gIGxldCB3YXRjaGVycyA9IFtdXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCBidWlsZE9uY2UsIHJlc3RhcnRPblxuICByZXR1cm4gc2VsZlxuXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGlmICEgd2F0Y2hlcnMgOjogcmV0dXJuXG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICAgICAgaWYgb25fcmVzdGFydCA6OiBvbl9yZXN0YXJ0KHBhdGgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIGJ1aWxkT25jZShidWlsZE9uY2UsIHdhdGNoX2dsb2IpIDo6XG4gICAgaWYgQXJyYXkuaXNBcnJheShidWlsZE9uY2UpIDo6XG4gICAgICBidWlsZE9uY2UgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgYnVpbGRPbmNlXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgYnVpbGRPbmNlIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIGJ1aWxkT25jZSB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgaWYgd2F0Y2hfZ2xvYiA6OiByZXN0YXJ0T24gQCB3YXRjaF9nbG9iXG5cbiAgICBidWlsZE9uY2UoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHJlYnVpbGQsIHdhdGNoX2dsb2IpIDo6XG4gICAgbGV0IGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgY29uc3QgcmVidWlsZFdhdGNoZXIgPSBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX2RlYm91bmNlXG5cbiAgICB3YXRjaGVycy5wdXNoIEAgcmVidWlsZFdhdGNoZXJcblxuICAgIC8vIGludm9rZSBpbml0aWFsIGJ1aWxkXG4gICAgX2RlYm91bmNlKClcbiAgICByZXR1cm4gc2VsZlxuXG4gICAgZnVuY3Rpb24gX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBmYWxzZSA9PT0gaW5wcm9ncmVzcyA6OlxuICAgICAgICBpbnByb2dyZXNzID0gdHJ1ZVxuICAgICAgICBzZXRUaW1lb3V0IEBcbiAgICAgICAgICAoKSA9PiA6OlxuICAgICAgICAgICAgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgICAgICAgICBfZG9fcmVidWlsZCgpXG4gICAgICAgICAgNTBcbiAgICAgICAgLnVucmVmKClcbiAgICAgIHJldHVybiBzZWxmXG5cbiAgICBhc3luYyBmdW5jdGlvbiBfZG9fcmVidWlsZCgpIDo6XG4gICAgICBsZXQgbHN0ID0gYXdhaXQgcmVidWlsZCgpXG4gICAgICBpZiBudWxsID09IGxzdCA6OiByZXR1cm5cblxuICAgICAgaWYgISBBcnJheS5pc0FycmF5KGxzdCkgOjogbHN0ID0gW2xzdF1cbiAgICAgIGZvciBjb25zdCBidW5kbGUgb2YgbHN0IDo6XG4gICAgICAgIGNvbnN0IHBhdGhzID0gYnVuZGxlLm1vZHVsZXMubWFwKGUgPT4gZS5pZClcbiAgICAgICAgICAuZmlsdGVyIEAgaWQgPT4gaWRcbiAgICAgICAgICAgICYmICEgaWQuaW5jbHVkZXMoJy9ub2RlX21vZHVsZXMvJylcbiAgICAgICAgICAgICYmICgnXFx1MDAwMCcgIT09IGlkWzBdKVxuXG4gICAgICAgIHJlYnVpbGRXYXRjaGVyLmFkZChwYXRocylcbiAgICAgICAgICAgICAgICBcblxud2F0Y2hBbmRCdWlsZC5mb3JldmVyID0gZnVuY3Rpb24oY29tbWFuZD1gYmFiZWwtbm9kZSByb2xsdXAuY2ZnLmpzeSAtLXdhdGNoLWltcGxgKSA6OlxuICB3aGlsZSB0cnVlIDo6XG4gICAgZXhlY1N5bmMgQCBjb21tYW5kLCBAe30gc3RkaW86ICdpbmhlcml0J1xuICAgIGNvbnNvbGUubG9nIEAgYFxcblxcblJlc3RhcnRpbmcgcm9sbHVwIHdhdGNoXFxuXFxuYFxuXG4iXSwibmFtZXMiOlsid3JpdGVGaWxlX3AiLCJwcm9taXNpZnkiLCJ3cml0ZUZpbGUiLCJqc3lfcGx1Z2luIiwia3dhcmdzIiwianN5X3ByZXNldCIsIm5vX3N0YWdlXzMiLCJtb2R1bGVzIiwicHJlc2V0cyIsImNvbmNhdCIsIk9iamVjdCIsImFzc2lnbiIsImV4Y2x1ZGUiLCJiYWJlbHJjIiwiaGlnaGxpZ2h0Q29kZSIsInJwaV9iYWJlbCIsImJ1bmRsZSIsInNvdXJjZSIsIm9wdCIsImdsb2JhbE1vZHVsZXMiLCJleHRlcm5hbHMiLCJwbHVnaW5zIiwiZm9ybWF0IiwiYW1kIiwiVHlwZUVycm9yIiwiY3JlYXRlIiwic3VmZml4IiwicHJvZHVjdGlvbiIsIm91dGRpciIsInBhdGhfcGFyc2UiLCJsX2dsb2JhbE1vZHVsZXMiLCJtb2R1bGUiLCJTZXQiLCJpbnB1dCIsImhhcyIsImlucHV0X29wdGlvbnMiLCJvdXRwdXQiLCJuYW1lIiwic291cmNlbWFwIiwib3V0cHV0X29wdGlvbnMiLCJidWlsZENsb3N1cmUiLCJhc1JvbGx1cEJ1aWxkQ2xvc3VyZSIsImZvcm1hdEJ1aWxkRXJyb3IiLCJlcnIiLCJqb2luIiwibG9jIiwiZnJhbWUiLCJjb2RlRnJhbWUiLCJjb2xvcnMiLCJ0ZXN0IiwiaGwiLCJ2IiwiaW5zcGVjdCIsImxpbmVzIiwibXNnIiwibWVzc2FnZSIsImlkIiwicmVwbGFjZSIsInB1c2giLCJmaWxlIiwibGluZSIsImNvbHVtbiIsImNvZGUiLCJidWlsZEN0eCIsImVycl9vdXRmaWxlIiwibm9fdGltaW5nIiwiYnVpbGQiLCJidWlsZFdpdGhUaW1pbmciLCJjYWNoZSIsInJvbGx1cCIsIndyaXRlIiwib25CdWlsZEVycm9yIiwibG9nX21zZyIsIkRhdGUiLCJub3ciLCJ0b1N0cmluZyIsImxvZyIsInRpbWUiLCJ0aW1lRW5kIiwiZXJyX21zZyIsImVycm9yIiwiYnVpbGRBbGwiLCJidWlsZExpc3QiLCJQcm9taXNlIiwiYWxsIiwibWFwIiwiYnVpbGRlciIsIndhdGNoQW5kQnVpbGQiLCJvbl9yZXN0YXJ0Iiwid2F0Y2hlcnMiLCJzZWxmIiwicmVidWlsZE9uIiwiYnVpbGRPbmNlIiwicmVzdGFydE9uIiwid2F0Y2hfZ2xvYiIsImNob2tpZGFyIiwid2F0Y2giLCJvbiIsInBhdGgiLCJsX3dhdGNoZXJzIiwiZWFjaCIsImNsb3NlIiwiQXJyYXkiLCJpc0FycmF5IiwiYmluZCIsInJlYnVpbGQiLCJpbnByb2dyZXNzIiwicmVidWlsZFdhdGNoZXIiLCJfZGVib3VuY2UiLCJ1bnJlZiIsIl9kb19yZWJ1aWxkIiwibHN0IiwicGF0aHMiLCJlIiwiZmlsdGVyIiwiaW5jbHVkZXMiLCJhZGQiLCJmb3JldmVyIiwiY29tbWFuZCIsInN0ZGlvIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQVFBLE1BQU1BLGNBQWNDLFVBQVVDLFNBQVYsQ0FBcEI7O0FBRUEsQUFBTyxTQUFTQyxVQUFULENBQW9CQyxNQUFwQixFQUE0QjtRQUMzQkMsYUFBYSxDQUFJLFVBQUosRUFBZ0IsRUFBSUMsWUFBWSxJQUFoQixFQUFzQkMsU0FBUyxLQUEvQixFQUFoQixDQUFuQjtRQUNNQyxVQUFVLENBQUNILFVBQUQsRUFBYUksTUFBYixDQUFzQkwsT0FBT0ksT0FBUCxJQUFrQixFQUF4QyxDQUFoQjs7V0FFU0UsT0FBT0MsTUFBUCxDQUNQLEVBQUlDLFNBQVMsaUJBQWIsRUFBZ0NDLFNBQVMsS0FBekMsRUFBZ0RDLGVBQWUsSUFBL0QsRUFETyxFQUVQVixNQUZPLEVBR1AsRUFBSUksT0FBSixFQUhPLENBQVQ7O1NBS09PLFVBQVVYLE1BQVYsQ0FBUDs7O0FBR0YsQUFBTyxTQUFTWSxNQUFULENBQWdCLEVBQUNDLE1BQUQsRUFBU0MsR0FBVCxFQUFjQyxhQUFkLEVBQTZCQyxTQUE3QixFQUF3Q0MsT0FBeEMsRUFBaURDLE1BQWpELEVBQXlEQyxHQUF6RCxFQUFoQixFQUErRTtNQUNqRixhQUFhLE9BQU9OLE1BQXZCLEVBQWdDO1VBQU8sSUFBSU8sU0FBSixDQUFpQixrQ0FBakIsQ0FBTjs7TUFDOUIsUUFBUU4sR0FBWCxFQUFpQjtVQUFPLElBQUlNLFNBQUosQ0FBaUIsdUNBQWpCLENBQU47O1FBQ1pkLE9B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
