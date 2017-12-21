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

export { jsy_plugin, bundle, formatBuildError, asRollupBuildClosure, buildAll, watchAndBuild };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2luc3BlY3QsIHByb21pc2lmeX0gZnJvbSAndXRpbCdcbmltcG9ydCB7d3JpdGVGaWxlfSBmcm9tICdmcydcbmltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7ZXhlY1N5bmN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5jb25zdCB3cml0ZUZpbGVfcCA9IHByb21pc2lmeSh3cml0ZUZpbGUpXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJywgYmFiZWxyYzogZmFsc2UsIGhpZ2hsaWdodENvZGU6IHRydWVcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0c1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBleHRlcm5hbHMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5jcmVhdGUgQCBvcHQgLy8gRG9uJ3QgbW9kaWZ5IHRoZSB1bmRlcmx5aW5nIG9iamVjdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gZXh0ZXJuYWxzIDo6IGV4dGVybmFscyA9IG9wdC5leHRlcm5hbHMgfHwgW11cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IGZvcm1hdCA6OiBmb3JtYXQgPSBvcHQuZm9ybWF0IHx8ICdpaWZlJ1xuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGdsb2JhbE1vZHVsZXMgOjpcbiAgICBjb25zdCBsX2dsb2JhbE1vZHVsZXMgPSBnbG9iYWxNb2R1bGVzXG4gICAgZ2xvYmFsTW9kdWxlcyA9IG1vZHVsZSA9PiBsX2dsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGV4dGVybmFscyA9IG5ldyBTZXQgQCBleHRlcm5hbHNcbiAgY29uc3QgaW5wdXQgPSBPYmplY3QuYXNzaWduIEBcbiAgICBAe30gaW5wdXQ6IHNvdXJjZSwgcGx1Z2lucyxcbiAgICAgICAgZXh0ZXJuYWw6IG1vZHVsZSA9PlxuICAgICAgICAgICEhIGdsb2JhbE1vZHVsZXMobW9kdWxlKVxuICAgICAgICAgIHx8IGV4dGVybmFscy5oYXMobW9kdWxlKVxuXG4gICAgb3B0LmlucHV0X29wdGlvbnNcblxuICBpZiBhbWQgOjogZm9ybWF0ID0gJ2FtZCdcblxuICBjb25zdCBvdXRwdXQgPSBPYmplY3QuYXNzaWduIEAgXG4gICAgQHt9IGZvcm1hdFxuICAgICAgICBuYW1lOiBvcHQuc291cmNlLm5hbWVcbiAgICAgICAgZmlsZTogYCR7b3B0Lm91dGRpcn0vJHtvcHQuc291cmNlLm5hbWV9JHtvcHQuc3VmZml4fS5qc2BcbiAgICAgICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgICAgIGdsb2JhbHM6IGdsb2JhbE1vZHVsZXNcblxuICAgIG9wdC5vdXRwdXRfb3B0aW9uc1xuXG4gIGlmIGFtZCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIChvcHQuYnVpbGRDbG9zdXJlIHx8IGFzUm9sbHVwQnVpbGRDbG9zdXJlKSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRCdWlsZEVycm9yKGVyciwgam9pbikgOjpcbiAgY29uc3Qge2xvYywgZnJhbWUsIGNvZGVGcmFtZX0gPSBlcnJcbiAgaWYgISBAIGxvYyB8fCBmcmFtZSB8fCBjb2RlRnJhbWUgOjogcmV0dXJuXG5cbiAgY29uc3QgY29sb3JzID0gL1xcW1xcZCttLy50ZXN0IEAgKGZyYW1lfHxjb2RlRnJhbWV8fCcnKVxuICBjb25zdCBobCA9IHYgPT4gaW5zcGVjdCBAIHYsIEB7fSBjb2xvcnNcblxuICBjb25zdCBsaW5lcyA9IFtdXG4gIGxldCBtc2cgPSBlcnIubWVzc2FnZVxuICBpZiBlcnIuaWQgOjpcbiAgICAvLyBzaW1wbGlmeSBvdXRwdXQgYnkgc3BsaXR0aW5nIGVyci5pZCB0byBkaXN0aW5jdCBsaW5lXG4gICAgbXNnID0gbXNnLnJlcGxhY2UoYCR7ZXJyLmlkfTogYCwgJycpXG5cbiAgbGluZXMucHVzaCBAIGBCdWlsZEVycm9yOiAke2hsKG1zZyl9YFxuXG4gIGlmIGxvYyA6OiBsaW5lcy5wdXNoIEAgYCAgaW4gJHtobChsb2MuZmlsZSl9IGF0ICR7aGwobG9jLmxpbmUpfToke2hsKGxvYy5jb2x1bW4pfWBcbiAgaWYgZXJyLmlkIDo6IGxpbmVzLnB1c2ggQCBgICBpZDogJHtobChlcnIuaWQpfWBcbiAgaWYgZXJyLmNvZGUgOjogbGluZXMucHVzaCBAIGAgIGNvZGU6ICR7aGwoZXJyLmNvZGUpfWBcblxuICBpZiBmcmFtZSB8fCBjb2RlRnJhbWUgOjpcbiAgICBsaW5lcy5wdXNoIEAgJycsIGZyYW1lIHx8IGNvZGVGcmFtZVxuXG4gIGlmIHRydWUgPT09IGpvaW4gOjogcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG4gIGVsc2UgaWYgam9pbiA6OiByZXR1cm4gbGluZXMuam9pbihqb2luKVxuICBlbHNlIHJldHVybiBsaW5lc1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZShidWlsZEN0eCkgOjpcbiAgY29uc3Qge2lucHV0LCBvdXRwdXQsIG9wdH0gPSBidWlsZEN0eFxuICBjb25zdCBlcnJfb3V0ZmlsZSA9IGAke291dHB1dC5maWxlfS5lcnJvcmBcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gb3B0Lm5vX3RpbWluZyA/IGJ1aWxkIDogYnVpbGRXaXRoVGltaW5nXG5cbiAgYXN5bmMgZnVuY3Rpb24gYnVpbGQoKSA6OlxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG4gICAgICBhd2FpdCB3cml0ZUZpbGVfcChlcnJfb3V0ZmlsZSwgJycpXG4gICAgY2F0Y2ggZXJyIDo6XG4gICAgICBhd2FpdCBvbkJ1aWxkRXJyb3IoZXJyKVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGJ1aWxkV2l0aFRpbWluZygpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICAgIGF3YWl0IHdyaXRlRmlsZV9wKGVycl9vdXRmaWxlLCAnJylcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGF3YWl0IG9uQnVpbGRFcnJvcihlcnIpXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cbiAgYXN5bmMgZnVuY3Rpb24gb25CdWlsZEVycm9yKGVycikgOjpcbiAgICBjb25zdCBsaW5lcyA9IGZvcm1hdEJ1aWxkRXJyb3IgQCBlcnIsIHRydWVcbiAgICBpZiBvcHQub25CdWlsZEVycm9yIDo6XG4gICAgICByZXR1cm4gb3B0Lm9uQnVpbGRFcnJvciBAIGVyciwgbGluZXMsIGJ1aWxkQ3R4XG5cbiAgICBjb25zdCBlcnJfbXNnID0gbGluZXNcbiAgICAgID8gbGluZXMrJ1xcbidcbiAgICAgIDogaW5zcGVjdChlcnIsIHtjb2xvcnM6IHRydWV9KVxuXG4gICAgY29uc29sZS5lcnJvciBAICdcXG5cXG4nLCBlcnJfbXNnLCAnXFxuJ1xuICAgIGF3YWl0IHdyaXRlRmlsZV9wIEAgZXJyX291dGZpbGUsIGVycl9tc2csIFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQob25fcmVzdGFydCkgOjpcbiAgaWYgb25fcmVzdGFydCAmJiAnZnVuY3Rpb24nICE9PSB0eXBlb2Ygb25fcmVzdGFydCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgb25fcmVzdGFydCB0byBiZSBhIGZ1bmN0aW9uYFxuXG4gIGxldCB3YXRjaGVycyA9IFtdXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCBidWlsZE9uY2UsIHJlc3RhcnRPblxuICByZXR1cm4gc2VsZlxuXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGlmICEgd2F0Y2hlcnMgOjogcmV0dXJuXG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICAgICAgaWYgb25fcmVzdGFydCA6OiBvbl9yZXN0YXJ0KHBhdGgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIGJ1aWxkT25jZShidWlsZE9uY2UsIHdhdGNoX2dsb2IpIDo6XG4gICAgaWYgQXJyYXkuaXNBcnJheShidWlsZE9uY2UpIDo6XG4gICAgICBidWlsZE9uY2UgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgYnVpbGRPbmNlXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgYnVpbGRPbmNlIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIGJ1aWxkT25jZSB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgaWYgd2F0Y2hfZ2xvYiA6OiByZXN0YXJ0T24gQCB3YXRjaF9nbG9iXG5cbiAgICBidWlsZE9uY2UoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHJlYnVpbGQsIHdhdGNoX2dsb2IpIDo6XG4gICAgbGV0IGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgICByZWJ1aWxkKClcblxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gICAgZnVuY3Rpb24gX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBmYWxzZSA9PT0gaW5wcm9ncmVzcyA6OlxuICAgICAgICBpbnByb2dyZXNzID0gdHJ1ZVxuICAgICAgICBzZXRUaW1lb3V0IEBcbiAgICAgICAgICAoKSA9PiA6OlxuICAgICAgICAgICAgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgICAgICAgICByZWJ1aWxkKClcbiAgICAgICAgICA1MFxuICAgICAgICAudW5yZWYoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuXG53YXRjaEFuZEJ1aWxkLmZvcmV2ZXIgPSBmdW5jdGlvbihjb21tYW5kPWBiYWJlbC1ub2RlIHJvbGx1cC5jZmcuanN5IC0td2F0Y2gtaW1wbGApIDo6XG4gIHdoaWxlIHRydWUgOjpcbiAgICBleGVjU3luYyBAIGNvbW1hbmQsIEB7fSBzdGRpbzogJ2luaGVyaXQnXG4gICAgY29uc29sZS5sb2cgQCBgXFxuXFxuUmVzdGFydGluZyByb2xsdXAgd2F0Y2hcXG5cXG5gXG5cbiJdLCJuYW1lcyI6WyJ3cml0ZUZpbGVfcCIsInByb21pc2lmeSIsIndyaXRlRmlsZSIsImpzeV9wbHVnaW4iLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJwcmVzZXRzIiwiY29uY2F0IiwiT2JqZWN0IiwiYXNzaWduIiwiZXhjbHVkZSIsImJhYmVscmMiLCJoaWdobGlnaHRDb2RlIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsImV4dGVybmFscyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsImxfZ2xvYmFsTW9kdWxlcyIsIm1vZHVsZSIsIlNldCIsImlucHV0IiwiaGFzIiwiaW5wdXRfb3B0aW9ucyIsIm91dHB1dCIsIm5hbWUiLCJzb3VyY2VtYXAiLCJvdXRwdXRfb3B0aW9ucyIsImJ1aWxkQ2xvc3VyZSIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwiZm9ybWF0QnVpbGRFcnJvciIsImVyciIsImpvaW4iLCJsb2MiLCJmcmFtZSIsImNvZGVGcmFtZSIsImNvbG9ycyIsInRlc3QiLCJobCIsInYiLCJpbnNwZWN0IiwibGluZXMiLCJtc2ciLCJtZXNzYWdlIiwiaWQiLCJyZXBsYWNlIiwicHVzaCIsImZpbGUiLCJsaW5lIiwiY29sdW1uIiwiY29kZSIsImJ1aWxkQ3R4IiwiZXJyX291dGZpbGUiLCJub190aW1pbmciLCJidWlsZCIsImJ1aWxkV2l0aFRpbWluZyIsImNhY2hlIiwicm9sbHVwIiwid3JpdGUiLCJvbkJ1aWxkRXJyb3IiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsInRpbWVFbmQiLCJlcnJfbXNnIiwiZXJyb3IiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsIm9uX3Jlc3RhcnQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwicGF0aCIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwicmVidWlsZCIsImlucHJvZ3Jlc3MiLCJfZGVib3VuY2UiLCJ1bnJlZiIsImZvcmV2ZXIiLCJjb21tYW5kIiwic3RkaW8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBUUEsTUFBTUEsY0FBY0MsVUFBVUMsU0FBVixDQUFwQjs7QUFFQSxBQUFPLFNBQVNDLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1FBQ01DLFVBQVUsQ0FBQ0gsVUFBRCxFQUFhSSxNQUFiLENBQXNCTCxPQUFPSSxPQUFQLElBQWtCLEVBQXhDLENBQWhCOztXQUVTRSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYixFQUFnQ0MsU0FBUyxLQUF6QyxFQUFnREMsZUFBZSxJ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
