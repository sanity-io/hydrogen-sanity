import {format, lint} from '../lint-staged.base.js'

export default {
  '*.{js,jsx,ts,tsx}': [format, lint],
  '!(*.{js,jsx,ts,tsx})': format,
}
