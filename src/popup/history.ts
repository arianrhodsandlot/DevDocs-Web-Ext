import { createHashHistory } from 'history'

const history = createHashHistory()
history.listen(({ location }) => {
  localStorage.lastPopupPath = `${location.pathname}${location.search}${location.hash}`
})

export default history
