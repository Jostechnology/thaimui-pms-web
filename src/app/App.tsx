import { Outlet } from 'react-router-dom'
import { LayoutProvider } from '../_metronic/layout/core'
import { MasterInit } from '../_metronic/layout/MasterInit'
const App = () => {

  return (
      <LayoutProvider>
          <Outlet />
          <MasterInit />
      </LayoutProvider>
  )
}

export { App }
