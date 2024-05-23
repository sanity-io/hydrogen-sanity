import {format, lint} from '../lintstaged.base.js'

export default {
  '*.{js,jsx,ts,tsx}': [format, lint],
  '!(*.{js,jsx,ts,tsx})': format,
}
