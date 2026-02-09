import { Outlet } from 'react-router-dom'
// import { I18nProvider } from '../_metronic/i18n/i18nProvider'
import { LayoutProvider } from '../_metronic/layout/core'
import { MasterInit } from '../_metronic/layout/MasterInit'
const App = () => {

  return (
    // <I18nProvider>
      <LayoutProvider>

          <Outlet />
          <MasterInit />
          
      </LayoutProvider>
    // </I18nProvider>
  )
}

export { App }
