import rpi_jsy from 'rollup-plugin-jsy-babel'
import pkg from './package.json'

const sourcemap = 'inline'
const external = ['fs', 'util', 'path', 'child_process', 'chokidar', 'rollup', 'rollup-plugin-babel']
const plugins = [rpi_jsy()]

export default [
  { input: 'code/index.jsy',
    output: [
      {file: pkg.module, format: 'es', sourcemap},
      {file: pkg.main, format: 'cjs', sourcemap}],
    external, plugins },

  { input: 'code/live-server.jsy',
    output: [
      {file: 'esm/live-server.js', format: 'es', sourcemap},
      {file: 'cjs/live-server.js', format: 'cjs', sourcemap}],
    external, plugins },

  { input: 'code/live-loader.jsy',
    output: [{file: 'esm/live-loader.js', format: 'es', sourcemap}],
    external: [], plugins },

  { input: 'code/react-live-loader.jsy',
    output: [{file: 'esm/react-live-loader.js', format: 'es', sourcemap}],
    external: ['react-error-overlay'], plugins },

].filter(e=>e)
