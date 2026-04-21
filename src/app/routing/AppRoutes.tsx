import { FC, useEffect, lazy, Suspense } from 'react'
import { WithChildren } from '../../_metronic/helpers'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { PrivateRoutes } from './PrivateRoutes'
import { App } from '../App'
// import { AccessDenied } from '../modules/auth/components/AccessDenied'
import AccessDenied from '../modules/auth/components/AccessDenied'
import { isTokenExpired, checkIfTokenExpired, authTokenDedicated } from '../helpers/authenticationHelpers'
import { getTokenFromLocal, giveAccessDenied, getEmpId } from '../helpers/appHelpers'
// import useCheckInteraction from '../hooks/useCheckInteraction'
// import { initializeNotifications } from '../libs/notificationUtil'
import DedicatedLogin from '../modules/auth/components/DedicaatedLogin'
import DedicatedRegister from '../modules/auth/components/DedicatedRegister';
import BranchSelect from '../modules/auth/components/BranchSelect';
import SSOCallback from '../modules/auth/components/SSOCallback';


const { BASE_URL } = import.meta.env

const AppRoutes: FC = () => {

  // useCheckInteraction();
  const token = getTokenFromLocal();

  useEffect(() => {
  (async () => {
    if (window.location.pathname === "/sso") return;

    if (token && window.location.pathname === "/login") {
      window.location.href = "/main";
      return;
    }

    if (window.location.pathname === "/login" || window.location.pathname === "/select-branch" || window.location.pathname === "/sso") return;

    if (token) {
      // await initializeNotifications();
        
        if (window.location.pathname === "/") {
        if (isTokenExpired()) {
          console.log("1")
          giveAccessDenied();
        } else {
          window.location.href = "/main";
        }
      } else {

        checkIfTokenExpired();
      }
    } else {

        if (window.location.pathname !== "/login" && window.location.pathname !== "/select-branch" && window.location.pathname !== "/access-denied" && window.location.pathname !== "/sso") {
          window.location.href = "/login";
        }
    }
  })();
}, [token]);


  return (
    <BrowserRouter basename={BASE_URL}>
      <Routes>
        <Route element={<App />}>
          <Route path='sso' element={<SSOCallback />} />
          {
            token ?
              <>
                <Route path='/*' element={<PrivateRoutes />} />
                {/* <Route path='logout' element={<Logout />} /> */}
              </>
              :
              <>
                <Route path={'?tk=/*' + token} element={<></>} />
                <Route path='access-denied' element={<AccessDenied />} />
                <Route path='login' element={<DedicatedLogin />} />
                <Route path='select-branch' element={<BranchSelect />} />
                <Route path='register' element={<DedicatedRegister />} />
              </>
          }
        </Route>
      </Routes>
    </BrowserRouter>
  )
}


const SuspensedView: FC<WithChildren> = ({children}) => {
  return <Suspense fallback={<>loading...</>}>{children}</Suspense>;
}



export { AppRoutes }