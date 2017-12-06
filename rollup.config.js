import rpi_babel from 'rollup-plugin-babel'
import pkg from './package.json'

const sourcemap = 'inline'
const external = ['fs', 'util', 'path', 'child_process', 'chokidar', 'rollup', 'rollup-plugin-babel']
const plugins = [jsy_plugin()]

export default [
  { input: 'code/index.jsy',
    output: [
      {file: pkg.module, format: 'es'},
      {file: pkg.main, format: 'cjs'}],
    sourcemap, external, plugins },

  { input: 'code/live-server.jsy',
    output: [
      {file: './dist/live-server.mjs', format: 'es'},
      {file: './dist/live-server.js', format: 'cjs'}],
    sourcemap, external, plugins },

  { input: 'code/live-loader.jsy',
    output: [{file: 'dist/live-loader.mjs', format: 'es'}],
    sourcemap, external: [], plugins },

  { input: 'code/react-live-loader.jsy',
    output: [{file: 'dist/react-live-loader.mjs', format: 'es'}],
    sourcemap, external: ['react-error-overlay'], plugins },
]


function jsy_plugin() {
  const jsy_preset = [ 'jsy/lean', { no_stage_3: true, modules: false } ]
  return rpi_babel({
    exclude: 'node_modules/**',
    presets: [ jsy_preset ],
    plugins: [],
    babelrc: false }) }

