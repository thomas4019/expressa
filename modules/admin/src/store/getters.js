const getters = {
  sidebar: state => state.app.sidebar,
  device: state => state.app.device,
  token: state => state.user.token,
  avatar: state => state.user.avatar,
  name: state => state.user.name,
  email: state => state.user.email,
  roles: state => state.user.roles,
  statusInfo: state => state.user.statusInfo
}
export default getters
