import rpi_babel from 'rollup-plugin-babel'
import pkg from './package.json'

const sourcemap = 'inline'
const external = ['chokidar', 'rollup', 'rollup-plugin-babel']
const plugins = [jsy_plugin()]

export default {
	input: 'code/index.jsy',
	output: [
		{file: pkg.module, format: 'es'},
		{file: pkg.main, format: 'cjs'}],
  sourcemap, external, plugins }


function jsy_plugin() {
  const jsy_preset = [ 'jsy/lean', { no_stage_3: true, modules: false } ]
  return rpi_babel({
    exclude: 'node_modules/**',
    presets: [ jsy_preset ],
    plugins: [],
    babelrc: false, highlightCode: false }) }

