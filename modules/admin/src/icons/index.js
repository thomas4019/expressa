import Vue from 'vue'
import SvgIcon from '@/components/SvgIcon' // svg组件

// eslint-disable-next-line vue/component-definition-name-casing
Vue.component('svg-icon', SvgIcon)

const requireAll = requireContext => requireContext.keys().map(requireContext)
const req = require.context('./svg', false, /\.svg$/)
requireAll(req)
