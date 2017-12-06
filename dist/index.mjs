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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgubWpzIiwic291cmNlcyI6WyIuLi9jb2RlL2luZGV4LmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2luc3BlY3QsIHByb21pc2lmeX0gZnJvbSAndXRpbCdcbmltcG9ydCB7d3JpdGVGaWxlfSBmcm9tICdmcydcbmltcG9ydCB7cGFyc2UgYXMgcGF0aF9wYXJzZX0gZnJvbSAncGF0aCdcbmltcG9ydCB7ZXhlY1N5bmN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXG5pbXBvcnQge3JvbGx1cH0gZnJvbSAncm9sbHVwJ1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJ1xuaW1wb3J0IHJwaV9iYWJlbCBmcm9tICdyb2xsdXAtcGx1Z2luLWJhYmVsJ1xuXG5jb25zdCB3cml0ZUZpbGVfcCA9IHByb21pc2lmeSh3cml0ZUZpbGUpXG5cbmV4cG9ydCBmdW5jdGlvbiBqc3lfcGx1Z2luKGt3YXJncykgOjpcbiAgY29uc3QganN5X3ByZXNldCA9IEBbXSAnanN5L2xlYW4nLCBAe30gbm9fc3RhZ2VfMzogdHJ1ZSwgbW9kdWxlczogZmFsc2VcbiAgY29uc3QgcHJlc2V0cyA9IFtqc3lfcHJlc2V0XS5jb25jYXQgQCBrd2FyZ3MucHJlc2V0cyB8fCBbXVxuXG4gIGt3YXJncyA9IE9iamVjdC5hc3NpZ24gQFxuICAgIEB7fSBleGNsdWRlOiAnbm9kZV9tb2R1bGVzLyoqJywgYmFiZWxyYzogZmFsc2UsIGhpZ2hsaWdodENvZGU6IHRydWVcbiAgICBrd2FyZ3NcbiAgICBAe30gcHJlc2V0c1xuXG4gIHJldHVybiBycGlfYmFiZWwoa3dhcmdzKVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidW5kbGUoe3NvdXJjZSwgb3B0LCBnbG9iYWxNb2R1bGVzLCBleHRlcm5hbHMsIHBsdWdpbnMsIGZvcm1hdCwgYW1kfSkgOjpcbiAgaWYgJ3N0cmluZycgIT09IHR5cGVvZiBzb3VyY2UgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCBzdHJpbmcgc291cmNlIHBhcmFtZXRlcmBcbiAgaWYgbnVsbCA9PSBvcHQgOjogdGhyb3cgbmV3IFR5cGVFcnJvciBAIGBFeHBlY3RlZCB2YWxpZCBcIm9wdFwiIG9iamVjdCBwYXJhbWV0ZXJgXG4gIG9wdCA9IE9iamVjdC5jcmVhdGUgQCBvcHQgLy8gRG9uJ3QgbW9kaWZ5IHRoZSB1bmRlcmx5aW5nIG9iamVjdFxuICBpZiBudWxsID09IGdsb2JhbE1vZHVsZXMgOjogZ2xvYmFsTW9kdWxlcyA9IG9wdC5nbG9iYWxNb2R1bGVzIHx8IHt9XG4gIGlmIG51bGwgPT0gZXh0ZXJuYWxzIDo6IGV4dGVybmFscyA9IG9wdC5leHRlcm5hbHMgfHwgW11cbiAgaWYgbnVsbCA9PSBwbHVnaW5zIDo6IHBsdWdpbnMgPSBvcHQucGx1Z2lucyB8fCBbXVxuICBpZiBudWxsID09IGZvcm1hdCA6OiBmb3JtYXQgPSBvcHQuZm9ybWF0IHx8ICdpaWZlJ1xuICBpZiBudWxsID09IG9wdC5zdWZmaXggOjogb3B0LnN1ZmZpeCA9IG9wdC5wcm9kdWN0aW9uID8gJy5taW4nIDogJydcbiAgaWYgbnVsbCA9PSBvcHQub3V0ZGlyIDo6IG9wdC5vdXRkaXIgPSAnLi9kaXN0L3B1YmxpYydcbiAgaWYgbnVsbCA9PSBvcHQuc291cmNlIDo6IG9wdC5zb3VyY2UgPSBwYXRoX3BhcnNlIEAgc291cmNlXG5cbiAgZXh0ZXJuYWxzID0gbmV3IFNldCBAIGV4dGVybmFsc1xuICBjb25zdCBpbnB1dCA9IEB7fSBpbnB1dDogc291cmNlLCBwbHVnaW5zLFxuICAgIGV4dGVybmFsOiBtb2R1bGUgPT4gISEgZ2xvYmFsTW9kdWxlc1ttb2R1bGVdIHx8IGV4dGVybmFscy5oYXMobW9kdWxlKVxuXG4gIGlmIGFtZCA6OiBmb3JtYXQgPSAnYW1kJ1xuXG4gIGNvbnN0IG91dHB1dCA9IEB7fVxuICAgIGZvcm1hdFxuICAgIG5hbWU6IG9wdC5zb3VyY2UubmFtZVxuICAgIGZpbGU6IGAke29wdC5vdXRkaXJ9LyR7b3B0LnNvdXJjZS5uYW1lfSR7b3B0LnN1ZmZpeH0uanNgXG4gICAgc291cmNlbWFwOiBvcHQuc291cmNlbWFwXG4gICAgZ2xvYmFsczogbW9kdWxlID0+IGdsb2JhbE1vZHVsZXNbbW9kdWxlXVxuXG4gIGlmIGFtZCA6OiBvdXRwdXQuYW1kID0gYW1kXG5cbiAgcmV0dXJuIChvcHQuYnVpbGRDbG9zdXJlIHx8IGFzUm9sbHVwQnVpbGRDbG9zdXJlKSBAOlxuICAgIGlucHV0LCBvdXRwdXQsIG9wdFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRCdWlsZEVycm9yKGVyciwgam9pbikgOjpcbiAgY29uc3Qge2xvYywgZnJhbWUsIGNvZGVGcmFtZX0gPSBlcnJcbiAgaWYgISBAIGxvYyB8fCBmcmFtZSB8fCBjb2RlRnJhbWUgOjogcmV0dXJuXG5cbiAgY29uc3QgY29sb3JzID0gL1xcW1xcZCttLy50ZXN0IEAgKGZyYW1lfHxjb2RlRnJhbWV8fCcnKVxuICBjb25zdCBobCA9IHYgPT4gaW5zcGVjdCBAIHYsIEB7fSBjb2xvcnNcblxuICBjb25zdCBsaW5lcyA9IFtdXG4gIGxldCBtc2cgPSBlcnIubWVzc2FnZVxuICBpZiBlcnIuaWQgOjpcbiAgICAvLyBzaW1wbGlmeSBvdXRwdXQgYnkgc3BsaXR0aW5nIGVyci5pZCB0byBkaXN0aW5jdCBsaW5lXG4gICAgbXNnID0gbXNnLnJlcGxhY2UoYCR7ZXJyLmlkfTogYCwgJycpXG5cbiAgbGluZXMucHVzaCBAIGBCdWlsZEVycm9yOiAke2hsKG1zZyl9YFxuXG4gIGlmIGxvYyA6OiBsaW5lcy5wdXNoIEAgYCAgaW4gJHtobChsb2MuZmlsZSl9IGF0ICR7aGwobG9jLmxpbmUpfToke2hsKGxvYy5jb2x1bW4pfWBcbiAgaWYgZXJyLmlkIDo6IGxpbmVzLnB1c2ggQCBgICBpZDogJHtobChlcnIuaWQpfWBcbiAgaWYgZXJyLmNvZGUgOjogbGluZXMucHVzaCBAIGAgIGNvZGU6ICR7aGwoZXJyLmNvZGUpfWBcblxuICBpZiBmcmFtZSB8fCBjb2RlRnJhbWUgOjpcbiAgICBsaW5lcy5wdXNoIEAgJycsIGZyYW1lIHx8IGNvZGVGcmFtZVxuXG4gIGlmIHRydWUgPT09IGpvaW4gOjogcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG4gIGVsc2UgaWYgam9pbiA6OiByZXR1cm4gbGluZXMuam9pbihqb2luKVxuICBlbHNlIHJldHVybiBsaW5lc1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBhc1JvbGx1cEJ1aWxkQ2xvc3VyZShidWlsZEN0eCkgOjpcbiAgY29uc3Qge2lucHV0LCBvdXRwdXQsIG9wdH0gPSBidWlsZEN0eFxuICBjb25zdCBlcnJfb3V0ZmlsZSA9IGAke291dHB1dC5maWxlfS5lcnJvcmBcbiAgbGV0IGJ1bmRsZVxuICByZXR1cm4gb3B0Lm5vX3RpbWluZyA/IGJ1aWxkIDogYnVpbGRXaXRoVGltaW5nXG5cbiAgYXN5bmMgZnVuY3Rpb24gYnVpbGQoKSA6OlxuICAgIHRyeSA6OlxuICAgICAgaW5wdXQuY2FjaGUgPSBidW5kbGVcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGF3YWl0IGJ1bmRsZS53cml0ZShvdXRwdXQpXG4gICAgICBhd2FpdCB3cml0ZUZpbGVfcChlcnJfb3V0ZmlsZSwgJycpXG4gICAgY2F0Y2ggZXJyIDo6XG4gICAgICBhd2FpdCBvbkJ1aWxkRXJyb3IoZXJyKVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGJ1aWxkV2l0aFRpbWluZygpIDo6XG4gICAgY29uc3QgbG9nX21zZyA9IGByb2xsdXAgYnVuZGxlIFwiJHtvcHQuc291cmNlLm5hbWV9XCIgKEAke0RhdGUubm93KCkudG9TdHJpbmcoMzYpfSlgXG4gICAgY29uc29sZS5sb2cgQCBgQnVpbGRpbmcgJHtsb2dfbXNnfWBcbiAgICBjb25zb2xlLnRpbWUgQCBgQnVpbHQgJHtsb2dfbXNnfWBcbiAgICB0cnkgOjpcbiAgICAgIGlucHV0LmNhY2hlID0gYnVuZGxlXG4gICAgICBjb25zb2xlLnRpbWUgQCBgQ29tcGlsZWQgJHtsb2dfbXNnfWBcbiAgICAgIGJ1bmRsZSA9IGF3YWl0IHJvbGx1cChpbnB1dClcbiAgICAgIGNvbnNvbGUudGltZUVuZCBAIGBDb21waWxlZCAke2xvZ19tc2d9YFxuICAgICAgYXdhaXQgYnVuZGxlLndyaXRlKG91dHB1dClcbiAgICAgIGF3YWl0IHdyaXRlRmlsZV9wKGVycl9vdXRmaWxlLCAnJylcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGF3YWl0IG9uQnVpbGRFcnJvcihlcnIpXG4gICAgZmluYWxseSA6OlxuICAgICAgY29uc29sZS50aW1lRW5kIEAgYEJ1aWx0ICR7bG9nX21zZ31gXG5cbiAgYXN5bmMgZnVuY3Rpb24gb25CdWlsZEVycm9yKGVycikgOjpcbiAgICBjb25zdCBsaW5lcyA9IGZvcm1hdEJ1aWxkRXJyb3IgQCBlcnIsIHRydWVcbiAgICBpZiBvcHQub25CdWlsZEVycm9yIDo6XG4gICAgICByZXR1cm4gb3B0Lm9uQnVpbGRFcnJvciBAIGVyciwgbGluZXMsIGJ1aWxkQ3R4XG5cbiAgICBjb25zdCBlcnJfbXNnID0gbGluZXNcbiAgICAgID8gbGluZXMrJ1xcbidcbiAgICAgIDogaW5zcGVjdChlcnIsIHtjb2xvcnM6IHRydWV9KVxuXG4gICAgY29uc29sZS5lcnJvciBAICdcXG5cXG4nLCBlcnJfbXNnLCAnXFxuJ1xuICAgIGF3YWl0IHdyaXRlRmlsZV9wIEAgZXJyX291dGZpbGUsIGVycl9tc2csIFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEFsbChidWlsZExpc3QpIDo6XG4gIHJldHVybiBQcm9taXNlLmFsbCBAIGJ1aWxkTGlzdC5tYXAgQFxuICAgIGJ1aWxkZXIgPT4gYnVpbGRlcigpXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoQW5kQnVpbGQob25fcmVzdGFydCkgOjpcbiAgaWYgb25fcmVzdGFydCAmJiAnZnVuY3Rpb24nICE9PSB0eXBlb2Ygb25fcmVzdGFydCA6OlxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgb25fcmVzdGFydCB0byBiZSBhIGZ1bmN0aW9uYFxuXG4gIGxldCB3YXRjaGVycyA9IFtdXG4gIGNvbnN0IHNlbGYgPSBAe30gcmVidWlsZE9uLCBidWlsZE9uY2UsIHJlc3RhcnRPblxuICByZXR1cm4gc2VsZlxuXG5cbiAgZnVuY3Rpb24gcmVzdGFydE9uKHdhdGNoX2dsb2IpIDo6XG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCB3YXRjaF9nbG9iLCBAe31cbiAgICAgICAgaWdub3JlSW5pdGlhbDogdHJ1ZVxuICAgICAgICBpZ25vcmVQZXJtaXNzaW9uRXJyb3JzOiB0cnVlXG5cbiAgICAgIC5vbiBAICdjaGFuZ2UnLCBwYXRoID0+IDo6XG4gICAgICAgIGlmICEgd2F0Y2hlcnMgOjogcmV0dXJuXG4gICAgICAgIGNvbnNvbGUubG9nIEAgYFNldHVwIGNoYW5nZWQ7IHNodXR0aW5nIGRvd24gd2F0Y2hlcnMgKFwiJHtwYXRofVwiKWBcbiAgICAgICAgY29uc3QgbF93YXRjaGVycyA9IHdhdGNoZXJzXG4gICAgICAgIHdhdGNoZXJzID0gbnVsbFxuICAgICAgICBmb3IgY29uc3QgZWFjaCBvZiBsX3dhdGNoZXJzIDo6XG4gICAgICAgICAgZWFjaC5jbG9zZSgpXG5cbiAgICAgICAgaWYgb25fcmVzdGFydCA6OiBvbl9yZXN0YXJ0KHBhdGgpXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gIGZ1bmN0aW9uIGJ1aWxkT25jZShidWlsZE9uY2UsIHdhdGNoX2dsb2IpIDo6XG4gICAgaWYgQXJyYXkuaXNBcnJheShidWlsZE9uY2UpIDo6XG4gICAgICBidWlsZE9uY2UgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgYnVpbGRPbmNlXG5cbiAgICBpZiAnZnVuY3Rpb24nICE9PSB0eXBlb2YgYnVpbGRPbmNlIDo6XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yIEAgYEV4cGVjdGVkIGJ1aWxkT25jZSB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgaWYgd2F0Y2hfZ2xvYiA6OiByZXN0YXJ0T24gQCB3YXRjaF9nbG9iXG5cbiAgICBidWlsZE9uY2UoKVxuICAgIHJldHVybiBzZWxmXG5cbiAgZnVuY3Rpb24gcmVidWlsZE9uKHJlYnVpbGQsIHdhdGNoX2dsb2IpIDo6XG4gICAgbGV0IGlucHJvZ3Jlc3MgPSBmYWxzZVxuICAgIGlmIEFycmF5LmlzQXJyYXkocmVidWlsZCkgOjpcbiAgICAgIHJlYnVpbGQgPSBidWlsZEFsbC5iaW5kIEAgbnVsbCwgcmVidWlsZFxuXG4gICAgaWYgJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYnVpbGQgOjpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IgQCBgRXhwZWN0ZWQgcmVidWlsZCB0byBiZSBhIGZ1bmN0aW9uIG9yIGFycmF5YFxuXG4gICAgLy8gaW52b2tlIGluaXRpYWwgYnVpbGRcbiAgICByZWJ1aWxkKClcblxuICAgIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgICAgLndhdGNoIEAgd2F0Y2hfZ2xvYiwgQHt9XG4gICAgICAgIGlnbm9yZUluaXRpYWw6IHRydWVcbiAgICAgICAgaWdub3JlUGVybWlzc2lvbkVycm9yczogdHJ1ZVxuXG4gICAgICAub24gQCAnY2hhbmdlJywgX2RlYm91bmNlXG5cbiAgICByZXR1cm4gc2VsZlxuXG4gICAgZnVuY3Rpb24gX2RlYm91bmNlKHBhdGgpIDo6XG4gICAgICAvLyBkZWJvdW5jZSByYXBpZCB1cGRhdGVzXG4gICAgICBpZiBmYWxzZSA9PT0gaW5wcm9ncmVzcyA6OlxuICAgICAgICBpbnByb2dyZXNzID0gdHJ1ZVxuICAgICAgICBzZXRUaW1lb3V0IEBcbiAgICAgICAgICAoKSA9PiA6OlxuICAgICAgICAgICAgaW5wcm9ncmVzcyA9IGZhbHNlXG4gICAgICAgICAgICByZWJ1aWxkKClcbiAgICAgICAgICA1MFxuICAgICAgICAudW5yZWYoKVxuICAgICAgcmV0dXJuIHNlbGZcblxuXG53YXRjaEFuZEJ1aWxkLmZvcmV2ZXIgPSBmdW5jdGlvbihjb21tYW5kPWBiYWJlbC1ub2RlIHJvbGx1cC5jZmcuanN5IC0td2F0Y2gtaW1wbGApIDo6XG4gIHdoaWxlIHRydWUgOjpcbiAgICBleGVjU3luYyBAIGNvbW1hbmQsIEB7fSBzdGRpbzogJ2luaGVyaXQnXG4gICAgY29uc29sZS5sb2cgQCBgXFxuXFxuUmVzdGFydGluZyByb2xsdXAgd2F0Y2hcXG5cXG5gXG5cbiJdLCJuYW1lcyI6WyJ3cml0ZUZpbGVfcCIsInByb21pc2lmeSIsIndyaXRlRmlsZSIsImpzeV9wbHVnaW4iLCJrd2FyZ3MiLCJqc3lfcHJlc2V0Iiwibm9fc3RhZ2VfMyIsIm1vZHVsZXMiLCJwcmVzZXRzIiwiY29uY2F0IiwiT2JqZWN0IiwiYXNzaWduIiwiZXhjbHVkZSIsImJhYmVscmMiLCJoaWdobGlnaHRDb2RlIiwicnBpX2JhYmVsIiwiYnVuZGxlIiwic291cmNlIiwib3B0IiwiZ2xvYmFsTW9kdWxlcyIsImV4dGVybmFscyIsInBsdWdpbnMiLCJmb3JtYXQiLCJhbWQiLCJUeXBlRXJyb3IiLCJjcmVhdGUiLCJzdWZmaXgiLCJwcm9kdWN0aW9uIiwib3V0ZGlyIiwicGF0aF9wYXJzZSIsIlNldCIsImlucHV0IiwibW9kdWxlIiwiaGFzIiwib3V0cHV0IiwibmFtZSIsInNvdXJjZW1hcCIsImJ1aWxkQ2xvc3VyZSIsImFzUm9sbHVwQnVpbGRDbG9zdXJlIiwiZm9ybWF0QnVpbGRFcnJvciIsImVyciIsImpvaW4iLCJsb2MiLCJmcmFtZSIsImNvZGVGcmFtZSIsImNvbG9ycyIsInRlc3QiLCJobCIsInYiLCJpbnNwZWN0IiwibGluZXMiLCJtc2ciLCJtZXNzYWdlIiwiaWQiLCJyZXBsYWNlIiwicHVzaCIsImZpbGUiLCJsaW5lIiwiY29sdW1uIiwiY29kZSIsImJ1aWxkQ3R4IiwiZXJyX291dGZpbGUiLCJub190aW1pbmciLCJidWlsZCIsImJ1aWxkV2l0aFRpbWluZyIsImNhY2hlIiwicm9sbHVwIiwid3JpdGUiLCJvbkJ1aWxkRXJyb3IiLCJsb2dfbXNnIiwiRGF0ZSIsIm5vdyIsInRvU3RyaW5nIiwibG9nIiwidGltZSIsInRpbWVFbmQiLCJlcnJfbXNnIiwiZXJyb3IiLCJidWlsZEFsbCIsImJ1aWxkTGlzdCIsIlByb21pc2UiLCJhbGwiLCJtYXAiLCJidWlsZGVyIiwid2F0Y2hBbmRCdWlsZCIsIm9uX3Jlc3RhcnQiLCJ3YXRjaGVycyIsInNlbGYiLCJyZWJ1aWxkT24iLCJidWlsZE9uY2UiLCJyZXN0YXJ0T24iLCJ3YXRjaF9nbG9iIiwiY2hva2lkYXIiLCJ3YXRjaCIsIm9uIiwicGF0aCIsImxfd2F0Y2hlcnMiLCJlYWNoIiwiY2xvc2UiLCJBcnJheSIsImlzQXJyYXkiLCJiaW5kIiwicmVidWlsZCIsImlucHJvZ3Jlc3MiLCJfZGVib3VuY2UiLCJ1bnJlZiIsImZvcmV2ZXIiLCJjb21tYW5kIiwic3RkaW8iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBUUEsTUFBTUEsY0FBY0MsVUFBVUMsU0FBVixDQUFwQjs7QUFFQSxBQUFPLFNBQVNDLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1FBQzNCQyxhQUFhLENBQUksVUFBSixFQUFnQixFQUFJQyxZQUFZLElBQWhCLEVBQXNCQyxTQUFTLEtBQS9CLEVBQWhCLENBQW5CO1FBQ01DLFVBQVUsQ0FBQ0gsVUFBRCxFQUFhSSxNQUFiLENBQXNCTCxPQUFPSSxPQUFQLElBQWtCLEVBQXhDLENBQWhCOztXQUVTRSxPQUFPQyxNQUFQLENBQ1AsRUFBSUMsU0FBUyxpQkFBYixFQUFnQ0MsU0FBUyxLQUF6QyxFQUFnREMsZUFBZSxJQUEvRCxFQURPLEVBRVBWLE1BRk8sRUFHUCxFQUFJSSxPQUFKLEVBSE8sQ0FBVDs7U0FLT08sVUFBVVgsTUFBVixDQUFQOzs7QUFHRixBQUFPLFNBQVNZLE1BQVQsQ0FBZ0IsRUFBQ0MsTUFBRCxFQUFTQyxHQUFULEVBQWNDLGFBQWQsRUFBNkJDLFNBQTdCLEVBQXdDQyxPQUF4QyxFQUFpREMsTUFBakQsRUFBeURDLEdBQXpELEVBQWhCLEVBQStFO01BQ2pGLGFBQWEsT0FBT04sTUFBdkIsRUFBZ0M7VUFBTyxJQUFJTyxTQUFKLENBQWlCLGtDQUFqQixDQUFOOztNQUM5QixRQUFRTixHQUFYLEVBQWlCO1VBQU8sSUFBSU0sU0FBSixDQUFpQix1Q0FB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
