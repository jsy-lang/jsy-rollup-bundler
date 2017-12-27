'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var util = require('util');
var fs = require('fs');
var path = require('path');
var chokidar = _interopDefault(require('chokidar'));

function asJSONServerSentEvents(res, subscriptionSet) {
  res.socket.setTimeout(0).setKeepAlive(true).setNoDelay(true);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive' });

  res.once('error', shutdown);
  res.once('close', shutdown);

  let write = res.write.bind(res);
  res = undefined;

  if (null != subscriptionSet) {
    subscriptionSet.add(sendJSONData);
  }

  write(`\n\n:sse ready\n\n`);
  return sendJSONData;

  function sendJSONData(obj) {
    if (undefined !== write) {
      write(`data: ${JSON.stringify(obj)}\n\n`);
      return true;
    }
  }

  function shutdown(...args) {
    write = undefined;
    if (null != subscriptionSet) {
      subscriptionSet.delete(sendJSONData);
    }
  }
}

const readFile$1 = util.promisify(fs.readFile);

const rx_data_live = /data-live-([a-z-]+)=(?:'([^']+)'|"([^"]+)")/g;
function replaceDataLive(webroot, data_live, source) {
  return source.replace(rx_data_live, (m, attr, val_a, val_b) => {
    const key = path.relative(webroot, path.join(webroot, val_a || val_b));
    return `${attr}='${data_live[key]}' data-live='${attr} ${key}'`;
  });
}

const renderDataLiveView = __express;
async function __express(filePath, locals, callback) {
  const { webroot, data_live } = locals.settings.data_live_info;
  try {
    const source = await readFile$1(filePath, 'utf-8');
    const res = await replaceDataLive(webroot, data_live, source);
    callback(null, res);
  } catch (err) {
    callback(err);
  }
}

function _initOptions(options) {
  if (!options) {
    options = {};
  }
  if (undefined === options.view) {
    options.view = true;
  }
  if (undefined === options.useProduction) {
    options.useProduction = 'production' == process.env.NODE_ENV;
  }
  return options;
}

function initExpressLiveLoader(app, webroot, options = {}) {
  options = _initOptions(options);
  const { useProduction } = options;

  const live_info = initLiveLoader(webroot, options);
  app.set('data_live_info', live_info);

  if (options.view) {
    if (true === options.view) {
      options.view = 'html';
      app.set('view engine', 'html');
    }

    app.engine(options.view, renderDataLiveView);
  }

  if (!useProduction) {
    app.get(options.endpoint || '/__live__', (req, res) => live_info.sendChange(asJSONServerSentEvents(res, live_info.subscriptions)));
  }

  return live_info;
}

function initLiveLoader(webroot, options) {
  options = _initOptions(options);
  const { useProduction } = options;

  const subscriptions = new Set();
  const production = {},
        development = {},
        dev_errors = new Map();

  const watchers = [];

  watchers.push(chokidar.watch(['*.lnk'], {
    cwd: webroot,
    usePolling: !!options.usePolling,
    interval: options.interval || 250 }).on('add', updateWatchedLnk).on('change', updateWatchedLnk));

  if (useProduction) {
    setTimeout(() => watchers.forEach(e => e.close()), 60000);
  } else {
    watchers.push(chokidar.watch(['*.err*'], {
      cwd: webroot,
      usePolling: !!options.usePolling,
      interval: options.interval || 250 }).on('add', updateWatchedErr).on('change', updateWatchedErr).on('unlink', updateWatchedErr));
  }

  const self = Object.create(null, {
    subscriptions: { value: subscriptions },
    sendChange: { value: live_sendChange },
    watchers: { value: watchers } });

  Object.assign(self, {
    webroot, production, development,
    data_live: useProduction ? production : development,
    useProduction });

  return self;

  function live_sendChange(lst) {
    if (null == lst) {
      lst = subscriptions.values();
    } else if ('function' === typeof lst) {
      lst = [lst];
    }

    for (const sendChange of lst) {
      sendChange({
        live: development,
        errors: Array.from(dev_errors.values()) });
    }
  }

  async function updateWatchedLnk(fname) {
    const filePath = path.join(webroot, fname);
    const key = path.relative(webroot, filePath.replace(/.lnk$/, ''));
    const tgt = path.join(path.dirname(key), (await readFile$1(filePath, 'utf-8')));

    const minified = fname.includes('.min.');
    if (minified) {
      production[key] = tgt;
      production[key.replace('.min.', '.')] = tgt;
    } else if (tgt != development[key]) {
      development[key] = tgt;
      live_sendChange();
    }
  }

  async function updateWatchedErr(fname) {
    const filePath = path.join(webroot, fname);
    const key = filePath.replace(/.err\w*$/, '');

    let err_msg;
    try {
      err_msg = await readFile$1(filePath, 'utf-8');
    } catch (err) {
      if ('ENOENT' !== err.code) {
        return console.error(err);
      }
      err_msg = '';
    }

    if (err_msg) {
      dev_errors.set(fname, err_msg);
    } else {
      dev_errors.delete(fname);
    }

    live_sendChange();
  }
}

exports.asJSONServerSentEvents = asJSONServerSentEvents;
exports.rx_data_live = rx_data_live;
exports.replaceDataLive = replaceDataLive;
exports.renderDataLiveView = renderDataLiveView;
exports.__express = __express;
exports.initExpressLiveLoader = initExpressLiveLoader;
exports.initLiveLoader = initLiveLoader;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGl2ZS1zZXJ2ZXIuanMiLCJzb3VyY2VzIjpbIi4uL2NvZGUvc2VydmVyU2VudEV2ZW50cy5qc3kiLCIuLi9jb2RlL2xpdmUtc2VydmVyLmpzeSJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhc0pTT05TZXJ2ZXJTZW50RXZlbnRzKHJlcywgc3Vic2NyaXB0aW9uU2V0KSA6OlxuICByZXMuc29ja2V0LnNldFRpbWVvdXQoMCkuc2V0S2VlcEFsaXZlKHRydWUpLnNldE5vRGVsYXkodHJ1ZSlcbiAgcmVzLndyaXRlSGVhZCBAIDIwMCwgQDpcbiAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvZXZlbnQtc3RyZWFtJ1xuICAgICdDYWNoZS1Db250cm9sJzogJ25vLWNhY2hlJ1xuICAgICdDb25uZWN0aW9uJzogJ2tlZXAtYWxpdmUnXG5cbiAgcmVzLm9uY2UgQCAnZXJyb3InLCBzaHV0ZG93blxuICByZXMub25jZSBAICdjbG9zZScsIHNodXRkb3duXG5cbiAgbGV0IHdyaXRlID0gcmVzLndyaXRlLmJpbmQocmVzKVxuICByZXMgPSB1bmRlZmluZWRcblxuICBpZiBudWxsICE9IHN1YnNjcmlwdGlvblNldCA6OlxuICAgIHN1YnNjcmlwdGlvblNldC5hZGQgQCBzZW5kSlNPTkRhdGFcblxuICB3cml0ZSBAIGBcXG5cXG46c3NlIHJlYWR5XFxuXFxuYFxuICByZXR1cm4gc2VuZEpTT05EYXRhXG5cbiAgZnVuY3Rpb24gc2VuZEpTT05EYXRhKG9iaikgOjpcbiAgICBpZiB1bmRlZmluZWQgIT09IHdyaXRlIDo6XG4gICAgICB3cml0ZSBAIGBkYXRhOiAke0pTT04uc3RyaW5naWZ5KG9iail9XFxuXFxuYFxuICAgICAgcmV0dXJuIHRydWVcblxuICBmdW5jdGlvbiBzaHV0ZG93biguLi5hcmdzKSA6OlxuICAgIHdyaXRlID0gdW5kZWZpbmVkXG4gICAgaWYgbnVsbCAhPSBzdWJzY3JpcHRpb25TZXQgOjpcbiAgICAgIHN1YnNjcmlwdGlvblNldC5kZWxldGUgQCBzZW5kSlNPTkRhdGFcblxuIiwiaW1wb3J0IHtwcm9taXNpZnl9IGZyb20gJ3V0aWwnXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBjaG9raWRhciBmcm9tICdjaG9raWRhcidcbmltcG9ydCBhc0pTT05TZXJ2ZXJTZW50RXZlbnRzIGZyb20gJy4vc2VydmVyU2VudEV2ZW50cy5qc3knXG5cbmNvbnN0IHJlYWRGaWxlID0gcHJvbWlzaWZ5IEAgZnMucmVhZEZpbGVcblxuZXhwb3J0IHthc0pTT05TZXJ2ZXJTZW50RXZlbnRzfVxuXG5leHBvcnQgY29uc3QgcnhfZGF0YV9saXZlID0gL2RhdGEtbGl2ZS0oW2Etei1dKyk9KD86JyhbXiddKyknfFwiKFteXCJdKylcIikvZ1xuZXhwb3J0IGZ1bmN0aW9uIHJlcGxhY2VEYXRhTGl2ZSh3ZWJyb290LCBkYXRhX2xpdmUsIHNvdXJjZSkgOjpcbiAgcmV0dXJuIHNvdXJjZS5yZXBsYWNlIEAgcnhfZGF0YV9saXZlLCAobSwgYXR0ciwgdmFsX2EsIHZhbF9iKSA9PiA6OlxuICAgIGNvbnN0IGtleSA9IHBhdGgucmVsYXRpdmUgQCB3ZWJyb290LFxuICAgICAgcGF0aC5qb2luIEAgd2Vicm9vdCwgdmFsX2EgfHwgdmFsX2JcbiAgICByZXR1cm4gYCR7YXR0cn09JyR7ZGF0YV9saXZlW2tleV19JyBkYXRhLWxpdmU9JyR7YXR0cn0gJHtrZXl9J2BcblxuXG5leHBvcnQgY29uc3QgcmVuZGVyRGF0YUxpdmVWaWV3ID0gX19leHByZXNzXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gX19leHByZXNzKGZpbGVQYXRoLCBsb2NhbHMsIGNhbGxiYWNrKSA6OlxuICBjb25zdCB7d2Vicm9vdCwgZGF0YV9saXZlfSA9IGxvY2Fscy5zZXR0aW5ncy5kYXRhX2xpdmVfaW5mb1xuICB0cnkgOjpcbiAgICBjb25zdCBzb3VyY2UgPSBhd2FpdCByZWFkRmlsZSBAIGZpbGVQYXRoLCAndXRmLTgnXG4gICAgY29uc3QgcmVzID0gYXdhaXQgcmVwbGFjZURhdGFMaXZlIEAgd2Vicm9vdCwgZGF0YV9saXZlLCBzb3VyY2VcbiAgICBjYWxsYmFjayhudWxsLCByZXMpXG4gIGNhdGNoIGVyciA6OlxuICAgIGNhbGxiYWNrKGVycilcblxuXG5cbmZ1bmN0aW9uIF9pbml0T3B0aW9ucyhvcHRpb25zKSA6OlxuICBpZiAhIG9wdGlvbnMgOjogb3B0aW9ucyA9IHt9XG4gIGlmIHVuZGVmaW5lZCA9PT0gb3B0aW9ucy52aWV3IDo6XG4gICAgb3B0aW9ucy52aWV3ID0gdHJ1ZVxuICBpZiB1bmRlZmluZWQgPT09IG9wdGlvbnMudXNlUHJvZHVjdGlvbiA6OlxuICAgIG9wdGlvbnMudXNlUHJvZHVjdGlvbiA9ICdwcm9kdWN0aW9uJyA9PSBwcm9jZXNzLmVudi5OT0RFX0VOVlxuICByZXR1cm4gb3B0aW9uc1xuXG5leHBvcnQgZnVuY3Rpb24gaW5pdEV4cHJlc3NMaXZlTG9hZGVyKGFwcCwgd2Vicm9vdCwgb3B0aW9ucz17fSkgOjpcbiAgb3B0aW9ucyA9IF9pbml0T3B0aW9ucyhvcHRpb25zKVxuICBjb25zdCB7dXNlUHJvZHVjdGlvbn0gPSBvcHRpb25zXG5cbiAgY29uc3QgbGl2ZV9pbmZvID0gaW5pdExpdmVMb2FkZXIod2Vicm9vdCwgb3B0aW9ucylcbiAgYXBwLnNldCBAICdkYXRhX2xpdmVfaW5mbycsIGxpdmVfaW5mb1xuXG4gIGlmIG9wdGlvbnMudmlldyA6OlxuICAgIGlmIHRydWUgPT09IG9wdGlvbnMudmlldyA6OlxuICAgICAgb3B0aW9ucy52aWV3ID0gJ2h0bWwnXG4gICAgICBhcHAuc2V0IEAgJ3ZpZXcgZW5naW5lJywgJ2h0bWwnXG5cbiAgICBhcHAuZW5naW5lIEAgb3B0aW9ucy52aWV3LCByZW5kZXJEYXRhTGl2ZVZpZXdcblxuICBpZiAhIHVzZVByb2R1Y3Rpb24gOjpcbiAgICBhcHAuZ2V0IEAgb3B0aW9ucy5lbmRwb2ludCB8fCAnL19fbGl2ZV9fJywgKHJlcSwgcmVzKSA9PlxuICAgICAgbGl2ZV9pbmZvLnNlbmRDaGFuZ2UgQCBcbiAgICAgICAgYXNKU09OU2VydmVyU2VudEV2ZW50cyhyZXMsIGxpdmVfaW5mby5zdWJzY3JpcHRpb25zKVxuXG4gIHJldHVybiBsaXZlX2luZm9cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRMaXZlTG9hZGVyKHdlYnJvb3QsIG9wdGlvbnMpIDo6XG4gIG9wdGlvbnMgPSBfaW5pdE9wdGlvbnMob3B0aW9ucylcbiAgY29uc3Qge3VzZVByb2R1Y3Rpb259ID0gb3B0aW9uc1xuXG4gIGNvbnN0IHN1YnNjcmlwdGlvbnMgPSBuZXcgU2V0KClcbiAgY29uc3QgcHJvZHVjdGlvbiA9IHt9LCBkZXZlbG9wbWVudCA9IHt9LCBkZXZfZXJyb3JzID0gbmV3IE1hcCgpXG5cbiAgY29uc3Qgd2F0Y2hlcnMgPSBbXVxuXG4gIHdhdGNoZXJzLnB1c2ggQCBjaG9raWRhclxuICAgIC53YXRjaCBAIFsnKi5sbmsnXSwgQHt9XG4gICAgICBjd2Q6IHdlYnJvb3RcbiAgICAgIHVzZVBvbGxpbmc6ICEhIG9wdGlvbnMudXNlUG9sbGluZ1xuICAgICAgaW50ZXJ2YWw6IG9wdGlvbnMuaW50ZXJ2YWwgfHwgMjUwXG4gICAgLm9uIEAgJ2FkZCcsIHVwZGF0ZVdhdGNoZWRMbmtcbiAgICAub24gQCAnY2hhbmdlJywgdXBkYXRlV2F0Y2hlZExua1xuXG4gIGlmIHVzZVByb2R1Y3Rpb24gOjpcbiAgICBzZXRUaW1lb3V0IEAgKCkgPT4gd2F0Y2hlcnMuZm9yRWFjaChlPT5lLmNsb3NlKCkpLCA2MDAwMFxuXG4gIGVsc2UgOjogXG4gICAgd2F0Y2hlcnMucHVzaCBAIGNob2tpZGFyXG4gICAgICAud2F0Y2ggQCBbJyouZXJyKiddLCBAe31cbiAgICAgICAgY3dkOiB3ZWJyb290XG4gICAgICAgIHVzZVBvbGxpbmc6ICEhIG9wdGlvbnMudXNlUG9sbGluZ1xuICAgICAgICBpbnRlcnZhbDogb3B0aW9ucy5pbnRlcnZhbCB8fCAyNTBcbiAgICAgIC5vbiBAICdhZGQnLCB1cGRhdGVXYXRjaGVkRXJyXG4gICAgICAub24gQCAnY2hhbmdlJywgdXBkYXRlV2F0Y2hlZEVyclxuICAgICAgLm9uIEAgJ3VubGluaycsIHVwZGF0ZVdhdGNoZWRFcnJcblxuICBjb25zdCBzZWxmID0gT2JqZWN0LmNyZWF0ZSBAIG51bGwsIEB7fVxuICAgIHN1YnNjcmlwdGlvbnM6IEB7fSB2YWx1ZTogc3Vic2NyaXB0aW9uc1xuICAgIHNlbmRDaGFuZ2U6IEB7fSB2YWx1ZTogbGl2ZV9zZW5kQ2hhbmdlXG4gICAgd2F0Y2hlcnM6IEB7fSB2YWx1ZTogd2F0Y2hlcnNcblxuICBPYmplY3QuYXNzaWduIEAgc2VsZiwgQHt9XG4gICAgd2Vicm9vdCwgcHJvZHVjdGlvbiwgZGV2ZWxvcG1lbnRcbiAgICBkYXRhX2xpdmU6IHVzZVByb2R1Y3Rpb24gPyBwcm9kdWN0aW9uIDogZGV2ZWxvcG1lbnRcbiAgICB1c2VQcm9kdWN0aW9uXG5cbiAgcmV0dXJuIHNlbGZcblxuICBmdW5jdGlvbiBsaXZlX3NlbmRDaGFuZ2UobHN0KSA6OlxuICAgIGlmIG51bGwgPT0gbHN0IDo6XG4gICAgICBsc3QgPSBzdWJzY3JpcHRpb25zLnZhbHVlcygpXG4gICAgZWxzZSBpZiAnZnVuY3Rpb24nID09PSB0eXBlb2YgbHN0IDo6XG4gICAgICBsc3QgPSBbbHN0XVxuXG4gICAgZm9yIGNvbnN0IHNlbmRDaGFuZ2Ugb2YgbHN0IDo6XG4gICAgICBzZW5kQ2hhbmdlIEA6XG4gICAgICAgIGxpdmU6IGRldmVsb3BtZW50XG4gICAgICAgIGVycm9yczogQXJyYXkuZnJvbSBAIGRldl9lcnJvcnMudmFsdWVzKClcblxuICBhc3luYyBmdW5jdGlvbiB1cGRhdGVXYXRjaGVkTG5rKGZuYW1lKSA6OlxuICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKHdlYnJvb3QsIGZuYW1lKVxuICAgIGNvbnN0IGtleSA9IHBhdGgucmVsYXRpdmUgQCB3ZWJyb290LCBmaWxlUGF0aC5yZXBsYWNlKC8ubG5rJC8sICcnKVxuICAgIGNvbnN0IHRndCA9IHBhdGguam9pbiBAIHBhdGguZGlybmFtZShrZXkpLCBhd2FpdCByZWFkRmlsZSBAIGZpbGVQYXRoLCAndXRmLTgnXG5cbiAgICBjb25zdCBtaW5pZmllZCA9IGZuYW1lLmluY2x1ZGVzKCcubWluLicpXG4gICAgaWYgbWluaWZpZWQgOjpcbiAgICAgIHByb2R1Y3Rpb25ba2V5XSA9IHRndFxuICAgICAgcHJvZHVjdGlvbltrZXkucmVwbGFjZSgnLm1pbi4nLCcuJyldID0gdGd0XG5cbiAgICBlbHNlIGlmIHRndCAhPSBkZXZlbG9wbWVudFtrZXldIDo6XG4gICAgICBkZXZlbG9wbWVudFtrZXldID0gdGd0XG4gICAgICBsaXZlX3NlbmRDaGFuZ2UoKVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVdhdGNoZWRFcnIoZm5hbWUpIDo6XG4gICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4od2Vicm9vdCwgZm5hbWUpXG4gICAgY29uc3Qga2V5ID0gZmlsZVBhdGgucmVwbGFjZSgvLmVyclxcdyokLywgJycpXG5cbiAgICBsZXQgZXJyX21zZ1xuICAgIHRyeSA6OlxuICAgICAgZXJyX21zZyA9IGF3YWl0IHJlYWRGaWxlIEAgZmlsZVBhdGgsICd1dGYtOCdcbiAgICBjYXRjaCBlcnIgOjpcbiAgICAgIGlmICdFTk9FTlQnICE9PSBlcnIuY29kZSA6OlxuICAgICAgICByZXR1cm4gY29uc29sZS5lcnJvciBAIGVyclxuICAgICAgZXJyX21zZyA9ICcnXG5cbiAgICBpZiBlcnJfbXNnIDo6XG4gICAgICBkZXZfZXJyb3JzLnNldCBAIGZuYW1lLCBlcnJfbXNnXG4gICAgZWxzZSA6OlxuICAgICAgZGV2X2Vycm9ycy5kZWxldGUgQCBmbmFtZVxuXG4gICAgbGl2ZV9zZW5kQ2hhbmdlKClcbiJdLCJuYW1lcyI6WyJhc0pTT05TZXJ2ZXJTZW50RXZlbnRzIiwicmVzIiwic3Vic2NyaXB0aW9uU2V0Iiwic29ja2V0Iiwic2V0VGltZW91dCIsInNldEtlZXBBbGl2ZSIsInNldE5vRGVsYXkiLCJ3cml0ZUhlYWQiLCJvbmNlIiwic2h1dGRvd24iLCJ3cml0ZSIsImJpbmQiLCJ1bmRlZmluZWQiLCJhZGQiLCJzZW5kSlNPTkRhdGEiLCJvYmoiLCJKU09OIiwic3RyaW5naWZ5IiwiYXJncyIsImRlbGV0ZSIsInJlYWRGaWxlIiwicHJvbWlzaWZ5IiwiZnMiLCJyeF9kYXRhX2xpdmUiLCJyZXBsYWNlRGF0YUxpdmUiLCJ3ZWJyb290IiwiZGF0YV9saXZlIiwic291cmNlIiwicmVwbGFjZSIsIm0iLCJhdHRyIiwidmFsX2EiLCJ2YWxfYiIsImtleSIsInBhdGgiLCJyZW5kZXJEYXRhTGl2ZVZpZXciLCJfX2V4cHJlc3MiLCJmaWxlUGF0aCIsImxvY2FscyIsImNhbGxiYWNrIiwic2V0dGluZ3MiLCJkYXRhX2xpdmVfaW5mbyIsImVyciIsIl9pbml0T3B0aW9ucyIsIm9wdGlvbnMiLCJ2aWV3IiwidXNlUHJvZHVjdGlvbiIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImluaXRFeHByZXNzTGl2ZUxvYWRlciIsImFwcCIsImxpdmVfaW5mbyIsImluaXRMaXZlTG9hZGVyIiwic2V0IiwiZW5naW5lIiwiZ2V0IiwiZW5kcG9pbnQiLCJyZXEiLCJzZW5kQ2hhbmdlIiwic3Vic2NyaXB0aW9ucyIsIlNldCIsInByb2R1Y3Rpb24iLCJkZXZlbG9wbWVudCIsImRldl9lcnJvcnMiLCJNYXAiLCJ3YXRjaGVycyIsInB1c2giLCJjaG9raWRhciIsIndhdGNoIiwidXNlUG9sbGluZyIsImludGVydmFsIiwib24iLCJ1cGRhdGVXYXRjaGVkTG5rIiwiZm9yRWFjaCIsImUiLCJjbG9zZSIsInVwZGF0ZVdhdGNoZWRFcnIiLCJzZWxmIiwiT2JqZWN0IiwiY3JlYXRlIiwidmFsdWUiLCJsaXZlX3NlbmRDaGFuZ2UiLCJhc3NpZ24iLCJsc3QiLCJ2YWx1ZXMiLCJBcnJheSIsImZyb20iLCJmbmFtZSIsInRndCIsIm1pbmlmaWVkIiwiaW5jbHVkZXMiLCJlcnJfbXNnIiwiY29kZSIsImNvbnNvbGUiLCJlcnJvciJdLCJtYXBwaW5ncyI6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
